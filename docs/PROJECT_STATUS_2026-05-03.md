# XProHub — Project Status

**As of:** 2026-05-03
**Founder:** Paata Tskhadiashvili (paatatsk on GitHub), non-technical solo founder, NYC
**Mission:** Real Work. Fair Pay. For Everyone. — A hub for X (various) professionals.

---

## Active Task Blueprint

**Working principle:** Define a task with clear scope. Complete it fully —
including loose ends, deploys, and tests — before starting the next. No
parking findings to "deal with later." Intermediate commits within a task are
checkpoints, not parked work.

### CURRENT TASK: C-4a IMPLEMENTATION — Stripe Connect onboarding feature

**Definition of done — all 13 items must complete before next task begins:**

1. ✅ Stage 1 — `hooks/useStripeStatus.ts` (saved, tsc clean)
2. → Commit checkpoint: Stage 1 + this status doc update
3. ⏳ Stage 2 — `app/(tabs)/stripe-connect.tsx` (the screen)
4. → Commit checkpoint
5. ⏳ Stage 3 — `app/stripe-return.tsx` + `app/stripe-refresh.tsx` redirects
6. → Commit checkpoint
7. ⏳ Stage 4 — `app/(tabs)/_layout.tsx` + `app/_layout.tsx` edits
8. → Commit checkpoint + tsc baseline comparison (see
   `docs/TSC_BASELINE_2026-05-03.txt` — expect 24 errors, no new ones)
9. ⏳ Deploy `create-stripe-account` + `create-onboarding-link` Edge Functions
   to remote Supabase
10. ⏳ Apply migration `20260503000001_accept_bid_set_agreed_price.sql`
    (committed in `1ea262d`) to remote Supabase
11. ⏳ iPhone smoke test — verify all 4 screen states render correctly
12. → Final commit if any test reveals fixes
13. ⏳ Update this Active Task Blueprint marking C-4a complete and defining
    the next task

### NEXT TASKS (ordered, locked — do not start any until C-4a is fully done):

**Task 1 — Doc reconciliation cleanup batch.** Eleven pending findings from
the 2026-05-03 reconciliation pass — deprecate `NEW_CHAT_PROMPT.md`, refresh
`SESSION_HANDOUT.md` build state section, plus 9 cosmetic findings.
Definition of done: all 11 closed, single coordinated commit, this blueprint
updated.

**Task 2 — Fix pre-existing tsc errors.** All 24 errors resolved (fixes
applied, awaiting commit). Approach: excluded `supabase/functions/**`
from app tsconfig (16 Deno errors), fixed 6 mechanical `as any`/`as
unknown as` casts in app code (plus 2 adjacent matching-pattern lines
for consistency), replaced broken `gestureEnabled` with proper
`BackHandler` interception on apply-success screen, widened
`segments.length === 0` check to satisfy Expo Router tuple typing.

**Task 3 — Set up Deno tooling for Edge Functions.** When ready: install
Deno CLI, create `supabase/functions/deno.json` with compiler config and
ESM import map matching Supabase's standard pattern, run `deno check`
to verify it works, integrate into deploy workflow when CI is built.
Until then, Edge Functions are excluded from app tsc and rely on
Supabase's runtime checks at deploy time.

---

## What's Built and Working

### Foundation (Milestones 1–2)
Splash → welcome → signup → login → profile setup → home → Live Market (Jobs + Workers feeds) → Post a Job → Apply → My Applications → Earnings (stub) → Profile (stub).

### Step 13 — Payments (in progress)
- ✅ **Chunk A** — Database migration. Five Stripe columns on `profiles`: `stripe_account_id`, `stripe_charges_enabled`, `stripe_payouts_enabled`, `stripe_onboarding_completed_at`, `stripe_customer_id`. **Verified present in Supabase 2026-05-02.**
- ✅ **Chunk B** — Infrastructure. Stripe RN SDK, Edge Function scaffold, shared `stripe-client.ts`, webhook handler with HMAC verification, setup runbook. **B-8 manual setup not yet executed.**
- 🟡 **Chunk C** — Worker Stripe Connect onboarding:
  - ✅ C-1 design (dual-role, Q1–Q4 resolved)
  - ✅ C-2 `create-stripe-account` Edge Function (commit `865278b`)
  - ✅ C-3 `create-onboarding-link` Edge Function (commit `2cddce8`)
  - ✅ C-4a design doc, 909 lines (commit `76ce55e`)
  - 🟡 **C-4a implementation — in progress, staged build:**
    (See Active Task Blueprint above for stage-by-stage definition of done)
  - ⏳ C-4b apply.tsx Stripe gate replacement
  - ⏳ C-5 deep link return integration
  - ⏳ C-6 `account.updated` webhook handler implementation
  - ⏳ C-7 end-to-end test
