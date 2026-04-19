# XProHub — CLAUDE.md
> Single source of truth. Read this at the start of every session.

## Who I Am
**Paata** — non-technical founder, zero prior coding experience. Building with Claude AI session by session since March 2026. GitHub: `paatatskhadia`. My job is vision + product decisions; Claude writes the code.

## Project Overview
**XProHub** — two-sided gig economy marketplace. Workers earn. Customers get things done.
- Mission: Economic empowerment for everyday people regardless of background
- Tagline: **"Real Work. Fair Pay. For Everyone."**
- Model: eBay buyer/seller dual-role (users freely switch Customer ↔ Worker)
- Repo: `github.com/paatatsk/xprohub-v3` | Local: `C:\Users\sophi\Documents\xprohub-v3`
- Start: `npx expo start --clear` | Test: iPhone via Expo Go

## Tech Stack
| Layer | Choice |
|---|---|
| Framework | React Native + Expo Router + TypeScript (SDK 54) |
| Backend | Supabase — PostgreSQL, Auth, Realtime, Storage, PostGIS |
| Payments | Stripe Connect (escrow model, 10% platform fee) |
| Push | Expo Push Notifications |
| Est. cost | $0/month until real traction |

## Design System — Dark Gold (Locked)
The only design direction. No other aesthetic is in use.

| Token | Value | Use |
|---|---|---|
| Background | `#0E0E0F` | All screens — never changes |
| Gold Accent | `#C9A84C` | CTAs, highlights, big numbers, borders |
| Dark Card | `#171719` | All cards and surfaces |
| Border | `#2E2E33` | Card borders, dividers |
| Text Primary | `#FFFFFF` | All headings and body text |
| Text Secondary | `#888890` | Supporting text, metadata |
| Green | `#4CAF7A` | Success, completions, Worker mode |
| Blue | `#4A9EDB` | Trust, verification, info |
| Purple | `#9B6EE8` | XP, growth, Royal theme |
| Red | `#E05252` | Urgent, live, alerts, cancel |

- **Headline font**: Oswald
- **Serif accent font**: Playfair Display
- **Body font**: Inter
- **Big numbers**: always gold — the loudest element on every screen
- **Cards**: glassmorphism — frosted glass effect, gold border glow, photo/illustration fills top 50%, gradient fade into dark info panel below
- **Icons**: Gold Forge custom duotone system — dark base + gold accent highlight, one gold light-source catch per icon. Do NOT use standard Ionicons or Material icons.

**5 feed card themes** (user-selectable): Broadsheet · Western · Gold Press · Dispatch · Chronicle

## 15 Production Screens (build order)
| # | Screen | File | Status |
|---|---|---|---|
| 1 | Splash | `app/splash.tsx` | Built |
| 2 | Welcome | `app/(onboarding)/welcome.tsx` | Built |
| 3 | Sign Up | `app/(auth)/signup.tsx` | **Wired to Supabase Auth** |
| 4 | Login | `app/(auth)/login.tsx` | Built |
| 5 | Profile Setup | `app/(onboarding)/profile-setup.tsx` | Built |
| 6 | Home (Category Grid) | `app/(tabs)/index.tsx` | Category Grid — 20 categories wired to live Supabase data, 2-column layout, tier badges, emoji icons, tapping category routes to Live Market filtered by that category. |
| 7 | Post a Job | `app/(tabs)/post.tsx` | Form scaffold — category pre-fill, task picker, validation, success state. No DB write yet (Step 4B). |
| 8 | Worker Match | `app/(tabs)/match.tsx` | Built (mock data) |
| 9 | Chat | `app/(tabs)/chat.tsx` | Built (mock data) |
| 10 | Payment / Escrow | `app/(tabs)/payment.tsx` | Built (no Stripe yet) |
| 11 | Rate / Review | `app/(tabs)/review.tsx` | Built |
| 12 | Notifications | `app/(tabs)/notifications.tsx` | Built |
| 13 | Live Market | `app/(tabs)/market.tsx` | Two-feed toggle built — Jobs Feed live from Supabase, Workers Feed empty state. FAB routes to Post a Job with category_id passthrough. |
| 14 | Belt System | `app/(tabs)/belt.tsx` | Built |
| 15 | Earnings / Wallet | `app/(tabs)/earnings.tsx` | stub, ~23 lines, TODO Phase 2 |

