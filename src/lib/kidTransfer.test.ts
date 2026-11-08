import { describe, it, expect } from 'vitest';
import { buildKidTransferPlan, validateKidTransfer } from './kidTransfer';
import { Balances } from './types';

const bal = (spend: number, save = 0, give = 0): Balances => ({ spend, save, give, total: spend + save + give });
const sender = { name: 'Ava' };
const recipient = { name: 'Ben', split_spend: 50, split_save: 30, split_give: 20 };
const req = { sender_child_id: 'a', recipient_child_id: 'b', bucket: 'spend' as const, amount: 10 };

describe('buildKidTransferPlan', () => {
  it('debits sender and credits recipient by their ratios, summing to zero', () => {
    const plan = buildKidTransferPlan(req, sender, recipient, bal(25));
    expect(plan[0]).toMatchObject({ child_id: 'a', bucket: 'spend', amount: -10, type: 'transfer' });
    const credits = plan.slice(1);
    expect(credits.every((t) => t.child_id === 'b')).toBe(true);
    expect(credits.map((t) => [t.bucket, t.amount])).toEqual([['spend', 5], ['save', 3], ['give', 2]]);
    expect(plan.reduce((s, t) => s + t.amount, 0)).toBeCloseTo(0, 10);
  });

  it('stays cent-correct on awkward amounts', () => {
    const plan = buildKidTransferPlan({ ...req, amount: 0.07 }, sender, recipient, bal(1));
    const credited = plan.slice(1).reduce((s, t) => s + Math.round(t.amount * 100), 0);
    expect(credited).toBe(7);
  });

  it('skips zero-amount buckets', () => {
    const plan = buildKidTransferPlan(req, sender, { ...recipient, split_spend: 100, split_save: 0, split_give: 0 }, bal(25));
    expect(plan).toHaveLength(2);
  });

  it('throws when sender balance dropped below the amount', () => {
    expect(() => buildKidTransferPlan(req, sender, recipient, bal(9.99))).toThrow(/enough/);
  });
});

describe('validateKidTransfer', () => {
  const base = { senderId: 'a', recipientId: 'b', bucket: 'spend' as const, amount: 5 };
  it('accepts a valid request', () => expect(validateKidTransfer(base, bal(5))).toBeNull());
  it('rejects self-sends, no recipient, bad amounts and overdrafts', () => {
    expect(validateKidTransfer({ ...base, recipientId: 'a' }, bal(5))).toMatch(/yourself/);
    expect(validateKidTransfer({ ...base, recipientId: '' }, bal(5))).toMatch(/who/);
    expect(validateKidTransfer({ ...base, amount: 0 }, bal(5))).toMatch(/greater/);
    expect(validateKidTransfer({ ...base, amount: NaN }, bal(5))).toMatch(/greater/);
    expect(validateKidTransfer({ ...base, amount: 5.01 }, bal(5))).toMatch(/Not enough/);
  });
});
