import { describe, it, expect } from 'vitest';
import { Child, Chore, ChoreCompletion } from './types';
import { buildApprovalPlan, PendingTransaction } from './choreApproval';
import { sumBalances } from './balances';

/**
 * End-to-end tests for the chore completion pipeline:
 *   child marks done (pending) -> parent approves -> transactions emitted -> split categorization.
 *
 * Each scenario below walks the whole flow via a lightweight in-memory harness and asserts
 * on the resulting transactions. Together the 10 scenarios emit a varied mix of
 * `earn`-per-bucket and `match` transactions that exercise every branch of the approval logic.
 */

type Role = 'child' | 'parent';

interface HarnessEvent {
  role: Role;
  kind: 'mark-done' | 'approve' | 'reject';
  completionId: string;
}

interface FlowResult {
  events: HarnessEvent[];
  completion: ChoreCompletion;
  transactions: PendingTransaction[];
  totalCredited: number;
}

let idSeq = 0;
const nextId = (prefix: string) => `${prefix}-${++idSeq}`;

function makeChild(overrides: Partial<Child> = {}): Child {
  return {
    id: overrides.id ?? nextId('child'),
    family_id: 'family-1',
    name: overrides.name ?? 'Test Kid',
    avatar: 'kid',
    dob: null,
    split_spend: 50,
    split_save: 30,
    split_give: 20,
    allowance_amount: 0,
    allowance_frequency: 'none',
    allowance_next_date: null,
    savings_match_rate: 0,
    is_archived: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeChore(child: Child, overrides: Partial<Chore> = {}): Chore {
  return {
    id: overrides.id ?? nextId('chore'),
    child_id: child.id,
    title: overrides.title ?? 'Test chore',
    description: '',
    value: 10,
    frequency: 'weekly',
    due_date: null,
    day_of_week: null,
    is_milestone: false,
    is_active: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Runs the full child -> approval pipeline against the real logic and returns
 * the transactions that would be persisted plus a trace of role events.
 */
function runFlow(
  chore: Chore,
  child: Child,
  history: ChoreCompletion[] = [],
  decision: 'approve' | 'reject' = 'approve',
  rejectionNote?: string,
): FlowResult {
  const events: HarnessEvent[] = [];

  // 1. Child taps "Mark done" from the kid view.
  const completionId = nextId('cmp');
  const pending: ChoreCompletion = {
    id: completionId,
    chore_id: chore.id,
    child_id: child.id,
    status: 'pending',
    completed_at: new Date().toISOString(),
    reviewed_at: null,
    rejection_note: null,
    streak_count: 0,
    created_at: new Date().toISOString(),
  };
  events.push({ role: 'child', kind: 'mark-done', completionId });

  // 2. Parent reviews from the approvals queue.
  if (decision === 'reject') {
    const rejected: ChoreCompletion = {
      ...pending,
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      rejection_note: rejectionNote ?? null,
    };
    events.push({ role: 'parent', kind: 'reject', completionId });
    return { events, completion: rejected, transactions: [], totalCredited: 0 };
  }

  // 3. Approval -> pure plan builder computes streak + bucket-split transactions.
  const plan = buildApprovalPlan(chore, child, history, completionId);
  const approved: ChoreCompletion = {
    ...pending,
    status: 'approved',
    reviewed_at: new Date().toISOString(),
    streak_count: plan.streak,
  };
  events.push({ role: 'parent', kind: 'approve', completionId });

  const totalCredited = plan.transactions.reduce((sum, t) => sum + t.amount, 0);
  return { events, completion: approved, transactions: plan.transactions, totalCredited };
}

function earnByBucket(rows: PendingTransaction[]) {
  const acc = { spend: 0, save: 0, give: 0 };
  for (const r of rows.filter((r) => r.type === 'earn')) acc[r.bucket] += r.amount;
  return acc;
}

describe('Chore completion flow: child -> approval -> transactions -> splits', () => {
  it('1. Standard 50/30/20 split on a $10 weekly chore', () => {
    const child = makeChild();
    const chore = makeChore(child, { title: 'Take out trash', value: 10 });

    const result = runFlow(chore, child);

    expect(result.events.map((e) => `${e.role}:${e.kind}`)).toEqual([
      'child:mark-done',
      'parent:approve',
    ]);
    expect(result.completion.status).toBe('approved');
    expect(result.completion.streak_count).toBe(1);
    expect(result.transactions).toHaveLength(3);
    expect(earnByBucket(result.transactions)).toEqual({ spend: 5, save: 3, give: 2 });
    expect(result.transactions.every((t) => t.chore_completion_id === result.completion.id)).toBe(true);
    expect(result.transactions.every((t) => t.description === 'Chore: Take out trash')).toBe(true);
    expect(result.totalCredited).toBe(10);
  });

  it('2. Single-bucket child (100/0/0) routes entire value to Spend', () => {
    const child = makeChild({ split_spend: 100, split_save: 0, split_give: 0 });
    const chore = makeChore(child, { title: 'Dog walk', value: 7.5 });

    const result = runFlow(chore, child);

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toMatchObject({ type: 'earn', bucket: 'spend', amount: 7.5 });
    expect(result.totalCredited).toBeCloseTo(7.5, 2);
  });

  it('3. Lopsided 33/33/34 split conserves cents via remainder rule', () => {
    const child = makeChild({ split_spend: 33, split_save: 33, split_give: 34 });
    const chore = makeChore(child, { value: 10 });

    const result = runFlow(chore, child);
    const byBucket = earnByBucket(result.transactions);

    expect(byBucket.spend + byBucket.save + byBucket.give).toBeCloseTo(10, 2);
    expect(byBucket.spend).toBeCloseTo(3.3, 2);
    expect(byBucket.save).toBeCloseTo(3.3, 2);
    expect(byBucket.give).toBeCloseTo(3.4, 2);
  });

  it('4. Milestone chore: pending becomes approved but emits zero transactions', () => {
    const child = makeChild();
    const chore = makeChore(child, { title: 'Read 20 minutes', is_milestone: true, value: 0 });

    const result = runFlow(chore, child);

    expect(result.completion.status).toBe('approved');
    expect(result.completion.streak_count).toBe(1);
    expect(result.transactions).toEqual([]);
    expect(result.totalCredited).toBe(0);
  });

  it('5. Zero-dollar chore emits no transactions even when not a milestone', () => {
    const child = makeChild();
    const chore = makeChore(child, { value: 0 });

    const result = runFlow(chore, child);

    expect(result.transactions).toEqual([]);
  });

  it('6. Savings match at 100% doubles the Save bucket with a separate match txn', () => {
    const child = makeChild({
      split_spend: 50,
      split_save: 50,
      split_give: 0,
      savings_match_rate: 100,
    });
    const chore = makeChore(child, { value: 10 });

    const result = runFlow(chore, child);

    expect(result.transactions).toHaveLength(3);
    const earn = earnByBucket(result.transactions);
    expect(earn).toEqual({ spend: 5, save: 5, give: 0 });

    const match = result.transactions.find((t) => t.type === 'match');
    expect(match).toBeDefined();
    expect(match!).toMatchObject({ bucket: 'save', amount: 5 });
    expect(match!.description).toContain('100%');

    const saveBalance = result.transactions
      .filter((t) => t.bucket === 'save')
      .reduce((s, t) => s + t.amount, 0);
    expect(saveBalance).toBe(10);
  });

  it('7. Savings match at 50% yields half the Save amount as a match', () => {
    const child = makeChild({
      split_spend: 40,
      split_save: 40,
      split_give: 20,
      savings_match_rate: 50,
    });
    const chore = makeChore(child, { value: 5 });

    const result = runFlow(chore, child);

    const earn = earnByBucket(result.transactions);
    expect(earn).toEqual({ spend: 2, save: 2, give: 1 });

    const match = result.transactions.find((t) => t.type === 'match');
    expect(match).toBeDefined();
    expect(match!.amount).toBe(1);
    expect(match!.bucket).toBe('save');
  });

  it('8. Streak increments on the second approval of the same chore', () => {
    const child = makeChild();
    const chore = makeChore(child, { value: 3 });

    const first = runFlow(chore, child, []);
    expect(first.completion.streak_count).toBe(1);

    const history: ChoreCompletion[] = [first.completion];
    const second = runFlow(chore, child, history);

    expect(second.completion.streak_count).toBe(2);
    expect(second.transactions).toHaveLength(3);
    expect(earnByBucket(second.transactions).spend + earnByBucket(second.transactions).save + earnByBucket(second.transactions).give).toBeCloseTo(3, 2);
  });

  it('9. Rejection resets the streak on the next approval', () => {
    const child = makeChild();
    const chore = makeChore(child, { value: 4 });

    const approved1 = runFlow(chore, child).completion;
    const rejected = runFlow(chore, child, [approved1], 'reject', 'Not done properly').completion;
    const approved2 = runFlow(chore, child, [approved1, rejected]).completion;

    expect(approved1.streak_count).toBe(1);
    expect(rejected.status).toBe('rejected');
    expect(rejected.rejection_note).toBe('Not done properly');
    expect(approved2.streak_count).toBe(1);
  });

  it('10. Small amount ($0.01) with 50/30/20 still rounds to a single-cent credit', () => {
    const child = makeChild();
    const chore = makeChore(child, { value: 0.01 });

    const result = runFlow(chore, child);

    const total = result.transactions.reduce((s, t) => s + t.amount, 0);
    expect(total).toBeCloseTo(0.01, 2);
    expect(result.transactions.length).toBeGreaterThan(0);
    expect(result.transactions.length).toBeLessThanOrEqual(3);
    expect(result.transactions.every((t) => t.amount > 0)).toBe(true);
  });
});

describe('Aggregate: 10 flows produce a coherent ledger of varied transactions', () => {
  it('sums bucket balances from the entire test-suite flow', () => {
    idSeq = 1000; // isolate from describe-level ids
    const child = makeChild({ id: 'agg-child', savings_match_rate: 25 });

    const flows: FlowResult[] = [];
    const configs: Array<Partial<Chore>> = [
      { title: 'Standard 50/30/20', value: 10 },
      { title: 'Dog walk', value: 7.5 },
      { title: 'Lopsided', value: 10 },
      { title: 'Milestone', is_milestone: true, value: 0 },
      { title: 'Zero dollar', value: 0 },
      { title: 'Big match', value: 10 },
      { title: 'Half match', value: 5 },
      { title: 'Streak #1', value: 3 },
      { title: 'Streak #2', value: 3 },
      { title: 'Penny', value: 0.01 },
    ];

    const history: ChoreCompletion[] = [];
    for (const cfg of configs) {
      const chore = makeChore(child, cfg);
      const result = runFlow(chore, child, history);
      flows.push(result);
      history.push(result.completion);
    }

    expect(flows).toHaveLength(10);
    const allTransactions = flows.flatMap((f) => f.transactions);
    const balances = sumBalances(allTransactions.map((t) => ({ bucket: t.bucket, amount: t.amount })));
    expect(balances.total).toBeGreaterThan(0);
    expect(balances.spend).toBeGreaterThan(0);
    expect(balances.save).toBeGreaterThan(0);
    expect(allTransactions.some((t) => t.type === 'match')).toBe(true);
    expect(allTransactions.some((t) => t.type === 'earn')).toBe(true);
    expect(allTransactions.every((t) => t.chore_completion_id !== null)).toBe(true);
  });
});