Home = Category Grid hub. HELP WANTED → Post a Job. START EARNING → Live Market. Category card → Live Market filtered by category_id.

## Supabase — 13 Tables (Live)
`profiles` · `task_categories` · `task_library` · `worker_skills` · `job_post_tasks` · `jobs` · `bids` · `chats` · `messages` · `payments` · `reviews` · `xp_transactions` · `badges` · `notifications` · `user_badges`

- `task_code` format: `CCTT` e.g. `0101` = category 01, task 01
- `worker_skills.is_featured` = worker's top 3 "Superpowers" shown on their profile card
- Migration file: `supabase/migrations/20260417000001_replace_skills_with_task_library.sql`
- Seed file: `supabase/seed/XProHub_TaskLibrary_Seed_v1.1.sql` — deployed 2026-04-17 (20 categories · 188 tasks)
- Realtime on: `jobs`, `messages`, `notifications`
- Core schema: `C:\Users\sophi\Desktop\CLAUDE-DOC\xprohub_schema.sql`

## Database Schema — Core Tables

### task_categories
| Column | Type | Notes |
|---|---|---|
| id | SMALLINT PK | 1–20 |
| name | TEXT | Display name |
| icon_slug | TEXT | e.g. `home-cleaning` |
| tier | SMALLINT | 1 = standard, 2 = skilled/premium |
| billing_type | TEXT | `per_job` \| `per_hour` \| `per_visit_day` \| `mixed` |
| price_min | INTEGER | USD — lowest across tasks in category |
| price_max | INTEGER | USD — highest across tasks in category |
| difficulty_range | TEXT | e.g. `Easy → Skilled` |
| requires_background_check | BOOLEAN | Category-level flag |
| sort_order | SMALLINT | Display order |

### task_library
| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | Auto |
| task_code | TEXT UNIQUE | Format: CCTT (e.g. `0101`) |
| category_id | SMALLINT FK | → task_categories.id |
| name | TEXT | Task display name |
| description | TEXT | One-sentence description |
| tags | TEXT[] | Searchable keywords |
| price_min | INTEGER | USD — customer-facing estimate |
| price_max | INTEGER | USD — customer-facing estimate |
| est_time_min_hrs | NUMERIC | 0.5 = 30 min; NULL = open-ended |
| est_time_max_hrs | NUMERIC | NULL = overnight or variable |
| difficulty | TEXT | `easy` \| `medium` \| `skilled` |
| billing_type | TEXT | `per_job` \| `per_hour` \| `per_visit_day` |
| requires_verification | BOOLEAN | Worker must pass ID verification for this task |
| is_urgent_eligible | BOOLEAN | Appears in Urgent / Same-Day feed |
| is_active | BOOLEAN | Soft-delete — false = hidden from app via RLS |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto-updated via trigger |

### worker_skills
| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| user_id | UUID FK | → profiles.id ON DELETE CASCADE |
| task_id | INTEGER FK | → task_library.id |
| years_exp | SMALLINT | Optional |
| is_featured | BOOLEAN | Up to 3 Superpowers per worker |
| created_at | TIMESTAMPTZ | |

### job_post_tasks
| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| job_post_id | UUID FK | → jobs.id ON DELETE CASCADE |
| task_id | INTEGER FK | → task_library.id |

## Key Business Rules

