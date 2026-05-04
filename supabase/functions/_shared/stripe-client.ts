// supabase/functions/_shared/stripe-client.ts
//
// Shared Stripe initializer. Imported by every Edge Function that
// calls the Stripe API.
//
// Validates STRIPE_SECRET_KEY at import time — throws immediately
// if absent or empty. STRIPE_WEBHOOK_SECRET is NOT validated here;
// stripe-webhook/index.ts owns that check (see B-6).

import Stripe from 'https://esm.sh/stripe@14?target=denonext'

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

if (!stripeSecretKey) {
  throw new Error(
    '[stripe-client] STRIPE_SECRET_KEY is not set or is empty. ' +
    'Run: supabase secrets set STRIPE_SECRET_KEY=sk_test_...'
  )
}

export const stripe: Stripe = new Stripe(stripeSecretKey)

export const cryptoProvider: Stripe.CryptoProvider =
  Stripe.createSubtleCryptoProvider()
