# Chunk C — Worker Stripe Connect Onboarding (Design)

Status: Design proposed, awaiting Paata's decisions on Open
Questions before implementation.

Captured: 2026-05-01

---

# C-1 Design Proposal — Worker Stripe Connect Onboarding

---

## 1. Screen Location

**Recommendation: Primary entry on My Applications screen (banner) + moment-of-action gate on Apply screen + dedicated connect screen.**

Here is what I read in the existing app:

- `index.tsx` has two dashboard buttons: MY JOBS and MY APPLICATIONS. These are the worker's primary home-base touchpoints.
- `my-applications.tsx` is fully built — it's where a worker sees all their work activity.
- `profile.tsx` is a 23-line stub. `earnings.tsx` is a 23-line stub. Neither is a real screen yet.
- `become-worker.tsx` finishes with `router.replace('/(tabs)/market')` — workers land on Live Market, not on any payment setup.
- There is no settings screen in the tab layout.

**Why not options (b), (c), (d) alone:**

- Profile screen is a stub — putting the entry point there means workers have no natural path to discover it today.
- Settings screen doesn't exist — building a new settings screen just to house this one item is scope creep.
- Option (d) alone (gate only when applying) is the worst choice on the mission filter. Workers who applied and got accepted should NOT be surprised by "you can't get paid now." That's the exact ghosting dynamic XProHub exists to prevent — just applied to the worker instead of the customer.

**The mission filter answer:**

Payment setup should feel like something the worker WANTS to do, not something blocking them. The framing is: "You're ready to work — let's make sure you get paid." That tone belongs proactively in My Applications, not reactively in a gate. The gate should only exist as a safety net.

**Three-point placement:**

```
Point 1 — Persistent banner at top of My Applications
  Shows when stripe_charges_enabled is false.
  Disappears when fully verified.
  This is how the worker discovers it naturally.

Point 2 — Dedicated screen: app/(tabs)/stripe-connect.tsx
  Where both the banner and any gate CTA lead.
  Handles all four state renders and the CTA flow.

Point 3 — Moment-of-action gate inside apply.tsx
  When worker taps APPLY and stripe_charges_enabled is false,
  intercept with an inline card before the form loads.
  Safety net only — most workers should have set up payment
  already by the time they're applying.
```

One optional addition (question for Paata at the end): should `become-worker.tsx` route to `stripe-connect` instead of Live Market after finishing? That would make payment setup feel like a natural fourth step of becoming a worker, not something discovered later.

---

## 2. Screen States

The connect screen renders different content based on four fields read from the worker's profile row: `stripe_account_id` (existing column), `stripe_charges_enabled`, `stripe_payouts_enabled`, `stripe_onboarding_completed_at`.

---

### State 1 — Not Started

**Condition:** `stripe_account_id IS NULL`

This is the default for all workers who have completed become-worker but never tapped the payment setup flow.

```
Eyebrow:  GET PAID SETUP
Heading:  UNLOCK YOUR EARNINGS
Body:     Connect your bank account and you're ready to earn on
          any job on XProHub. It takes about 2 minutes. Stripe
          handles the secure verification — we never see your
          bank details.

CTA:      [ GET VERIFIED → ]    <- gold filled button, full width
```

What "GET VERIFIED" does is covered in Section 3.

---

### State 2 — In Progress

**Condition:** `stripe_account_id IS NOT NULL AND stripe_onboarding_completed_at IS NULL`

This covers two sub-cases: the worker started the Stripe form but exited before finishing, OR the worker finished the form and we're waiting for the `account.updated` webhook to confirm. We cannot distinguish these from DB state alone, so the message covers both.

```
Eyebrow:  VERIFICATION IN PROGRESS
Heading:  ALMOST DONE
Body:     Your account is being reviewed. This usually takes a
          few minutes. If you stepped away before finishing,
          tap below to pick up where you left off.

Status chip:  [ IN PROGRESS ]    <- outlined chip, gold border

CTA:      [ CONTINUE SETUP -> ]    <- outlined gold button, full width
          (smaller, less prominent than State 1 -- less urgency)

Sub-note: "Waiting for confirmation..." with a subtle pulse
          indicator if the worker just returned from Stripe.
          (Fades out after 10 seconds if webhook hasn't fired.)
```

What "CONTINUE SETUP" does: calls `create-onboarding-link` only (account already exists), opens the returned URL. No account creation step needed.

---

### State 3 — Charges Enabled, Payouts Pending

**Condition:** `stripe_charges_enabled = true AND stripe_payouts_enabled = false`

Stripe approved the account for charges but bank payout verification is still running. Workers can have their bids accepted and payment held in escrow at this point. They just can't receive payout yet.