- **Difficulty vs Urgency**: `difficulty` describes skill level only (`easy`/`medium`/`skilled`). Urgency is a separate flag (`is_urgent_eligible = true`). Never use `urgent` as a difficulty value — it was removed in v1.1.
- **Task codes (CCTT)**: 4-character zero-padded string. First 2 = category, last 2 = task within category. e.g. `0101` = Category 01, Task 01. `2009` = Category 20, Task 09. Max 99 tasks per category.
- **Billing types**: Three values in task_library — `per_job` (fixed), `per_hour` (hourly), `per_visit_day` (per visit/day, used for pet care). Categories use `mixed` when tasks within the category vary.
- **Verification**: `requires_verification = true` means the worker must pass platform ID verification before offering that task. All Child Care (cat 4), Elder Care (cat 5), and Electrical (cat 15) tasks require it. Plumbing (cat 16) and most HVAC (cat 20) skilled tasks also require it.
- **Pricing**: All `price_min`/`price_max` are in USD. Customer-facing estimates only — not hard payment caps.
- **Soft deletes**: Never DELETE rows from `task_library`. Set `is_active = false`. RLS enforces `is_active = true` for all app reads, so it disappears automatically.
- **Superpowers**: `worker_skills.is_featured` — max 3 per worker. These appear prominently on the worker profile card.

## Indexes Available

| Index | Table | Column(s) | Notes |
|---|---|---|---|
| `idx_task_library_category` | task_library | category_id | Full category scan |
| `idx_task_library_active` | task_library | category_id WHERE is_active=true | Partial — browse/home screens |
| `idx_task_library_urgent` | task_library | id WHERE is_urgent_eligible=true | Partial — Live Market urgent feed |
| `idx_worker_skills_user` | worker_skills | user_id | Worker profile skill lookup |
| `idx_worker_skills_task` | worker_skills | task_id | Task → which workers offer it |
| `idx_job_post_tasks_job` | job_post_tasks | job_post_id | Job → its required tasks |

## Common Query Patterns

```sql
-- All active tasks in a category (browse / home screen)
SELECT * FROM task_library
WHERE category_id = 1 AND is_active = true;

-- A worker's full skill list with Superpower flag
SELECT tl.name, tl.category_id, ws.years_exp, ws.is_featured
FROM worker_skills ws
JOIN task_library tl ON tl.id = ws.task_id
WHERE ws.user_id = '<uuid>';

-- Match workers to a job's required tasks (match score)
SELECT ws.user_id, COUNT(*) AS matched_tasks
FROM job_post_tasks jpt
JOIN worker_skills ws ON ws.task_id = jpt.task_id
WHERE jpt.job_post_id = '<uuid>'
GROUP BY ws.user_id
ORDER BY matched_tasks DESC;

-- All urgent-eligible tasks (Live Market same-day feed)
SELECT * FROM task_library
WHERE is_urgent_eligible = true AND is_active = true;

-- Tasks requiring worker verification
SELECT task_code, name, category_id
FROM task_library
WHERE requires_verification = true AND is_active = true
ORDER BY category_id, task_code;
```

## Recent Migrations
- `20260417000001_replace_skills_with_task_library.sql` — Task Library v1.1 (20 categories, 188 tasks)
- `20260419000001_cleanup_jobs_schema.sql` — Dropped legacy `skills`, `user_skills`, `jobs.skill_id`. Added RLS INSERT/SELECT policies on `job_post_tasks`. Confirmed applied 2026-04-19.

## Development Conventions

- **Adding a task**: INSERT into `task_library` with `ON CONFLICT (task_code) DO NOTHING`. Never reuse a retired task code.
- **Adding a category**: INSERT into `task_categories` with the next `id` in sequence (currently 1–20). Update `sort_order` if reordering display.
- **Retiring a task**: Set `is_active = false`. RLS hides it automatically. Do not DELETE rows.
- **New migrations**: Place in `supabase/migrations/` with timestamp prefix `YYYYMMDDHHMMSS_description.sql`. Always wrap in `BEGIN`/`COMMIT`.
- **Seed updates**: Changes to task data go in `supabase/seed/`. Use `ON CONFLICT (task_code) DO NOTHING` for inserts or `DO UPDATE SET ...` for corrections.
- **task_code rules**: Always 4 characters, zero-padded. No gaps — if a task is retired, its code is reserved and not reissued.
- **RLS state**: `task_categories` and `task_library` have anon-safe public read policies (safe for unauthenticated browse). `worker_skills` needs auth-restricted RLS policies when wired to the app. `job_post_tasks` has INSERT + SELECT policies as of migration 20260419000001.

