import { Goal, GoalContribution, Transaction } from './types';

export interface MonthSlice {
  label: string;       // e.g. "Jan", "Feb"
  year: number;
  month: number;       // 0-indexed JS month
  earnSpend: number;   // positive inflows → spend bucket
  earnSave: number;
  earnGive: number;
  spent: number;       // absolute value of spend-bucket outflows
}

/** Returns the last `count` calendar months as slices, oldest first. */
export function getMonthlyBreakdown(transactions: Transaction[], count = 6): MonthSlice[] {
  const now = new Date();
  const slices: MonthSlice[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    slices.push({
      label: d.toLocaleString('default', { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth(),
      earnSpend: 0,
      earnSave: 0,
      earnGive: 0,
      spent: 0,
    });
  }

  for (const tx of transactions) {
    const d = new Date(tx.created_at);
    const slice = slices.find((s) => s.year === d.getFullYear() && s.month === d.getMonth());
    if (!slice) continue;
    const amt = Number(tx.amount);
    if (amt > 0) {
      if (tx.bucket === 'spend') slice.earnSpend += amt;
      else if (tx.bucket === 'save') slice.earnSave += amt;
      else if (tx.bucket === 'give') slice.earnGive += amt;
    } else {
      if (tx.bucket === 'spend') slice.spent += Math.abs(amt);
    }
  }

  return slices;
}

export interface WeeklyEarnings {
  thisWeek: number;
  lastWeek: number;
  delta: number;       // thisWeek - lastWeek
  deltaPercent: number | null; // null if lastWeek === 0
}

/** Positive inflows (earn + allowance + match) for the current and previous calendar week (Mon–Sun). */
export function getWeeklyEarnings(transactions: Transaction[]): WeeklyEarnings {
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // Mon=0 … Sun=6
  const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
  const startOfLastWeek = new Date(startOfThisWeek.getTime() - 7 * 86400_000);

  let thisWeek = 0;
  let lastWeek = 0;

  for (const tx of transactions) {
    if (Number(tx.amount) <= 0) continue;
    const d = new Date(tx.created_at);
    if (d >= startOfThisWeek) thisWeek += Number(tx.amount);
    else if (d >= startOfLastWeek) lastWeek += Number(tx.amount);
  }

  thisWeek = parseFloat(thisWeek.toFixed(2));
  lastWeek = parseFloat(lastWeek.toFixed(2));

  return {
    thisWeek,
    lastWeek,
    delta: parseFloat((thisWeek - lastWeek).toFixed(2)),
    deltaPercent: lastWeek === 0 ? null : parseFloat((((thisWeek - lastWeek) / lastWeek) * 100).toFixed(1)),
  };
}

export interface GoalProjection {
  goalId: string;
  title: string;
  remaining: number;
  /** Estimated completion date, or null if no contributions or already complete. */
  estimatedDate: Date | null;
  /** Average weekly contribution rate in dollars, based on last 4 weeks of data. */
  weeklyRate: number;
  weeksToGo: number | null;
}

/** Estimates when each active goal will be reached given recent contribution velocity. */
export function getGoalProjections(
  goals: Goal[],
  contributions: GoalContribution[],
  progressById: Record<string, { contributed: number; remaining: number; complete: boolean }>,
): GoalProjection[] {
  const now = Date.now();
  const FOUR_WEEKS_MS = 28 * 86400_000;
  const windowStart = now - FOUR_WEEKS_MS;

  return goals
    .filter((g) => !g.is_complete && !g.is_archived)
    .map((g) => {
      const prog = progressById[g.id];
      const remaining = prog?.remaining ?? Number(g.target_amount);
      const complete = prog?.complete ?? false;

      if (complete) {
        return { goalId: g.id, title: g.title, remaining: 0, estimatedDate: null, weeklyRate: 0, weeksToGo: null };
      }

      // Net contributions in the last 4 weeks
      const recentNet = contributions
        .filter((c) => c.goal_id === g.id && new Date(c.created_at).getTime() >= windowStart)
        .reduce((sum, c) => sum + (c.direction === 'contribute' ? Number(c.amount) : -Number(c.amount)), 0);

      const weeklyRate = parseFloat((Math.max(0, recentNet) / 4).toFixed(2));

      if (weeklyRate === 0) {
        return { goalId: g.id, title: g.title, remaining, estimatedDate: null, weeklyRate: 0, weeksToGo: null };
      }

      const weeksToGo = Math.ceil(remaining / weeklyRate);
      const estimatedDate = new Date(now + weeksToGo * 7 * 86400_000);

      return { goalId: g.id, title: g.title, remaining, estimatedDate, weeklyRate, weeksToGo };
    });
}

/** Summary stats for a child over all time. */
export interface LifetimeStats {
  totalEarned: number;
  totalSpent: number;
  totalSaved: number;    // net save-bucket inflows
  totalGiven: number;
  saveRate: number;      // save / earned, 0-100
}

export function getLifetimeStats(transactions: Transaction[]): LifetimeStats {
  let totalEarned = 0;
  let totalSpent = 0;
  let totalSaved = 0;
  let totalGiven = 0;

  for (const tx of transactions) {
    const amt = Number(tx.amount);
    if (amt > 0) {
      totalEarned += amt;
      if (tx.bucket === 'save') totalSaved += amt;
      if (tx.bucket === 'give') totalGiven += amt;
    } else {
      if (tx.bucket === 'spend') totalSpent += Math.abs(amt);
    }
  }

  return {
    totalEarned: parseFloat(totalEarned.toFixed(2)),
    totalSpent: parseFloat(totalSpent.toFixed(2)),
    totalSaved: parseFloat(totalSaved.toFixed(2)),
    totalGiven: parseFloat(totalGiven.toFixed(2)),
    saveRate: totalEarned > 0 ? parseFloat(((totalSaved / totalEarned) * 100).toFixed(1)) : 0,
  };
}
