import { Child, Chore, ChoreCompletion, Transaction } from './types';
import { splitEarning } from './balances';

export type PendingTransaction = Omit<Transaction, 'id' | 'created_at'>;

export interface ApprovalPlan {
  streak: number;
  transactions: PendingTransaction[];
}

export function computeStreak(
  chore: Pick<Chore, 'id'>,
  priorCompletions: ChoreCompletion[],
): number {
  const forChore = priorCompletions.filter((c) => c.chore_id === chore.id);
  const lastReject = forChore
    .filter((c) => c.status === 'rejected')
    .sort((a, b) => (a.reviewed_at ?? '').localeCompare(b.reviewed_at ?? ''))
    .pop();
  const approvedSince = forChore
    .filter((c) => c.status === 'approved')
    .filter((c) => !lastReject || (c.reviewed_at ?? '') > (lastReject.reviewed_at ?? ''));
  return approvedSince.length + 1;
}

export function buildApprovalPlan(
  chore: Chore,
  child: Child,
  priorCompletions: ChoreCompletion[],
  completionId: string,
): ApprovalPlan {
  const streak = computeStreak(chore, priorCompletions);
  const transactions: PendingTransaction[] = [];

  if (chore.is_milestone || Number(chore.value) <= 0) {
    return { streak, transactions };
  }

  const split = splitEarning(Number(chore.value), child);
  const description = `Chore: ${chore.title}`;

  for (const bucket of ['spend', 'save', 'give'] as const) {
    if (split[bucket] > 0) {
      transactions.push({
        child_id: chore.child_id,
        type: 'earn',
        bucket,
        amount: split[bucket],
        description,
        category: null,
        chore_completion_id: completionId,
      });
    }
  }

  if (Number(child.savings_match_rate) > 0 && split.save > 0) {
    const matchAmount = Math.round(split.save * Number(child.savings_match_rate)) / 100;
    if (matchAmount > 0) {
      transactions.push({
        child_id: chore.child_id,
        type: 'match',
        bucket: 'save',
        amount: matchAmount,
        description: `Savings match (${child.savings_match_rate}%)`,
        category: null,
        chore_completion_id: completionId,
      });
    }
  }

  return { streak, transactions };
}