## Belt System (Workers)
| Belt | Jobs | Min Rating | Key Unlock |
|---|---|---|---|
| Newcomer (White) | 0 | — | 2× XP first 5 jobs, XProHub Guarantee |
| Yellow | 10 | 4.0★ | Higher-paying categories |
| Orange | 30 | 4.3★ | Priority matching, Squad creation |
| Green | 75 | 4.5★ | 30-sec head start on jobs, Gov jobs |
| Blue | 150 | 4.7★ | Team job eligibility |
| Brown | 300 | 4.8★ | Reduced platform commission |
| Black | 500+ (invited) | 4.9★ | Verified badge, premium jobs |
| Legend | 1,000+ | 4.9★ | Highest platform status |

Badges (9): Never Cancels · Top Pro · Verified · Insured · Top 5% · Fast Replies · Rising Star · Money Maker · Squad Leader

XP earn: job complete +50 · 5-star review +30 · on time +20 · fast response +10 · repeat customer +25 · refer worker +100

## PROGRESSIVE PROFILE SYSTEM

### EXPLORER (Level 1 — Browse Only, default for all new users)
- Required: full name, email, profile photo (optional)
- Can do: browse Live Market feed, browse Worker business cards, filter by category
- Cannot do: apply for jobs, post jobs, message anyone, transact

### STARTER (Level 2A — triggered when user posts or applies for jobs under $50)
- Gate screen shown when user taps Post a Job or Apply (low-value jobs)
- Required: phone number (SMS verified), Stripe basic (debit/bank for payouts)
- Workers also: choose skills from Task Library
- Unlocks: posting jobs under $50, applying, messaging, basic transactions
- Stripe handles all banking data — never store financial info directly

### PRO (Level 2B — triggered when user posts or applies for jobs $50+)
- Gate screen shown when job value or category requires full verification
- Required: everything in Starter + address + State ID photo + Stripe Connect full
- Workers also: full background check eligibility
- Unlocks: all jobs, sensitive categories, team jobs
- Stripe Connect handles all banking data — never store financial info directly

### KEY RULE
Never force Starter or Pro upfront. User chooses the path that matches
what they are trying to do. Show a friendly gate only at the moment of
action. Stripe handles all banking data in both paths — never store
financial info directly.

### XPRO (Level 3 — Reputation Builder, optional, unlocks after first transaction)
- Work history, references, certifications, portfolio photos, bio
- Feeds into Belt System ranking and match score

## Progressive Trust Levels (unlock at moment of action)
| Level | Triggered | Required | Unlocks |
|---|---|---|---|
| I Explorer | Sign up | Name + Email + Phone | Browse, view, post basic jobs |
| II Professional | Applying to a job | Photo + Bio + Portfolio | Apply, full profile, messaging |
| III Trusted | Accepting paid job | Address + Gov ID + Stripe | Payments, sensitive categories |

## Matching Algorithm
Location 25% · Skill Match 35% · Belt/Experience 20% · Behavioral 20%
White Belt gets +15% newcomer boost for first 5 jobs ("Give Them A Chance").

## LIVE MARKET — Navigation Model (Locked)

Live Market is the heartbeat of XProHub. All navigation from Home's
top buttons and category cards routes here.

### Entry points
- HELP WANTED button → /live-market (Jobs Feed default)
- START EARNING button → /live-market (Jobs Feed default)
- Category card tap → /live-market?category_id=X (filtered)

### Structure
- Two-feed toggle: Jobs Feed (default) | Workers Feed
- Jobs Feed = pulled from `jobs` table, sorted by recency
- Workers Feed = pulled from `profiles` + `worker_skills`,
  acts as a business card wall