```
Eyebrow:  ALMOST THERE
Heading:  VERIFIED — PAYOUTS PENDING
Body:     You're verified and ready to earn. Your bank account
          is being confirmed — payouts usually go live within
          1-2 business days. Nothing you need to do.

Status chip:  [ CHARGES ACTIVE ]    <- outlined chip, green border

No primary CTA.
Optional secondary:  "VIEW STRIPE DASHBOARD"  <- small text link
                     (deferred -- see Open Questions)
```

---

### State 4 — Fully Verified

**Condition:** `stripe_charges_enabled = true AND stripe_payouts_enabled = true`

```
Eyebrow:  PAYMENT ACCOUNT
Heading:  YOU'RE ALL SET
Body:     Your earnings will be deposited directly to your
          bank after each completed job. Minus XProHub's 10%
          platform fee.

Status chip:  [ VERIFIED ]    <- outlined chip, green border

No required CTA.
Optional:  "VIEW STRIPE DASHBOARD"  <- small text link
```

When the worker is in State 4, the banner on My Applications collapses entirely (or shows a tiny green "Payouts active" chip that is visually quiet — it confirms without demanding attention).

---

## 3. The CTA Flow

### Not Started — "GET VERIFIED"

```
1. Button enters loading state (gold ActivityIndicator, button disabled)
2. Call create-stripe-account Edge Function (C-2)
   -- Body: { user_id: worker's Supabase UID }
   -- Returns: { stripe_account_id }
3. On success: stripe_account_id is now saved to profiles row (C-2 does this)
4. Immediately call create-onboarding-link Edge Function (C-3)
   -- Body: { stripe_account_id, return_url: "xprohub://stripe-return",
              refresh_url: "xprohub://stripe-refresh" }
   -- Returns: { url }
5. Call Linking.openURL(url) -- opens Stripe's hosted form in device browser
6. App goes to background. Worker fills out Stripe form.
7. Worker completes form -> Stripe redirects to xprohub://stripe-return
8. Deep link handler (C-5) intercepts and brings app to foreground
9. Screen re-reads profile from Supabase, shows State 2
   ("Waiting for confirmation..." pulse indicator)
10. account.updated webhook fires (C-6) -> flips DB columns -> screen refreshes to State 3 or 4
```

### In Progress — "CONTINUE SETUP"

```
1. Button enters loading state
2. Call create-onboarding-link only (stripe_account_id already on profile)
3. Linking.openURL(url)
4. Same deep link return flow as above
```

The reason we regenerate the link (not cache the URL): Stripe Account Links expire after a few minutes. Always generate a fresh one on tap.

### Charges Enabled, Payouts Pending

No required CTA. State is informational only. If we add a Stripe Dashboard link later, the flow is: call a `create-stripe-dashboard-link` Edge Function then Linking.openURL(result). That is out of scope for Chunk C.

### Fully Verified

Same as above — informational only. No action required.

---

## 4. Error States

### Network error during create-stripe-account

What happens: the Edge Function request fails (no internet, Supabase cold start, Stripe API down).

```
Message:  "We couldn't connect right now. Check your connection
           and try again."

State:    Button returns to "GET VERIFIED" (not loading, not
          disabled). No state change to the profile -- nothing
          was written. Worker can retry immediately.

Tone:     The problem is the network, not the worker. Do not say
          "Something went wrong on our end" (blame-shifting) or
          "Error 503" (technical). Just a plain human sentence.
```

### Network error during create-onboarding-link

Same handling as above. If the Stripe account was created in step 2 but step 4 (onboarding link) fails, the screen will show State 2 on next load (account exists, onboarding not complete). The "CONTINUE SETUP" button in State 2 regenerates the link, so the worker can recover naturally.

### Stripe rejects the worker (country/eligibility issue)

This should be extremely rare for US-based workers in the NYC launch. Stripe Express fully supports US workers. But if `create-stripe-account` returns a Stripe error indicating eligibility:

```
Message:  "We need a moment to sort out your account. Please
           email support@xprohub.com and we'll get it handled
           quickly."

Tone:     The system needs human review, not the worker. Do NOT
          say "you were rejected" or "your account was declined."
          Say "we need to sort this out together."

State:    Return to State 1 CTA so they can contact support,
          but don't disable the button (they might try again
          after resolving via support).
```

### Worker exits Stripe browser without completing

The deep link `xprohub://stripe-return` fires when Stripe navigates to the return URL — this happens whether the worker completed the form or tapped "Back" / closed the browser mid-flow. We cannot distinguish these at the URL level.

Handling when the deep link fires and webhook has not yet confirmed:

```
State 2 shows ("VERIFICATION IN PROGRESS")
Body:    "Your account is being reviewed. This usually takes a
          few minutes. If you stepped away before finishing, tap
          below to pick up where you left off."
CTA:     "CONTINUE SETUP"
```

If the worker genuinely didn't finish, "CONTINUE SETUP" generates a fresh link and they complete the form. If they finished and the webhook just hasn't fired yet, they wait and the screen will update when it does. The message covers both cases honestly.

