# XProHub — Project Status

**As of:** 2026-05-03
**Founder:** Paata Tskhadiashvili (paatatsk on GitHub), non-technical solo founder, NYC
**Mission:** Real Work. Fair Pay. For Everyone. — A hub for X (various) professionals.

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
  - ⏳ **C-4a implementation — NEXT after doc reconciliation**
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

1. **CLAUDE.md six-change update** approved 2026-05-01, never executed (session ended). Covers dual-role wording, new Platform Architecture section, Progressive Profile System update, Trust Levels table replacement, gate triggers rename, Code Rules 13/14.
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