- Category filter powered by `task_categories` (20 rows)

### Level 2 gate triggers
Explorer users browse freely. Gate fires only at:
- Tap "+ Post a Job" → gate → Post a Job flow
- Tap "Apply" on job card → gate → Apply flow
- Tap "Hire Directly" on worker card → gate → Direct Hire flow

### Task Library as spine
Category grid on Home and filters in Live Market both pull from
task_categories. Worker profiles pick tasks from task_library.
Job posts pick tasks from task_library. Matching algorithm runs
on task_library overlap. This is the connective tissue of the
whole platform — do not bypass it.

## Code Rules
1. **Design system** — Dark Gold only: `#0E0E0F` bg, `#C9A84C` gold, `#171719` cards
2. **SafeAreaView** — import from `react-native-safe-area-context` ONLY (not `react-native` — SDK 54 breaking change)
3. **New files** — always `app/filename.tsx`, NEVER `app/app/filename.tsx` (causes Unmatched Route)
4. **Live Market is primary nav** — Home top buttons and category cards all route to `/(tabs)/market`. Do not add new modal-based hub navigation; flat Expo Router `router.push()` is the pattern.
5. **No pure white** — use background color from chosen design system
6. **Every screen answers one question** — no feature creep per screen
7. **No mock data in production** — connect to Supabase or gate the screen
8. **Two core loops**: Customer = 3 taps to done · Worker = 2 taps to earn
9. **Dev Menu** (`dev-menu.tsx`) is `__DEV__` only — never ships to production
10. **Plan Mode** (`Shift+Tab`) before multi-file changes
11. **Windows PowerShell** cannot handle `(tabs)` in paths — use File Explorer for those folders
12. **app.json assets**: splash = `splash-icon.png`, Android icon = `android-icon-foreground.png`

## What Is Built
- All 15 production screens as TSX files (mostly stubs or mock data)
- Welcome screen — THE XPROHUB masthead, ticker bar, Playfair Display tagline "All The Work That's Fit To Post", yin-yang interactive boxes (color-swap on tap), dollar-sign boxes, BUILT FOR TRUST strip
- Home screen — 20-category grid, live Supabase data, 2-column layout, tier badges, emoji icons
- Sign Up wired to Supabase Auth (email + password)
- Supabase schema fully written (`xprohub_schema.sql`)
- GoldenDollar + HomeBeacon reusable components
- Live Market (market.tsx) — two-feed toggle, Jobs Feed wired to Supabase, loading/error/empty states, pull-to-refresh, + POST A JOB FAB routes to post.tsx with category_id passthrough
- Post a Job form scaffold (post.tsx) — category pre-fill via query param, task picker from task_library filtered by category, validation, success state (Submit logs payload — no DB write yet)
- Back navigation header on all tab screens except Home (dark gold, ‹ returns to Home)

## What Is NOT Built Yet
- Supabase not wired beyond Sign Up + Home categories + Live Market Jobs Feed (Login, Profile all use mock data)
- Post a Job submit handler — writes to jobs + job_post_tasks (Step 4B)
- Level 2 Gate screen (shown at moment of action — Post, Apply, Hire) (Step 4C)
- Direct Hire flow (tap "Hire Directly" on worker card)
- Workers Feed in Live Market — profiles + worker_skills business card wall
- Live Market category filter — category_id query param not yet read by market.tsx (Step 3C)
- Stripe integration (no real payments)
- Push notifications not configured
- Smart match algorithm not implemented
- PostGIS geo-matching not active
- Trust Level II/III verification flow
- Team Jobs / Squads / Regional system (Phase 2+)

## Session Start Checklist
- [ ] `npx expo start --clear`
- [ ] Open Expo Go on iPhone → scan QR
- [ ] `git status` — check what changed last session
- [ ] Confirm screens use `#0E0E0F` background and `#C9A84C` gold (fix any that don't)
- [ ] State what screen/feature we're wiring today
- [ ] Connect to Supabase before building new screens
