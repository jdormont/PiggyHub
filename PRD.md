# PiggyHub — Product Requirements Document

**Last updated:** 2026-04-21  
**Status:** Active development — Phases 1–4 shipped

---

## Overview

PiggyHub is a family financial-education app. Parents manage money, chores, and savings goals for their children. Kids see a simplified, motivational view of their own balances and progress. Every dollar a child earns is automatically split across three buckets — **Spend**, **Save**, and **Give** — teaching allocations from day one.

---

## Core Mental Model

```
Earn (chore / allowance)
  └─ split by child's ratios (e.g. 50 / 30 / 20)
       ├─ Spend bucket  ← everyday purchases
       ├─ Save bucket   ← savings goals + parent match
       └─ Give bucket   ← charity / gifts
```

Bucket balances are always derived by summing the transaction ledger — there is no separate balance column. This means the ledger is the single source of truth and every dollar is traceable.

---

## Shipped — Phases 1–4

### Phase 1 — Families & Children ✓

**Auth**
- Email/password sign-up and sign-in via Supabase Auth
- Session persisted; auto-refresh

**Family setup**
- A `families` row is created automatically on first login, linked to `auth.uid()`
- Parent name stored on the family record

**Child profiles**
- Name and emoji avatar (18 choices)
- Date of birth (optional)
- Per-child bucket split: spend / save / give (must sum to 100%)
- Allowance: amount + frequency (none / weekly / biweekly / monthly) + next-due date
- Savings match rate: parent matches child's save earnings 0–100%
- Soft-archive (never deleted; hidden from active views)

**Dashboard**
- Grid of child cards showing total balance, bucket pills, allowance info
- Pending-approvals badge on each card
- Allowance-due banner: one-click to pay all due children
- Add/edit/archive children via modal

**Security**
- RLS on all tables; parents access only their own family's data

---

### Phase 2 — Chore Engine ✓

**Chores**
- Title, optional description, dollar value (0 for milestones), frequency, day-of-week (weekly), due date
- Milestone flag: marks as achieved with no payment
- Active/archived toggle

**Completion flow**
1. Child taps "Mark done" in kid view → `pending` completion created
2. Parent sees queue in Approvals section; taps Approve or Reject
3. Rejection optionally includes a note shown to child

**Automatic payout on approval**
- `buildApprovalPlan()` (pure, unit-tested) computes:
  - Up to 3 `earn` transactions split by child's ratios, using cent-correct rounding
  - 1 `match` transaction on the Save bucket if `savings_match_rate > 0`
- Streak counter: consecutive approvals since last rejection (snapshotted on the completion row)

**Transaction ledger**
- Types: `earn` | `allowance` | `spend` | `transfer` | `match`
- Buckets: `spend` | `save` | `give`
- All transactions carry description, optional category, and a link to the originating chore completion
- Parent can delete individual transactions (with confirmation)

**Parent money actions (modal with tabs)**
- **Add**: split into buckets by child's ratios, or deposit to a single bucket
- **Spend**: debit any bucket; optional category
- **Transfer**: move money between buckets

**Allowance payout**
- Splits child's allowance amount by their ratios → 3 `allowance` transactions
- Advances `allowance_next_date` correctly for each frequency

---

### Phase 3 — Ledger & UI Polish ✓

**Transaction list component**
- Filter by bucket (spend / save / give) and by type (earn / allowance / spend / transfer / match)
- Signed, color-coded amounts; type/bucket icons
- Compact mode (kid view) and full mode (parent detail)
- Per-row delete in parent view

**Child detail page — 3 tabs**
- **Chores**: pending approvals queue + active chore list + completion history
- **Transactions**: full filterable ledger
- **Goals**: savings goals panel (Phase 4)

**Kid view**
- Gradient bucket cards with large amounts
- Chore list: mark done, pending badge, recent history
- Goals section (Phase 4)
- Recent activity (last 8 transactions)

---

### Phase 4 — Savings Goals ✓

**Goals**
- Title, target amount, optional target date, icon (8 choices), optional photo URL
- Soft-archive on delete
- `is_complete` flag set when parent clicks "Mark bought"

**Goal contributions ledger** (`goal_contributions`)
- Each contribution links to a real bucket-debit transaction, keeping the ledger authoritative
- Direction: `contribute` (in) | `withdraw` (reversal) | `complete`
- Progress = sum(contribute) − sum(withdraw); capped at target for display

