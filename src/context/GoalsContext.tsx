import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Bucket, Goal, GoalContribution, GoalInput, Transaction } from '../lib/types';
import { useFamily } from './FamilyContext';
import { useChores } from './ChoresContext';

export interface GoalProgress {
  contributed: number;
  percent: number;
  remaining: number;
  complete: boolean;
}

interface GoalsContextValue {
  loading: boolean;
  goals: Goal[];
  contributions: GoalContribution[];
  progressById: Record<string, GoalProgress>;
  createGoal: (childId: string, input: GoalInput) => Promise<Goal>;
  updateGoal: (id: string, input: Partial<GoalInput>) => Promise<Goal>;
  archiveGoal: (id: string) => Promise<void>;
  contribute: (goalId: string, amount: number, bucket: Bucket) => Promise<void>;
  withdraw: (goalId: string, contributionId: string) => Promise<void>;
  completeGoal: (goalId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const GoalsContext = createContext<GoalsContextValue | undefined>(undefined);

export function GoalsProvider({ children: reactChildren }: { children: ReactNode }) {
  const { family, children: kids } = useFamily();
  const { balancesByChild, refresh: refreshChores } = useChores();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [contributions, setContributions] = useState<GoalContribution[]>([]);
  const [loading, setLoading] = useState(true);

  const childIds = useMemo(() => kids.map((c) => c.id), [kids]);

  const refresh = useCallback(async () => {
    if (!family || childIds.length === 0) {
      setGoals([]);
      setContributions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [goalsRes, contribsRes] = await Promise.all([
      supabase.from('goals').select('*').in('child_id', childIds).eq('is_archived', false).order('created_at'),
      supabase.from('goal_contributions').select('*').in('child_id', childIds).order('created_at'),
    ]);
    setGoals((goalsRes.data ?? []) as Goal[]);
    setContributions((contribsRes.data ?? []) as GoalContribution[]);
    setLoading(false);
  }, [family, childIds]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const progressById = useMemo(() => {
    const map: Record<string, GoalProgress> = {};
    for (const g of goals) {
      const total = contributions
        .filter((c) => c.goal_id === g.id)
        .reduce((sum, c) => {
          if (c.direction === 'contribute') return sum + Number(c.amount);
          if (c.direction === 'withdraw') return sum - Number(c.amount);
          return sum;
        }, 0);
      const target = Number(g.target_amount);
      const percent = target > 0 ? Math.min(100, Math.round((total / target) * 100)) : 0;
      map[g.id] = {
        contributed: Math.max(0, Number(total.toFixed(2))),
        percent,
        remaining: Math.max(0, Number((target - total).toFixed(2))),
        complete: g.is_complete || total >= target,
      };
    }
    return map;
  }, [goals, contributions]);

  const createGoal = async (childId: string, input: GoalInput): Promise<Goal> => {
    const { data, error } = await supabase
      .from('goals')
      .insert({ ...input, child_id: childId })
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Could not create goal.');
    const goal = data as Goal;
    setGoals((prev) => [...prev, goal]);
    return goal;
  };

  const updateGoal = async (id: string, input: Partial<GoalInput>): Promise<Goal> => {
    const { data, error } = await supabase
      .from('goals')
      .update(input)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Could not update goal.');
    const goal = data as Goal;
    setGoals((prev) => prev.map((g) => (g.id === id ? goal : g)));
    return goal;
  };

  const archiveGoal = async (id: string) => {
    const { error } = await supabase.from('goals').update({ is_archived: true }).eq('id', id);
    if (error) throw new Error(error.message);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const contribute = async (goalId: string, amount: number, bucket: Bucket) => {
    if (!(amount > 0)) throw new Error('Enter an amount greater than $0.');
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) throw new Error('Goal not found.');
    if (goal.is_complete) throw new Error('This goal is already complete.');
    const balances = balancesByChild[goal.child_id];
    if (!balances || balances[bucket] < amount) {
      throw new Error(`${bucket.charAt(0).toUpperCase() + bucket.slice(1)} doesn't have enough to cover this.`);
    }

    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .insert({
        child_id: goal.child_id,
        type: 'transfer',
        bucket,
        amount: -Math.abs(amount),
        description: `Goal: ${goal.title}`,
        chore_completion_id: null,
      })
      .select()
      .maybeSingle();
    if (txErr) throw new Error(txErr.message);
    const transaction = tx as Transaction | null;

    const { data: contrib, error: contribErr } = await supabase
      .from('goal_contributions')
      .insert({
        goal_id: goalId,
        child_id: goal.child_id,
        transaction_id: transaction?.id ?? null,
        amount,
        bucket,
        direction: 'contribute',
      })
      .select()
      .maybeSingle();
    if (contribErr) throw new Error(contribErr.message);
    if (contrib) setContributions((prev) => [...prev, contrib as GoalContribution]);
    await refreshChores();
  };

  const withdraw = async (goalId: string, contributionId: string) => {
    const contribution = contributions.find((c) => c.id === contributionId);
    if (!contribution) throw new Error('Contribution not found.');
    if (contribution.direction !== 'contribute') throw new Error('Only contributions can be withdrawn.');
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) throw new Error('Goal not found.');

    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .insert({
        child_id: contribution.child_id,
        type: 'transfer',
        bucket: contribution.bucket,
        amount: Math.abs(Number(contribution.amount)),
        description: `Goal refund: ${goal.title}`,
        chore_completion_id: null,
      })
      .select()
      .maybeSingle();
    if (txErr) throw new Error(txErr.message);
    const transaction = tx as Transaction | null;

    const { data: reversal, error: revErr } = await supabase
      .from('goal_contributions')
      .insert({
        goal_id: goalId,
        child_id: contribution.child_id,
        transaction_id: transaction?.id ?? null,
        amount: Number(contribution.amount),
        bucket: contribution.bucket,
        direction: 'withdraw',
      })
      .select()
      .maybeSingle();
    if (revErr) throw new Error(revErr.message);
    if (reversal) setContributions((prev) => [...prev, reversal as GoalContribution]);
    await refreshChores();
  };

  const completeGoal = async (goalId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) throw new Error('Goal not found.');
    if (goal.is_complete) return;
    const { data, error } = await supabase
      .from('goals')
      .update({ is_complete: true, completed_at: new Date().toISOString() })
      .eq('id', goalId)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) setGoals((prev) => prev.map((g) => (g.id === goalId ? (data as Goal) : g)));
  };

  return (
    <GoalsContext.Provider
      value={{
        loading,
        goals,
        contributions,
        progressById,
        createGoal,
        updateGoal,
        archiveGoal,
        contribute,
        withdraw,
        completeGoal,
        refresh,
      }}
    >
      {reactChildren}
    </GoalsContext.Provider>
  );
}

export function useGoals() {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error('useGoals must be used inside GoalsProvider');
  return ctx;
}
