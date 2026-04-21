import { Balances, Bucket, Child } from './types';

export function emptyBalances(): Balances {
  return { spend: 0, save: 0, give: 0, total: 0 };
}

export function sumBalances(rows: { bucket: Bucket; amount: number }[]): Balances {
  const b = emptyBalances();
  for (const r of rows) {
    const amt = Number(r.amount);
    b[r.bucket] += amt;
    b.total += amt;
  }
  return b;
}

export function splitEarning(
  amount: number,
  child: Pick<Child, 'split_spend' | 'split_save' | 'split_give'>,
): { spend: number; save: number; give: number } {
  const cents = Math.round(amount * 100);
  const spend = Math.round((cents * child.split_spend) / 100);
  const save = Math.round((cents * child.split_save) / 100);
  const give = cents - spend - save;
  return { spend: spend / 100, save: save / 100, give: give / 100 };
}

export function formatMoney(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}
