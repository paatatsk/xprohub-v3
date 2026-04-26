# XProHub — Session Plan v2

**Last updated:** 2026-04-26 (post Step 8 completion)

This document tracks the build sequence for XProHub. It supersedes any earlier
session plan documents.

---

## North Star

**Tagline:** Real Work. Fair Pay. For Everyone.

**Mission:** Economic empowerment and dignified income for working-class workers
through a marketplace that treats their time as a valuable resource.

**MVP Definition:** A two-sided marketplace where customers can post jobs, workers
can apply, customers can accept and chat with matched workers, and money can flow
through escrow safely. **All locked product architecture decisions in
SESSION_HANDOUT.md must be respected.**

---

## Milestones

### ✅ Milestone 0 — Foundation Reset (Apr 17-19)
Cleared legacy schema, established `xprohub-v3`, locked CLAUDE.md preferences,
deployed Welcome screen, smart auth routing.

### ✅ Milestone 1 — Foundation & Auth (Apr 19-21)
Profile setup, photo upload, smart auth routing in `_layout.tsx`, Trust System
locked into CLAUDE.md, 18 task categories with emoji icons in Supabase.

### ✅ Milestone 2 — The Live Loop (Apr 21-25)
12 steps complete:
- Phase 0 — Housekeeping
- Steps 1-2 — Home routing + Back navigation
- Steps 3A/3B/3C — Live Market two-feed toggle, Jobs Feed wired, category filter
- Steps 4A/4B/4C/4-FIX — Post a Job scaffold, Submit wired, Level 2 Gate,
  category-first picker
- Steps 5/5B — Workers Feed, Become a Worker onboarding
- Step 6 — Apply flow with Job Detail + smart templates + price gates
- Step 7 v1+v2 — Direct Hire (full form parity with Post a Job)

### 🟡 Milestone 3 — Transactions (in progress)
- ✅ Step 8 — Bid Acceptance (Postgres functions + My Jobs + Job Bids screens +
  navigation wiring) — **shipped 2026-04-26**
- 🔲 Step 9 — Worker dashboard ("My Applications") ← **NEXT**
- 🔲 Step 10 — Real Chat UI (Supabase Realtime, message bubbles, typing indicators)
- 🔲 Step 11 — Job lifecycle progression (matched → in_progress → completed)
- 🔲 Step 12 — Review flow (post-completion ratings)
- 🔲 Step 13 — Payment flow (Stripe Connect escrow + 10% platform fee)

### 🔲 Milestone 4 — Trust & Reputation (deferred)
- Belt System UI (currently data-only)
- Notification system (Worker Dignity Implementation A)
- Background check integration (Level 2B verification)

### 🔲 Milestone 5 — Polish Pass (deferred)
All 6+ items in POLISH_PASS.md. Run when Milestone 3 completes.

### 🔲 Milestone 6+ — Hybrid Matching, Squad Jobs (long-term)
Only revisit when volume signals justify (50+ jobs/day, 100+ workers).

---

## Active Build Order — Milestone 3 Remaining

**Step 9 — My Applications (worker dashboard)** ← NEXT
- Symmetric to "My Jobs" (customer side)
- Lists worker's bid history grouped by status
- Filter by: pending / accepted / declined / withdrawn
- Each row: job title + customer name + proposed price + status badge + timeAgo
- Tap → navigate to job-detail (or job-chat if accepted)
- No new schema needed — reads existing `bids` table filtered by `worker_id`
- Wires Worker Dignity Implementation B ("Released" / "Project Closed" copy)
  naturally — pair with this build

**Step 10 — Real Chat UI**
- Replace placeholder `job-chat.tsx` with Realtime-powered message thread
- Message bubbles, sender alignment, timestamp grouping
- Supabase Realtime subscription on `messages` table filtered by chat_id
- Send button + text input, optimistic UI
- Considerable scope — likely 2-3 sessions with chunked review

**Step 11 — Job Lifecycle Progression**
- Customer marks job "in progress" when work begins
- Either party marks job "completed" when done
- Add `started_at` and `completed_at` timestamps to `jobs` table
- New CTAs on job-chat: "Mark In Progress" / "Mark Complete"

**Step 12 — Review Flow**
- After job marked completed, both parties rate each other
- 1-5 stars + optional written review
- Updates `profiles.rating_avg` via aggregation
- Reviews visible on worker profile / customer profile

**Step 13 — Payment Flow**
- Stripe Connect onboarding for workers (already structured for it)
- Customer pays at acceptance (escrow held)
- Worker receives payment minus 10% platform fee at completion
- Dispute handling: deferred to post-MVP

---

## Build Discipline (carried over from CLAUDE.md)

- One step at a time
- Investigation → proposal → 2-3 part chunked review → approve → save → commit → test
- All schema changes via migration files in `supabase/migrations/`
- All migrations include verification queries
- iPhone testing with multiple real accounts after every step
- Polish items NEVER block step progression — they go in POLISH_PASS.md

---

## What This Plan Does NOT Cover

By explicit choice:
- Worker availability calendar — too early, no signal
- Geolocation matching — Milestone 4+ at earliest
- Squad/Team jobs — Milestone 6+ (deferred from earlier docs)
- Hybrid Matching ecosystem — see POLISH_PASS.md for critique
- Dispute resolution / customer service tools — post-MVP
- Push notifications — Milestone 4+

These are real ideas with real merit. They are NOT next.
