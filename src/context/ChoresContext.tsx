import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Balances, Bucket, Chore, ChoreCompletion, ChoreInput, Transaction, TxType } from '../lib/types';
import { emptyBalances, splitEarning } from '../lib/balances';
import { buildApprovalPlan } from '../lib/choreApproval';
import { useFamily } from './FamilyContext';

export interface AddMoneyInput {
  childId: string;
  amount: number;
  mode: 'split' | 'bucket';
  bucket?: Bucket;
  description: string;
  type?: TxType;
}

export interface SpendInput {
  childId: string;
  amount: number;
  bucket: Bucket;
  description: string;
  category?: string;
}

export interface TransferInput {
  childId: string;
  from: Bucket;
  to: Bucket;
  amount: number;
  description?: string;
}

function advanceAllowanceDate(current: string | null, freq: 'weekly' | 'biweekly' | 'monthly'): string {
  const base = current ? new Date(current + 'T00:00:00Z') : new Date();
  if (freq === 'weekly') base.setUTCDate(base.getUTCDate() + 7);
  else if (freq === 'biweekly') base.setUTCDate(base.getUTCDate() + 14);
  else base.setUTCMonth(base.getUTCMonth() + 1);
  return base.toISOString().slice(0, 10);
}

interface ChoresContextValue {
  loading: boolean;
  chores: Chore[];
  completions: ChoreCompletion[];
  transactions: Transaction[];
  balancesByChild: Record<string, Balances>;
  pendingCount: number;
  createChore: (childId: string, input: ChoreInput) => Promise<Chore>;
  updateChore: (id: string, input: Partial<ChoreInput>) => Promise<Chore>;
  archiveChore: (id: string) => Promise<void>;
  markDone: (chore: Chore) => Promise<ChoreCompletion>;
  approveCompletion: (completionId: string) => Promise<void>;
  rejectCompletion: (completionId: string, note: string) => Promise<void>;
  addMoney: (input: AddMoneyInput) => Promise<void>;
  recordSpend: (input: SpendInput) => Promise<void>;
  transferMoney: (input: TransferInput) => Promise<void>;
  payAllowance: (childId: string) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const ChoresContext = createContext<ChoresContextValue | undefined>(undefined);

export function ChoresProvider({ children: reactChildren }: { children: ReactNode }) {
  const { family, children: kids, updateChild } = useFamily();
  const [chores, setChores] = useState<Chore[]>([]);
  const [completions, setCompletions] = useState<ChoreCompletion[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const childIds = useMemo(() => kids.map((c) => c.id), [kids]);

  const refresh = useCallback(async () => {
    if (!family || childIds.length === 0) {
      setChores([]);
      setCompletions([]);
      setTransactions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [choresRes, completionsRes, txRes] = await Promise.all([
      supabase.from('chores').select('*').in('child_id', childIds).eq('is_active', true).order('created_at'),
      supabase.from('chore_completions').select('*').in('child_id', childIds).order('completed_at', { ascending: false }),
      supabase.from('transactions').select('*').in('child_id', childIds).order('created_at', { ascending: false }),
    ]);
    setChores((choresRes.data ?? []) as Chore[]);
    setCompletions((completionsRes.data ?? []) as ChoreCompletion[]);
    setTransactions((txRes.data ?? []) as Transaction[]);
    setLoading(false);
  }, [family, childIds]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const balancesByChild = useMemo(() => {
    const map: Record<string, Balances> = {};
    for (const k of kids) map[k.id] = emptyBalances();
    for (const t of transactions) {
      const b = map[t.child_id];
      if (!b) continue;
      const a = Number(t.amount);
      b[t.bucket] += a;
      b.total += a;
    }
    return map;
  }, [kids, transactions]);

  const pendingCount = useMemo(
    () => completions.filter((c) => c.status === 'pending').length,
    [completions],
  );

  const createChore = async (childId: string, input: ChoreInput): Promise<Chore> => {
    const { data, error } = await supabase
      .from('chores')
      .insert({ ...input, child_id: childId })
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Could not create chore.');
    setChores((prev) => [...prev, data as Chore]);
    return data as Chore;
  };

  const updateChore = async (id: string, input: Partial<ChoreInput>): Promise<Chore> => {
    const { data, error } = await supabase.from('chores').update(input).eq('id', id).select().maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Could not update chore.');
    setChores((prev) => prev.map((c) => (c.id === id ? (data as Chore) : c)));
    return data as Chore;
  };

  const archiveChore = async (id: string) => {
    const { error } = await supabase.from('chores').update({ is_active: false }).eq('id', id);
    if (error) throw new Error(error.message);
    setChores((prev) => prev.filter((c) => c.id !== id));
  };

  const markDone = async (chore: Chore): Promise<ChoreCompletion> => {
    const { data, error } = await supabase
      .from('chore_completions')
      .insert({
        chore_id: chore.id,
        child_id: chore.child_id,
        status: 'pending',
      })
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Could not submit completion.');
    setCompletions((prev) => [data as ChoreCompletion, ...prev]);
    return data as ChoreCompletion;
  };

  const approveCompletion = async (completionId: string) => {
    const completion = completions.find((c) => c.id === completionId);
    if (!completion) throw new Error('Completion not found.');
    if (completion.status !== 'pending') throw new Error('Already reviewed.');
    const chore = chores.find((ch) => ch.id === completion.chore_id);
    if (!chore) throw new Error('Chore not found.');
    const child = kids.find((k) => k.id === completion.child_id);
    if (!child) throw new Error('Child not found.');

    const plan = buildApprovalPlan(chore, child, completions, completionId);

    const nowIso = new Date().toISOString();
    const { data: updated, error: updErr } = await supabase
      .from('chore_completions')
      .update({ status: 'approved', reviewed_at: nowIso, streak_count: plan.streak })
      .eq('id', completionId)
      .select()
      .maybeSingle();
    if (updErr) throw new Error(updErr.message);
    if (!updated) throw new Error('Could not approve completion.');

    const rows: Transaction[] = [];
    if (plan.transactions.length > 0) {
      const { data: txs, error: txErr } = await supabase
        .from('transactions')
        .insert(plan.transactions)
        .select();
      if (txErr) throw new Error(txErr.message);
      rows.push(...((txs ?? []) as Transaction[]));
    }

    setCompletions((prev) => prev.map((c) => (c.id === completionId ? (updated as ChoreCompletion) : c)));
    if (rows.length) setTransactions((prev) => [...rows, ...prev]);
  };

  const insertTransactions = async (rows: Omit<Transaction, 'id' | 'created_at'>[]): Promise<Transaction[]> => {
    if (rows.length === 0) return [];
    const { data, error } = await supabase.from('transactions').insert(rows).select();
    if (error) throw new Error(error.message);
    const inserted = (data ?? []) as Transaction[];
    if (inserted.length) setTransactions((prev) => [...inserted, ...prev]);
    return inserted;
  };

  const addMoney = async ({ childId, amount, mode, bucket, description, type = 'earn' }: AddMoneyInput) => {
    if (!(amount > 0)) throw new Error('Enter an amount greater than $0.');
    const child = kids.find((k) => k.id === childId);
    if (!child) throw new Error('Child not found.');
    if (mode === 'bucket') {
      if (!bucket) throw new Error('Pick a bucket.');
      await insertTransactions([
        {
          child_id: childId,
          type,
          bucket,
          amount,
          description: description || 'Added funds',
          category: null,
          chore_completion_id: null,
        },
      ]);
    } else {
      const split = splitEarning(amount, child);
      const rows = (['spend', 'save', 'give'] as Bucket[])
        .map((b) => ({ bucket: b, amount: split[b] }))
        .filter((r) => r.amount > 0)
        .map((r) => ({
          child_id: childId,
          type,
          bucket: r.bucket,
          amount: r.amount,
          description: description || 'Added funds',
          category: null,
          chore_completion_id: null,
        }));
      await insertTransactions(rows);
    }
  };

  const recordSpend = async ({ childId, amount, bucket, description, category }: SpendInput) => {
    if (!(amount > 0)) throw new Error('Enter an amount greater than $0.');
    await insertTransactions([
      {
        child_id: childId,
        type: 'spend',
        bucket,
        amount: -Math.abs(amount),
        description: description || 'Purchase',
        category: category ?? null,
        chore_completion_id: null,
      },
    ]);
  };

  const transferMoney = async ({ childId, from, to, amount, description }: TransferInput) => {
    if (!(amount > 0)) throw new Error('Enter an amount greater than $0.');
    if (from === to) throw new Error('Pick two different buckets.');
    const label = description || `Transfer ${from} -> ${to}`;
    await insertTransactions([
      {
        child_id: childId,
        type: 'transfer',
        bucket: from,
        amount: -Math.abs(amount),
        description: label,
        category: null,
        chore_completion_id: null,
      },
      {
        child_id: childId,
        type: 'transfer',
        bucket: to,
        amount: Math.abs(amount),
        description: label,
        category: null,
        chore_completion_id: null,
      },
    ]);
  };

  const payAllowance = async (childId: string) => {
    const child = kids.find((k) => k.id === childId);
    if (!child) throw new Error('Child not found.');
    if (child.allowance_frequency === 'none' || Number(child.allowance_amount) <= 0) {
      throw new Error('No allowance configured for this child.');
    }
    const amount = Number(child.allowance_amount);
    const split = splitEarning(amount, child);
    const rows = (['spend', 'save', 'give'] as Bucket[])
      .map((b) => ({ bucket: b, amount: split[b] }))
      .filter((r) => r.amount > 0)
      .map((r) => ({
        child_id: childId,
        type: 'allowance' as const,
        bucket: r.bucket,
        amount: r.amount,
        description: 'Allowance',
        category: null,
        chore_completion_id: null,
      }));
    await insertTransactions(rows);
    const nextDate = advanceAllowanceDate(child.allowance_next_date, child.allowance_frequency);
    await updateChild(child.id, { allowance_next_date: nextDate });
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const rejectCompletion = async (completionId: string, note: string) => {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('chore_completions')
      .update({ status: 'rejected', reviewed_at: nowIso, rejection_note: note || null })
      .eq('id', completionId)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Could not reject completion.');
    setCompletions((prev) => prev.map((c) => (c.id === completionId ? (data as ChoreCompletion) : c)));
  };

  return (
    <ChoresContext.Provider
      value={{
        loading,
        chores,
        completions,
        transactions,
        balancesByChild,
        pendingCount,
        createChore,
        updateChore,
        archiveChore,
        markDone,
        approveCompletion,
        rejectCompletion,
        addMoney,
        recordSpend,
        transferMoney,
        payAllowance,
        deleteTransaction,
        refresh,
      }}
    >
      {reactChildren}
    </ChoresContext.Provider>
  );
}

export function useChores() {
  const ctx = useContext(ChoresContext);
  if (!ctx) throw new Error('useChores must be used inside ChoresProvider');
  return ctx;
}
