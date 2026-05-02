// supabase/functions/create-onboarding-link/index.ts
//
// Generates a Stripe Account Link for the authenticated user's Express
// account and returns the hosted onboarding URL.
//
// Call sequence: this function is the second server-side call in the
// Chunk C payment setup flow. It must be called AFTER create-stripe-
// account (C-2) has successfully created the Stripe Express account and
// written stripe_account_id to the user's profile. Calling this function
// without a stripe_account_id on the profile returns 400.
//
// Security model:
//   - verify_jwt = true in config.toml: Supabase rejects unauthenticated
//     requests before this code runs.
//   - User ID is extracted from the verified JWT via auth.getUser() — never
//     from the request body. Prevents account-takeover.
//   - stripe_account_id is read from the user's profile row via service
//     role, scoped to the verified user's ID — never from the request body.
//     Prevents generating onboarding links for another user's Stripe account.
//   - return_url and refresh_url are hardcoded constants, not caller-supplied.
//     Prevents redirect injection attacks.
//   - This function performs no DB write. Account Link URLs are not
//     persisted — they expire in ~5-10 minutes and are always generated
//     fresh on each call.
//   - serviceClient is initialized at module level (cold-start once, not per
//     request). Service role keys carry no per-user state, so this is safe
//     and more efficient than per-request init.

import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from '@supabase/supabase-js'
import { stripe } from '../_shared/stripe-client.ts'

// Stripe deep link URLs — hardcoded to prevent caller-supplied redirect
// injection. Mobile deep link schemes are fixed by app bundle identifier
// and do not vary between environments.
const RETURN_URL  = 'xprohub://stripe-return'
const REFRESH_URL = 'xprohub://stripe-refresh'

// Validate required env vars at module load time (fail-fast on misconfiguration).
// SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY are auto-injected
// by Supabase into all Edge Functions — no manual secrets set required.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    '[create-onboarding-link] Missing required Supabase env vars. ' +
    'SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY must all be present.'
  )
}

// Service role client — created once at module level, reused across requests.
// Used to read stripe_account_id from the user's profile row.
// Bypasses RLS. Every query is scoped to WHERE id = <verified user id>.
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async (req: Request): Promise<Response> => {

  // 1. Method guard — this function accepts POST only.
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 2. Extract Authorization header.
  //    With verify_jwt = true, Supabase blocks requests without a valid JWT
  //    before reaching this code. This check is a defensive fallback.
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('[create-onboarding-link] Missing or malformed Authorization header')
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 3. Resolve the authenticated user.
  //    User-context client passes the request's JWT to Supabase Auth.
  //    Created per-request (not at module level) because it depends on
  //    the Authorization header from this specific request.
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  })

  const { data: { user }, error: authError } = await userClient.auth.getUser()

  if (authError || !user) {
    console.error(
      '[create-onboarding-link] auth.getUser failed:',
      authError?.message ?? 'no user returned'
    )
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const userId = user.id

  // 4. Read stripe_account_id from the user's profile.
  //    C-3 must be called after C-2 has created and persisted the Stripe
  //    Express account. If stripe_account_id is null, C-2 has not completed
  //    successfully — return 400 so the caller can recover by re-running C-2.
  //    stripe_account_id is read from DB (not from the request body) so the
  //    caller cannot request a link for a different user's Stripe account.
  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    console.error(
      `[create-onboarding-link] No profile found for user ${userId}:`,
      profileError?.message
    )
    return new Response(
      JSON.stringify({ error: 'Profile not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!profile.stripe_account_id) {
    console.error(`[create-onboarding-link] No stripe_account_id on profile for user ${userId}`)
    return new Response(
      JSON.stringify({ error: 'Payment account not set up. Please complete account setup first.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 5. Generate a fresh Stripe Account Link.
  //    Account Links expire in ~5-10 minutes — always generate fresh, never
  //    cache. type 'account_onboarding' is for initial Express account setup.
  //    return_url fires when the user completes or exits the Stripe form.
  //    refresh_url fires if the link expires before the user finishes — Stripe
  //    sends the user there so the app can call C-3 again for a new link.
  let onboardingUrl: string

  try {
    const accountLink = await stripe.accountLinks.create({
      account: profile.stripe_account_id,
      return_url: RETURN_URL,
      refresh_url: REFRESH_URL,
      type: 'account_onboarding',
    })
    onboardingUrl = accountLink.url
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(
      `[create-onboarding-link] stripe.accountLinks.create failed for user ${userId}:`,
      message
    )
    return new Response(
      JSON.stringify({ error: 'Failed to generate onboarding link. Please try again.' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 6. Return the onboarding URL.
  //    The caller (stripe-connect.tsx, C-4) opens this with Linking.openURL().
  //    The screen updates to State 2 on deep link return (C-5), then to
  //    State 3 or 4 when the account.updated webhook fires (C-6).
  console.log(`[create-onboarding-link] Generated onboarding link for user ${userId}`)
  return new Response(
    JSON.stringify({ url: onboardingUrl }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
