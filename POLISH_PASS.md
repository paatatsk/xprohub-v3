# XProHub — Polish Pass Parking Lot

> Good UX ideas and refinements captured during the build, to be
> addressed in a dedicated polish pass AFTER core functionality
> is complete (all of Milestone 2 done).
>
> Do not attempt these during feature building. They wait.

## UX Refinements

- **Budget sliders on Post a Job** — replace typed MIN/MAX inputs
  with dual-handle slider. Needs: max value cap (logarithmic?),
  tick marks, haptic feedback. Captured 2026-04-19.

- **Step 12 chat-screen review-state race** — `userHasReviewed` is read once on
  initial load; after submitting a review and navigating back, the state is stale
  and "LEAVE A REVIEW" stays visible. Tapping it triggers a duplicate INSERT that
  hits the `reviews` unique constraint and surfaces an error the user shouldn't see.
  **Fix:** Add `useFocusEffect` to `job-chat.tsx` to re-run the existing-review
  SELECT (filtered by `job_id` + `reviewer_id`) every time the screen regains focus.
  Short, isolated — hotfix-eligible between any major step. Captured 2026-04-30.

---

## Semantic Category Color System

**Captured:** 2026-04-25 (Paata's idea during week 2 build, locked Dark Gold era)

**Concept:** Accent colors applied to category tiles based on difficulty/risk tier. Color becomes *information*, not decoration — a glance tells users how serious a category is.

**Color Spectrum:**
- **Green / teal** → easy, low-stakes categories
  - Home Cleaning, Errands & Delivery, Pet Care (basics), Personal Assistance, Trash & Recycling
- **Amber / gold** → moderate skill
  - Moving & Labor, Tutoring & Education, Personal Training & Coaching, Gardening, Vehicle Care, Events
- **Orange / red** → skilled, regulated, or high-responsibility
  - Electrical, Plumbing, HVAC, Carpentry, IT/Tech, Child Care, Elder Care

**Design Rules:**
- Use color as **subtle accent only** — 3–4px left edge bar on tile, OR border on tier badge. Not tile background.
- **Dark Gold stays the hero color.** Semantic colors are supporting cast.
- Applies to category grid on Home screen, category filter strip on Live Market, and worker card belt/skill display.

**Data Source (no new schema needed):**
Derive tier from existing fields:
- `task_categories.tier` (1 = standard, 2 = skilled/premium)
- `task_categories.requires_background_check` (boolean)
- `task_library.difficulty` (easy / medium / skilled) — aggregate the category's tasks

**Implementation Sketch:**
1. Add a helper function `getCategoryAccent(tier, requiresBgCheck)` returning a hex color
2. Apply to the left edge of each category tile component
3. Accessibility check: make sure the accent is redundant (emoji + name still communicate everything), so colorblind users lose no info

**Why This Is a Design Upgrade, Not Decoration:**
Currently categories distinguish by emoji alone. Adding semantic color adds a second dimension: *how serious it is*. Reinforces the Belt System, difficulty tiers, and Level 2 Gate logic already in the schema. The color *is* the business logic made visual.

---

## Marketplace Health — Application Caps (Phase 2)

**Captured:** 2026-04-26 (Paata's idea during Step 6 planning)

**Problem:** Without caps, two failure modes emerge at scale:
- Customer posts a job → 20+ workers apply → customer paralyzed, ghosts the thread, trust in platform drops
- Workers blast every job without intent → spam behavior → customer feed becomes noise
- Winning worker is isolated; 19 others feel rejected, platform sentiment tanks

**Why not now:** With current test data (2 users, 2 jobs), caps are meaningless. We need real usage volume to calibrate numbers. Also requires belt + review data that doesn't exist yet.

**Four Approaches (combine as needed):**

### Approach A — Job Application Cap (top priority when implemented)
Cap applications per job at **5–7**.
- Once cap hit, job displays "FULL — Customer reviewing. Check back if not matched."
- Apply button disabled with clear messaging
- Job remains visible but un-applyable
- Mirrors real hiring — nobody reviews 47 applicants for a cleaning job

### Approach B — Worker Active Application Cap
Cap simultaneous active applications per worker at **3**.
- Worker must wait for decision or withdraw old application before applying to new jobs
- Prevents spam-apply behavior, forces intention, protects customers from low-effort bidders

### Approach C — Both Caps Together (recommended combination)
Implement A + B simultaneously. 5-application job cap + 3-application worker cap.

### Approach D — Belt-Tiered Worker Caps
Scale the Worker Active Application Cap by Belt Level:
- Newcomer / White Belt: 1 active application
- Yellow Belt: 2
- Orange+: 3
- Blue+: 4
- Black/Red: 5

Creates meaningful progression — earning belts unlocks real throughput.

**Implementation Notes (when ready):**
- New column on `jobs`: `application_count` (or count live from bids table)
- New RLS check on `bids.insert`: count existing bids for this job, reject if >= cap
- New RLS check on `bids.insert`: count worker's active (status='pending') bids, reject if >= their tier cap
- UI: Apply button shows `{n}/{cap} applied` as visual hint before hitting cap
- UI: if cap hit, show clear messaging with timing estimate

**Rollout Sequence:**
1. Launch without caps, collect data for 1-2 months
2. Analyze actual application-per-job distribution
3. Set cap at 90th percentile
4. Add worker cap with Belt tiering once Belt System is live
5. Monitor and adjust

**Related Considerations:**
- Withdraw flow — UI for worker to cancel an active bid
- Expiry — auto-expire unaccepted bids after N days to free slots
- Customer's "no thanks" button — clears a bid politely, frees the slot

---

## Worker Dignity — Notifications, Closure Language, "While You Wait"

**Captured:** 2026-04-26 (synthesized from Paata's conversation with Grok + review with Claude)

**Philosophy:** "Closure is a form of respect." Most gig platforms ghost workers — applications disappear into a void with no resolution. XProHub commits to the opposite: clear, fast, system-oriented closure paired with immediate next opportunities. Treat workers' time as a valuable resource, not an infinite commodity.

**Already living in the product (no work needed):**
- `accept_bid()` Postgres function auto-declines all other pending bids atomically — no worker hangs in pending limbo
- Smart templates reduce application investment so rejection has lower emotional cost
- Explicit decline button lets customers close out individual workers cleanly
- Bids carry status (pending/accepted/declined) with visual states

**Important UX principle: live the philosophy, don't market it.**
Don't add UI copy that says "We commit to Worker Dignity™" or "We never ghost." Naming a value to users feels like virtue-signaling. The good experience IS the message. Save "Worker Dignity" as internal language for documentation, team onboarding, and investor pitch — not for the app's UI copy.

### Implementation A — Worker Notifications System (LARGE, future milestone)

**Scope:** When customer accepts/declines a bid, write a row to the existing `notifications` table. Build a Notifications screen for workers showing recent activity. Optionally add badge counts on Home and push notifications.

**Why park:** Full milestone, not a polish item. Requires trigger functions on bid status change, new Notifications screen UI, badge counts, eventually push notifications.

**Build this when:** ready to invest in a notification milestone (Milestone 4+).

### Implementation B — "Released" / "Project Closed" copy (SMALL, depends on Worker Dashboard)

**Scope:** When workers view their own bid history, declined bids should display as "Released" or "Project Closed" — not "Declined." System-oriented language reframes rejection as the project's status, not the worker's failure. Customer's view stays "Declined" (technically accurate from their action).

**Why park:** Depends on the "My Applications" worker dashboard screen. The label change is small (~10 lines of conditional rendering) but needs the surface to render on first.

**Build this when:** My Applications screen exists (TASK 3 will create it — pair this with that build or do it as immediate follow-up).

### Implementation C — "While You Wait" cards on apply-success (MEDIUM, ready to build)

**Scope:** Add 2-3 task-matched job cards to the bottom of `apply-success.tsx`. Replaces dead-space below the "APPLICATION SENT" confirmation with momentum-preserving recommendations.

**Spec:**
- Section label: "WHILE YOU WAIT" (small caps, gold eyebrow)
- 2-3 vertically stacked JobCards (reuse component from market.tsx)
- Filter: same category as the job just applied to, status = 'open', excluding the job just applied to, excluding jobs the worker already bid on
- If no matches: hide section gracefully (no empty state)
- Existing CTA buttons stay below

**Build this when:** Next polish session, or whenever apply-success.tsx feels worth iterating on.

### What NOT to Build (rejected during review)

- **Pre-application banner** ("This project typically receives multiple strong applications") — risks discouraging working-class workers and triggering imposter syndrome.
- **"Worker Dignity" labeled UI copy** — virtue-signaling. Show, don't tell.
- **"You may or may not be selected" hedging on success screens** — undercuts the worker's win-moment of submitting.

---

## Trust & Safety

**Customer-side ID/photo requirement for post-job**
**Captured:** 2026-05-01 | **Area:** Trust & Safety — gate architecture | **Severity:** Real (worker dignity / mutual verification gap), not blocking MVP

Currently the post-job gate (Chunk C architecture) requires customers
to have Stripe set up only — no Business Card / ID requirement. The
worker side requires name + photo + ≥1 skill category + Stripe.

Mission tension: anonymous customers (with only a payment method) can
hire workers who must show full identity. Workers face physical risk
when entering customer homes, financial risk when customers can dispute
charges, and dignity risk when a fully-verified worker is matched with
an anonymous booking. Real-world marketplace pattern (TaskRabbit,
Thumbtack, Airbnb) shifts toward symmetric minimum verification.

**Proposed fix:** Customers need name + photo + Stripe to post a job.
No skills declaration (they're not offering skills) — just enough to
make the interaction feel between two real people, not anonymous
transactions.

**Why deferred:** This is real architectural work that would expand
Chunk C scope. The Stripe-only gate ships a working marketplace; the
photo requirement is trust-deepening that can layer in pre-launch as
a polish pass.

**Build this when:** Before public NYC test launch. Specifically: after
Chunk D (customer payment flow) lands, before any real users post real
jobs.

**Considerations during build:**
- Photo can be a logo or household icon (not strictly required to be
  a face shot) for users with privacy sensitivity
- Photo is shown to applying workers and the hired worker only — not
  on the public job listing
- Same gate-action-continuity pattern: complete photo upload → return
  to post-job form with their drafted content preserved

---

## Hybrid Matching Exploration — Milestone 4+ (with honest critique)

**Captured:** 2026-04-26 (synthesized from Paata's research conversation + review with Claude)

**The proposal:** A two-mode matching ecosystem combining instant-dispatch (fast match, standardized tasks) with selection-based bidding (Showcase, complex projects). Customer and worker each pick which mode they want.

**Status:** Mostly NOT for XProHub right now. Some real ideas underneath worth keeping. Treat as a Milestone 4+ exploration, not a polish item.

### What's Actually Worth Keeping

**Insight 1 — Standardized tasks could use instant-book UX.**
For predictable services (basic cleaning, dog walking, errands), customers don't need to review 5 applications. They need someone reliable, available now, at a fair fixed price. This is a real product space.

**Why park, don't build:** Instant dispatch requires real-time availability state, geolocation, queue ordering, push notifications, response SLAs, and standardized fixed pricing — basically Uber's entire dispatch infrastructure. Multi-month milestone, not a feature.

**Insight 2 — Market density should influence UX.**
On low-supply days, surface "pending jobs needing workers" prominently. On high-demand days, surface "open opportunities" prominently.

**Why park, don't build:** Requires real usage data to detect "low" vs "high" density. Not meaningful at current scale. Revisit when XProHub has 50+ active jobs/day.

### What NOT to Build (rejected during review)

**1. Mode-toggle UI for customers.** Forcing customers to pick a mode before picking a worker adds cognitive load. Customers want to describe what they need and have it solved. If we ever build instant-book, the platform should choose contextually, not ask the user.

**2. "Premium" tier access tied to ratings.** Locking new workers (immigrants, returning parents, formerly incarcerated) out of the platform's fastest-earning channel on day one is the trap most gig platforms fall into. "Earn your way to fairness" is not the same as fairness.

**3. Consultant-speak naming.** "Direct Dispatch," "Showcase," "Project Discovery Mode" — not how customers think. Use plain English: "Quick Hire" vs "Browse Workers" if ever built.

### What's Already Doing This Work

The Belt System already addresses the "newbie problem" — workers progress visibly through completed jobs (White → Yellow → Orange → ...). More egalitarian than gating queue access by rating.

The Apply flow already protects worker dignity through atomic auto-decline on bid acceptance.

Don't replace these with a new system. Deepen them.

### When to Revisit

Three concrete signals:
1. **Volume:** 50+ active jobs/day, 100+ active workers
2. **Customer feedback:** Repeated requests for "I just need someone NOW"
3. **Worker feedback:** Repeated requests for "I want instant work" with willingness to commit to SLAs

Without all three, instant-dispatch is solving an imagined problem.

---

## Operational Tracking

Not feature work — calendar-style reminders for infrastructure maintenance.
Park here so they don't get lost between sessions.

**SUPABASE_ACCESS_TOKEN security hygiene**
**Captured:** 2026-04-30 | **Area:** Security / Step 13 Chunk B-3 | **Severity:** Latent — depends on laptop physical security

The Personal Access Token used for `supabase` CLI auth is set as a Windows User
environment variable (`SUPABASE_ACCESS_TOKEN`) with NO expiration date. Trade-off:
no rotation hassle, but the token stays valid until manually revoked.

**Fix when needed:** If laptop is lost, stolen, sold, OR if any chat history
containing the token is ever leaked, immediately revoke from Supabase dashboard
(Account → Access Tokens → Delete the "xprohub-cli-local" token). Then generate
a replacement and update the `SUPABASE_ACCESS_TOKEN` env var.

**Check when:** On laptop change or suspected compromise. No scheduled rotation needed.

---

**@xmldom/xmldom high-severity vulnerability in Expo toolchain**
**Captured:** 2026-04-30 | **Area:** Operational / Security tracking | **Severity:** High (build-time only, not runtime)

`npm audit` reports a high-severity vulnerability in `@xmldom/xmldom <=0.8.12`,
transitively pulled in via Expo's `@expo/config-plugins` build toolchain. NOT
introduced by Stripe or any project code. NOT present in shipped app code — affects
build-time tooling only.

The "fix" suggested by `npm audit fix --force` would downgrade Expo to 49 and break
the entire project. Wait for upstream Expo patch.

**Fix:** Re-run `npm audit` after every Expo SDK upgrade. When the `@xmldom/xmldom`
finding clears, the vulnerability is resolved.

**Check when:** Each Expo SDK upgrade.

---

## Deployment & Dev Environment

Deployment prep and local dev config items. None block current development;
all relevant before first production build or local Supabase dev setup.

**iOS / Android bundle identifiers in app.json**
**Captured:** 2026-04-30 | **Area:** Deployment prep | **Severity:** Blocks App Store / Play Store submission

EAS dev build flow set the iOS bundle identifier to `com.paatatsk.xprohubv3` during
`eas build` setup. However, `app.json` may not have explicit `ios.bundleIdentifier`
and `android.package` fields. Auto-derivation works for EAS dev builds but stable
identifiers are required for production store submission.

**Fix:** Add explicit fields to `app.json`:
- `ios.bundleIdentifier`: `com.paatatsk.xprohubv3`
- `android.package`: `com.paatatsk.xprohubv3`

**Build this when:** Before first EAS production build for store submission. Also
useful before any Stripe production-mode testing.

---

**Redundant supabase/.temp/ entry in root .gitignore**
**Captured:** 2026-04-30 | **Area:** Tidiness | **Severity:** Cosmetic

After `supabase init` in B-3, `supabase/.gitignore` was auto-created and already
ignores `.temp`. The earlier entry in the root `.gitignore` (`supabase/.temp/`) is
therefore redundant. Both work, no conflict, but duplicate coverage.

**Fix:** Remove `supabase/.temp/` line from root `.gitignore`. Verify by running
`git status` after creating a file inside `supabase/.temp/` — should still be ignored.

**Build this when:** Anytime. Cosmetic cleanup, low priority.

---

**config.toml [db] major_version mismatch with remote**
**Captured:** 2026-04-30 | **Area:** Local dev compatibility | **Severity:** Latent — only triggers if local Supabase dev is ever set up

`supabase init` set `[db] major_version = 17` in `supabase/config.toml`. Remote
Supabase project may be on Postgres 15. Mismatch only affects local Supabase dev
(`supabase start` with Docker). Does NOT affect Edge Function deployment or any
remote operations.

**Fix:** Verify remote Postgres version (Supabase dashboard → Project Settings →
Database). Update `major_version` in `config.toml` to match.

**Build this when:** Only if local Supabase dev is ever set up. Ignore if always
working against remote.

---

**config.toml [db.seed] sql_paths points to non-existent file**
**Captured:** 2026-04-30 | **Area:** Local dev compatibility | **Severity:** Latent — only triggers on local `supabase db reset`

Default `[db.seed] sql_paths = ["./seed.sql"]` expects `supabase/seed.sql` to exist.
Actual seed file lives at `supabase/seed/XProHub_TaskLibrary_Seed_v1.1.sql`.

**Fix:** Update `sql_paths` in `config.toml`:
```toml
sql_paths = ["./seed/XProHub_TaskLibrary_Seed_v1.1.sql"]
```

**Build this when:** Only if local Supabase dev is ever set up.