- ⏳ Chunks D, E, F (customer payment, payouts, UI polish)

---

## Locked Architectural Decisions (do not re-debate)

1. **Dual-role from day one.** Every user is both customer and worker. No fork at signup.
2. **Gate philosophy.** Gates fire at moment of action only. No persistent banners or nags.
3. **Gate triggers.** Apply (worker) requires photo + ≥1 skill + Stripe Express. Post (customer) requires Stripe payment method. Browse, message, build ID — all free.
4. **Hire = Charge moment.** Funds escrowed before work begins. Worker Dignity, non-negotiable.
5. **ID = Business Card.** `become-worker.tsx` → `id.tsx` rename pending. Lives within Profile tab. Five tabs unchanged.
6. **Mission framing.** XProHub = hub for X (various) professionals.
7. **Levels framing.** Levels 1/2/3 are user lifecycle narrative, NOT gate enforcement. Code stays parallel-gates-on-action.
8. **Direct Hire pathway** parked as future feature (POLISH_PASS).

---

## Working Pattern — "Meticulous Mode"

Two-AI workflow: chat-Claude (strategist) writes prompts FOR Claude Code (terminal executor). Paata is founder, runs git, tests on iPhone, gives "approved" before any save or commit.

**Core protocol:**
- Investigate before propose
- Propose before save (show OLD/NEW verbatim)
- Verify uniqueness with `grep -n` before any `str_replace`
- Show actual file content, not summaries (display artifacts have fooled us)
- Pause between prerequisites — don't chain work
- One step at a time, explicit "approved" before save or commit
- Bare git commands, never `cd && git ...`, never compound with `&&`
- Investigation phase first, propose, approve, save, verify, commit

---

## Doc Reconciliation Pass (Current Phase)

22 discrepancies found 2026-05-03 between docs and codebase. Status:

**Fixed (2 of 22):**
- Finding #2 — Font system (Space Grotesk per Blueprint) → commit `7fd0820`
- Finding #11 — `accept_bid()` populates `agreed_price` → commit `1ea262d` (migration not yet pushed to remote)

**In flight:**
- Phase 1 project rename (deep link scheme `xprohub://`) → commit `3b96a86`
- Phase 3 partial — GitHub repo `xprohub-v3` → `xprohub` → commit `b1631ee`
- Supabase project display renamed "Production"

**Pending (20 of 22):**
- Findings #1, #3–10, #12, #16–17 — CLAUDE.md doc reconciliation (single coordinated rewrite)
- Findings #13–15 — SESSION_HANDOUT.md, NEW_CHAT_PROMPT.md, POLISH_PASS small updates
- Findings #18–22 — cosmetic batch

---

## Decisions Made in Chat But Never Documented

These need to land in CLAUDE.md or POLISH_PASS:

1. **CLAUDE.md six-change update** approved 2026-05-01, never executed (session ended). Covers dual-role wording, new Platform Architecture section, Progressive Profile System update, Trust Levels table replacement, gate triggers rename, Code Rules (Dual-role, Gate philosophy).
2. **Direct Hire pathway** — drafted POLISH_PASS entry never saved.
3. **Levels framing as user lifecycle narrative** — never written down.
4. **Belt System is opt-in** (not structural matching). Currently described as if structural in CLAUDE.md.
5. **10% platform fee is not actually locked** — assumed into CLAUDE.md, never explicitly decided.
6. **SESSION_HANDOUT.md update** flagged for update before C-2, never executed.

---

## Pending Deploys (Not Yet Executed)

- Apply migration `20260503000001_accept_bid_set_agreed_price.sql` to remote Supabase
- Deploy `create-stripe-account` Edge Function
- Deploy `create-onboarding-link` Edge Function
- Register Stripe webhook endpoint in Stripe dashboard
- Set Stripe secrets in Supabase (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)

---

## Stripe Sandbox Situation (Parked)

User has TWO sandbox accounts: `XRroHub` (typo, original — `acct_1TRNSi0Iw0nTUvYW`, all dev work wired here) and `XProHub` (correct spelling, empty duplicate — `acct_1TSoj1DlB111ylOV`). The empty one couldn't be deleted. Decision: park it. Sandbox naming has zero customer impact. Live production Stripe is what matters for NYC launch.

---

## Critical File Locations

- Repo: `https://github.com/paatatsk/xprohub.git` (renamed from `xprohub-v3`)
- Local: `C:\Users\sophi\Documents\xprohub-v3` (folder rename pending — Phase 3)
- Supabase project ref: `ygnpjmldabewzogyrjbb` (display name: "Production")
- Latest commit: `1ea262d`

---

## Next Concrete Step

Finish doc reconciliation pass (the 20 remaining findings). Then C-4a implementation against `docs/CHUNK_C_C4_DESIGN.md`.
