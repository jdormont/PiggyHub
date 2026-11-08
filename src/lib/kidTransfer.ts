import { Balances, Bucket, Child, KidTransferRequest } from './types';
import { splitEarning } from './balances';
import { PendingTransaction } from './choreApproval';

/** Validate a kid's request before it is submitted. Returns an error message or null. */
export function validateKidTransfer(
  input: { senderId: string; recipientId: string; bucket: Bucket; amount: number },
  senderBalances: Balances,
): string | null {
  if (!input.recipientId) return 'Pick who to send to.';
  if (input.senderId === input.recipientId) return "You can't send money to yourself.";
  if (!Number.isFinite(input.amount) || Math.round(input.amount * 100) <= 0) {
    return 'Enter an amount greater than $0.';
  }
  if (Math.round(input.amount * 100) > Math.round(senderBalances[input.bucket] * 100)) {
    return `Not enough in ${input.bucket}.`;
  }
  return null;
}

/**
 * Pure payout plan for an approved kid-to-kid transfer. Emits one negative `transfer` row
 * on the sender's chosen bucket and positive rows on the recipient, split by the recipient's
 * Spend/Save/Give ratios (cent-correct, so credits always sum to the debit).
 * Throws if the sender no longer has enough in the bucket.
 */
export function buildKidTransferPlan(
  request: Pick<KidTransferRequest, 'sender_child_id' | 'recipient_child_id' | 'bucket' | 'amount'>,
  sender: Pick<Child, 'name'>,
  recipient: Pick<Child, 'name' | 'split_spend' | 'split_save' | 'split_give'>,
  senderBalances: Balances,
): PendingTransaction[] {
  const amount = Number(request.amount);
  if (Math.round(amount * 100) <= 0) throw new Error('Invalid amount.');
  if (Math.round(amount * 100) > Math.round(senderBalances[request.bucket] * 100)) {
    throw new Error(`${sender.name} no longer has enough in ${request.bucket}.`);
  }

  const debit: PendingTransaction = {
    child_id: request.sender_child_id,
    type: 'transfer',
    bucket: request.bucket,
    amount: -amount,
    description: `Sent to ${recipient.name}`,
    category: null,
    chore_completion_id: null,
  };

  const split = splitEarning(amount, recipient);
  const credits: PendingTransaction[] = (['spend', 'save', 'give'] as Bucket[])
    .filter((b) => split[b] > 0)
    .map((b) => ({
      child_id: request.recipient_child_id,
      type: 'transfer' as const,
      bucket: b,
      amount: split[b],
      description: `Gift from ${sender.name}`,
      category: null,
      chore_completion_id: null,
    }));

  return [debit, ...credits];
}
