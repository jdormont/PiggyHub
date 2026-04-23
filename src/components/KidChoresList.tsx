import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Flame, Star, XCircle, Zap } from 'lucide-react';
import { Child, Chore, ChoreCompletion } from '../lib/types';
import { useChores } from '../context/ChoresContext';
import { formatMoney } from '../lib/balances';

interface KidChoresListProps {
  child: Child;
}

function isDueToday(chore: Chore): boolean {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const jsDay = today.getDay();

  switch (chore.frequency) {
    case 'daily':
      return true;
    case 'weekly':
      return chore.day_of_week === jsDay;
    case 'once':
    case 'monthly':
      return chore.due_date !== null && chore.due_date <= todayStr;
    default:
      return false;
  }
}

function isApprovedThisPeriod(chore: Chore, completions: ChoreCompletion[]): boolean {
  const approved = completions.filter((c) => c.chore_id === chore.id && c.status === 'approved');
  const todayStr = new Date().toISOString().slice(0, 10);

  if (chore.frequency === 'weekly') {
    return approved.some((c) => c.completed_at.slice(0, 10) === todayStr);
  }
  if (chore.frequency === 'once') {
    return approved.length > 0;
  }
  if (chore.frequency === 'monthly') {
    const yearMonth = todayStr.slice(0, 7);
    return approved.some((c) => c.completed_at.slice(0, 7) === yearMonth);
  }
  return false;
}

function isOverdue(chore: Chore): boolean {
  if (chore.frequency === 'once' || chore.frequency === 'monthly') {
    const todayStr = new Date().toISOString().slice(0, 10);
    return chore.due_date !== null && chore.due_date < todayStr;
  }
  return false;
}