### Worker tries to apply before completing Stripe setup

Intercept in `apply.tsx` before the form loads:

```
[Gate card shown inline above the apply form]

Heading:  ONE MORE STEP
Body:     To apply for paid jobs, connect your payment account
          first. It takes about 2 minutes -- and then you're
          ready to earn on every job.

CTA:      [ SET UP PAYOUTS -> ]    <- routes to stripe-connect
Secondary: [ BACK TO JOBS ]        <- pops back to market

Tone:     Empowering, not punishing. The worker is close -- one
          step away from being fully ready. Do not say "you
          can't apply until..." -- say "here's what unlocks
          everything."
```

---

## 5. Visual Design

Everything stays in the locked Dark Gold system. No new patterns invented — components are assembled from what already exists in the codebase.

### Background and surfaces

- Screen background: `#0E0E0F`
- Content card (the main status card): `#171719`, `borderWidth: 1`, `borderColor: #2E2E33` — same as every other card in the app
- Gold-glow variant for State 1 (not started, needs attention): `borderColor: #C9A84C`, `backgroundColor: #C9A84C1A` — same treatment as `catTileActive` in become-worker.tsx

### Typography hierarchy

```
Eyebrow:  #C9A84C, 11px, fontWeight 700, letterSpacing 3
          -- matches become-worker's `eyebrow` style exactly
          e.g. "GET PAID SETUP"

Heading:  #C9A84C, 28px, fontWeight bold, letterSpacing 2
          -- matches become-worker's `heading` style
          e.g. "UNLOCK YOUR EARNINGS"
          -- Oswald font family if loaded, system bold fallback

Subhead:  #888890, 13px, lineHeight 19
          -- matches become-worker's `subhead` style
          1-2 sentences of plain English body

Body:     #888890, 14px, lineHeight 20
          -- same as emptySub in my-applications.tsx
```

Playfair Display is not appropriate here — that's the serif editorial font (used for taglines and inspirational text). This is transactional/functional UI. Oswald/bold is right.

### Status indicator — 3-step progress track

A horizontal row of three labeled dots, positioned between the heading and the body text. State coloring:

```
State 1 (not started):    o  o  o   (all empty, gold border)
State 2 (in progress):    *  o  o   (first filled gold)
State 3 (charges active): *  *  o   (two filled, third outline)
State 4 (fully verified): *  *  *   (all filled green)

Label below each dot (10px, textSecondary):
  "Account"    "Verified"    "Payouts"
```

This echoes the Belt System's progression philosophy — visible forward movement, not just a binary gate.

### Status chip / badge

Uses the `statusBadge` pattern from my-applications.tsx:

```
borderWidth: 1.5
borderRadius: 999 (pill)
paddingHorizontal: 9
paddingVertical: 3

State 1: hidden (no chip until something is in motion)
State 2: [ IN PROGRESS ]   gold border, gold text
State 3: [ CHARGES ACTIVE ] green border, green text
State 4: [ VERIFIED ]       green border, green text
```

### CTA buttons

Primary (State 1 — high urgency):

```
backgroundColor: #C9A84C
borderRadius: Radius.md
paddingVertical: 16
color: #0E0E0F (background on gold)
fontWeight: bold, fontSize: 15, letterSpacing: 1.5
-- exact match to `continueBtn` in become-worker.tsx
```

Secondary (State 2 — medium urgency):

```
borderWidth: 1.5
borderColor: #C9A84C
borderRadius: Radius.full
paddingVertical: 10
paddingHorizontal: 28
color: #C9A84C
-- exact match to `retryBtn` in my-applications.tsx
```

### My Applications banner (compact version)

When `stripe_charges_enabled` is false, a card appears at the top of the My Applications scroll list, above the first bid card:

```
backgroundColor: #171719
borderWidth: 1.5
borderColor: #C9A84C  (gold-glow -- draws attention without being alarming)
borderRadius: 12
padding: 16
gap: 8

Row 1: [ payment icon ] + "GET PAID SETUP" (eyebrow style)
Row 2: "Connect your payment account to start earning." (body, 13px, secondary)
Row 3: [ GET VERIFIED -> ] (small CTA, outlined gold pill, full width)
```

When `stripe_charges_enabled = true`: banner disappears from the list. Optionally replace with a one-line quiet chip: `[ Payouts active ]` in green, no border, right-aligned.

---

## Proposed File Location

```
app/(tabs)/stripe-connect.tsx
```

Register in `app/(tabs)/_layout.tsx`:

```
<Tabs.Screen
  name="stripe-connect"
  options={{ ...headerDefaults, headerShown: true, title: 'GET PAID', headerLeft: () => <BackButton /> }}
/>
```