**Contribute modal**
- Bucket picker showing live balances
- Amount input with $1 / $5 / $10 / remaining quick-picks
- Balance guard: rejects if bucket can't cover the amount

**Withdraw**
- Reverses a specific contribution; credits the source bucket back

**Goal card**
- Progress bar (sky while in progress, emerald when reached)
- % complete + remaining-to-go
- Days-left / past-due countdown from target date
- "Add money" always visible; "Mark bought" only if 100% and parent view
- "Done" trophy badge once complete

**Parent vs kid mode**
- Kid view: contribute but not create, edit, or mark bought
- Parent view: full CRUD + mark bought

**Test coverage**
- `choreApproval.test.ts`: 11 tests covering all approval-flow paths (standard splits, single bucket, rounding, milestone, zero-value, match rates, streak increment, streak reset, penny rounding, aggregate ledger)

---

## Database Schema (Current)

| Table | Purpose |
|---|---|
| `families` | One per parent account |
| `children` | Child profiles with split + allowance config |
| `chores` | Tasks assigned to a child |
| `chore_completions` | One per mark-done event; carries status + streak |
| `transactions` | Canonical money ledger; source of balance truth |
| `goals` | Savings targets per child |
| `goal_contributions` | Allocation ledger linked to bucket transactions |

RLS is enabled on every table. All policies check `families.parent_user_id = auth.uid()` through the child relationship.

---

## Remaining Work

### Phase 5 — Notifications & Engagement

**Allowance due reminders**
- Persist and surface overdue allowance dates (currently UI-only banner)
- Optional: email notification when allowance is due (Supabase Edge Function + cron)

**Chore reminders**
- Surface "due today" chores prominently in kid view
- Weekly summary for parents (pending approvals, due chores)

**Streak milestones**
- Celebrate streak milestones (5, 10, 25 completions) with a one-time badge in kid view
- Store earned badges on the child record

---

### Phase 6 — Reporting & Insights

**Parent dashboard analytics**
- Monthly earn/spend/save/give chart per child (bar or line, last 6 months)
- Goal savings rate: how fast each child is saving toward active goals
- Projected goal completion date based on contribution velocity

**Child-facing charts**
- Kid view: simple bar showing this week's earnings vs last week
- Savings goal timeline: projected date at current pace

---

### Phase 7 — Multi-Child & Family Features

**Household chores**
- A chore assignable to multiple children (first to mark done gets credit)
- Family chore board visible to all children

**Sibling challenges**
- Optional friendly competition: "who has the longest streak this week?"
- Opt-in per child

---

### Phase 8 — Real Money Integration

**Linked accounts** (stretch)
- Parent links a bank account or prepaid debit card
- Allowance payout triggers a real ACH transfer
- Spend transactions sync from card swipes

**Physical card**
- Virtual or physical debit card per child limited to Spend bucket
- Card balance = Spend bucket balance

> Phase 8 requires a payments partner (e.g. Stripe Issuing or Unit) and is a product/legal decision before development begins.

---

### Known Gaps & Tech Debt

| Item | Priority |
|---|---|
| Goal `withdraw` UI is backend-only; no front-end surface to view/undo individual contributions | Medium |
| Allowance next_date is set optimistically on client; should be updated in a DB trigger or Edge Function to prevent drift | Medium |
| No pagination on transaction list (could slow on long-running accounts) | Low |
| `category` field on transactions is captured but never used in filters or reports | Low |
| Chore `description` is stored but not shown anywhere in the UI | Low |
| No confirmation email / password reset flow (Supabase handles this but it's not wired in the UI) | Medium |
| Kid view has no authentication — any parent can switch to any child's view by passing a `childId` (acceptable for the parent-device model but worth noting) | Low |
| No tests for context-layer mutations (GoalsContext, ChoresContext money actions) | Medium |

---

## Architecture Notes

- **Frontend**: React 18 + TypeScript + Tailwind CSS, bundled with Vite
- **Backend**: Supabase (Postgres + Auth + Row-Level Security); no custom server
- **State**: React Context (Auth → Family → Chores → Goals); no external state library
- **Testing**: Vitest; currently covers pure approval-logic functions
- **Edge Functions**: None deployed yet (needed for Phase 5 notifications)