export function KidChoresList({ child }: KidChoresListProps) {
  const { chores, completions, markDone } = useChores();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [justDoneId, setJustDoneId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const childChores = useMemo(() => chores.filter((c) => c.child_id === child.id), [chores, child.id]);
  const childCompletions = useMemo(
    () => completions.filter((c) => c.child_id === child.id),
    [completions, child.id],
  );

  const pendingByChore = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const c of childCompletions) if (c.status === 'pending') map[c.chore_id] = true;
    return map;
  }, [childCompletions]);

  const streakByChore = useMemo(() => {
    const map: Record<string, number> = {};
    for (const chore of childChores) {
      const approved = childCompletions
        .filter((c) => c.chore_id === chore.id && c.status === 'approved')
        .sort((a, b) => (b.reviewed_at ?? '').localeCompare(a.reviewed_at ?? ''));
      const lastReject = childCompletions
        .filter((c) => c.chore_id === chore.id && c.status === 'rejected')
        .sort((a, b) => (b.reviewed_at ?? '').localeCompare(a.reviewed_at ?? ''))[0];
      const relevant = lastReject
        ? approved.filter((c) => (c.reviewed_at ?? '') > (lastReject.reviewed_at ?? ''))
        : approved;
      map[chore.id] = relevant.length;
    }
    return map;
  }, [childChores, childCompletions]);

  // Only show: daily chores + chores due today that haven't been approved for this period
  const feedChores = useMemo(() => {
    return childChores.filter((chore) => {
      if (chore.frequency === 'daily') return true;
      if (!isDueToday(chore)) return false;
      return !isApprovedThisPeriod(chore, childCompletions);
    });
  }, [childChores, childCompletions]);

  const sortedChores = useMemo(() => {
    return [...feedChores].sort((a, b) => {
      const aToday = isDueToday(a) ? 0 : 1;
      const bToday = isDueToday(b) ? 0 : 1;
      return aToday - bToday;
    });
  }, [feedChores]);

  const dueTodayCount = useMemo(
    () => feedChores.filter((c) => isDueToday(c) && !pendingByChore[c.id]).length,
    [feedChores, pendingByChore],
  );

  const recent = useMemo(
    () => childCompletions.filter((c) => c.status !== 'pending').slice(0, 5),
    [childCompletions],
  );

  const tap = async (chore: Chore) => {
    if (busyId) return;
    setBusyId(chore.id);
    setError(null);
    try {
      await markDone(chore);
      setJustDoneId(chore.id);
      setTimeout(() => setJustDoneId(null), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark done');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-slate-900">My chores</h2>
        {dueTodayCount > 0 && (
          <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-amber-700 bg-amber-100 rounded-full px-4 py-1.5">
            <Zap size={14} />
            {dueTodayCount} due today!
          </span>
        )}
      </div>

      {sortedChores.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-10 text-center text-slate-400 font-bold">
          No chores yet — check back soon!
        </div>
      ) : (
        <ul className="space-y-3">
          {sortedChores.map((chore) => {
            const isPending = !!pendingByChore[chore.id];
            const streak = streakByChore[chore.id] ?? 0;
            const dueToday = isDueToday(chore);
            const overdue = isOverdue(chore);
            const justDone = justDoneId === chore.id;

            let cardStyle = 'bg-white border-stone-200';
            if (justDone) cardStyle = 'bg-emerald-50 border-emerald-300';
            else if (dueToday && !isPending && overdue) cardStyle = 'bg-rose-50 border-rose-200';
            else if (dueToday && !isPending) cardStyle = 'bg-amber-50 border-amber-200';

            return (
              <li
                key={chore.id}
                className={`rounded-3xl border-2 px-5 py-4 flex items-center gap-4 transition-all duration-200 ${cardStyle}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-slate-900 text-xl truncate">
                      {chore.title}
                    </span>
                    {chore.is_milestone ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                        <Star size={11} /> Milestone
                      </span>
                    ) : (
                      <span className="text-base font-extrabold text-emerald-600">
                        {formatMoney(Number(chore.value))}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {streak >= 2 && (
                      <span className="inline-flex items-center gap-0.5 text-sm font-extrabold text-orange-500">
                        <Flame size={14} />
                        {streak} streak!
                      </span>
                    )}
                    {dueToday && !isPending && (
                      <span className={`text-sm font-extrabold ${overdue ? 'text-rose-600' : 'text-amber-600'}`}>
                        {overdue ? '⚠️ Overdue' : '⏰ Due today'}
                      </span>
                    )}
                    {chore.description && (
                      <p className="text-sm text-slate-400 font-medium">{chore.description}</p>
                    )}
                  </div>
                </div>

                {justDone ? (
                  <span className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-extrabold text-emerald-700 bg-emerald-100 rounded-2xl shrink-0">
                    <CheckCircle2 size={18} />
                    Done! 🎉
                  </span>
                ) : isPending ? (
                  <span className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-extrabold text-amber-700 bg-amber-100 rounded-2xl shrink-0">
                    <Clock size={16} />
                    Waiting…
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => tap(chore)}
                    disabled={!!busyId}
                    className={`inline-flex items-center gap-2 px-5 py-3.5 text-base font-extrabold text-white rounded-2xl transition-all active:scale-95 disabled:opacity-60 shadow-sm shrink-0 ${
                      dueToday
                        ? overdue
                          ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'
                          : 'bg-amber-500 hover:bg-amber-600 shadow-amber-200'
                        : 'bg-slate-800 hover:bg-slate-900'
                    }`}
                  >
                    <CheckCircle2 size={20} />
                    {busyId === chore.id ? 'Sending…' : 'Mark done'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <div className="text-sm font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
          {error}
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <h3 className="text-lg font-extrabold text-slate-700 mb-3">Recently done</h3>
          <ul className="space-y-2">
            {recent.map((c) => {
              const chore = childChores.find((ch) => ch.id === c.chore_id);
              const approved = c.status === 'approved';
              return (
                <li
                  key={c.id}
                  className="flex items-center gap-3 text-sm font-bold text-slate-700 bg-white rounded-2xl border border-stone-100 px-4 py-3"
                >
                  {approved ? (
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle size={16} className="text-rose-400 shrink-0" />
                  )}
                  <span className="flex-1 truncate">{chore?.title ?? 'Chore'}</span>
                  <span className={`text-xs font-extrabold ${approved ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {approved ? '✓ Approved' : '✗ Rejected'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