Title "GET PAID" — short, mission-aligned, empowering. "PAYMENT SETUP" sounds bureaucratic. "GET PAID" says what the worker cares about.

---

## Flow Diagram

```
Home Screen (index.tsx)
  └─ [MY APPLICATIONS] ──────────────────────────────────┐
                                                          |
                                                          v
                                            My Applications Screen
                                            +─────────────────────────+
                                            | +─ Payment Banner ─────+ |
                                            | | GET PAID SETUP       | |  <- if stripe_charges_enabled=false
                                            | | "Connect to earn"    | |
                                            | | [GET VERIFIED ->]    | |
                                            | +─────────────────────+ |
                                            |   ... bid cards below   |
                                            +────────────┬────────────+
                                                         |
                                                         | tap banner CTA
                                                         v
                                              app/(tabs)/stripe-connect.tsx
                                              +─────────────────────────+
                                              | STATE 1 -- NOT STARTED  |
                                              | UNLOCK YOUR EARNINGS    |
                                              | o  o  o  progress dots  |
                                              | [GET VERIFIED ->]       |
                                              +────────────┬────────────+
                                                           |
                                                           | tap
                                                     +─────+─────+
                                                     |           |
                                                     v           v
                                             C-2: create-    network
                                             stripe-account   error
                                                     |           |
                                                     v           +─ show error
                                             C-3: create-          retry CTA
                                             onboarding-link
                                                     |
                                                     v
                                             Linking.openURL(stripeUrl)
                                             +───────────────────────+
                                             |  Stripe-hosted form   |
                                             |  (device browser)     |
                                             +───────────┬───────────+
                                                         |
                                                         | worker completes
                                                         | or exits
                                                         v
                                             xprohub://stripe-return
                                             (deep link -- C-5)
                                                         |
                                                         v
                                              stripe-connect.tsx
                                              +─────────────────────────+
                                              | STATE 2 -- IN PROGRESS  |
                                              | ALMOST DONE             |
                                              | *  o  o  progress dots  |
                                              | [CONTINUE SETUP ->]     |
                                              +─────────────────────────+
                                                         ^
                                                         |
                                                         | account.updated
                                                         | webhook (C-6) fires
                                                         | -> DB columns updated
                                                         |
                                                         v
                                              STATE 3 or 4 (screen auto-refreshes)
                                              +─────────────────────────+
                                              | STATE 4 -- FULLY DONE   |
                                              | YOU'RE ALL SET          |
                                              | *  *  *  (green)        |
                                              | [ VERIFIED ] chip       |
                                              | no CTA required         |
                                              +─────────────────────────+


Moment-of-action gate (apply.tsx):

  Worker taps APPLY on job card in market.tsx
          |
          v
  apply.tsx loads -- checks profile.stripe_charges_enabled
          |
    +─────+──────+
    |            |
    | false      | true
    v            v
  Gate card     Apply form loads normally
  +────────────────────────+
  | ONE MORE STEP          |
  | Connect payouts to     |
  | apply for paid jobs.   |
  | [SET UP PAYOUTS ->]    |  -> stripe-connect.tsx
  | [BACK TO JOBS]         |  -> market.tsx
  +────────────────────────+
```

---

## Open Questions for Paata

These are genuine architectural decisions, not details I missed. C-2 does not start until these are answered.

**Q1 — Does become-worker route to stripe-connect after finishing?**

Currently `become-worker.tsx` ends with `router.replace('/(tabs)/market')`. Changing that to `router.replace('/(tabs)/stripe-connect')` would make payment setup feel like Step 4 of becoming a worker — natural continuation, not something discovered later. This is a one-line change and would be the most dignified flow.

Recommendation: yes, do this.

**Q2 — Should the apply gate block or warn?**

Option A: Hard block — can't submit the apply form until stripe_charges_enabled is true. Clean enforcement.

Option B: Soft warning — show the gate card but let the worker continue applying if they dismiss it. The bid is submitted; we check stripe_charges_enabled again when the customer tries to accept the bid, and block acceptance if still unverified.

Option B is more graceful but requires a second gate at acceptance time. For MVP, recommendation is Option A (hard block at apply). Clean, simple, easy to test, and prevents the awkward state where bids are accepted but the worker can't receive payment.

**Q3 — Stripe Dashboard link in State 4 — is it Chunk C scope?**

Showing a "VIEW STRIPE DASHBOARD" link requires a separate API call to Stripe. This would mean a fourth Edge Function or an extra call inside `create-onboarding-link`.

Recommendation: defer to a polish pass. State 4 is "you're done, go earn" — workers don't need dashboard access for MVP.

**Q4 — Screen title in the header: confirm "GET PAID"?**

Current options: GET PAID / PAYMENT SETUP / PAYOUTS / CONNECT PAYMENTS.

Recommendation: "GET PAID" — most mission-aligned, most empowering, shortest.
