import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Flame, Star, XCircle } from 'lucide-react';
import { Child, Chore } from '../lib/types';
import { useChores } from '../context/ChoresContext';
import { formatMoney } from '../lib/balances';

interface KidChoresListProps {
  child: Child;
}

export function KidChoresList({ child }: KidChoresListProps) {
  const { chores, completions, markDone } = useChores();
  const [busyId, setBusyId] = useState<string | null>(null);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark done');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
        My chores
      </h2>

      {childChores.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
          No chores yet. Check back soon!
        </div>
      ) : (
        <ul className="space-y-3">
          {childChores.map((chore) => {
            const isPending = !!pendingByChore[chore.id];
            const streak = streakByChore[chore.id] ?? 0;
            return (
              <li
                key={chore.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 text-lg truncate">{chore.title}</span>
                    {chore.is_milestone ? (
                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        <Star size={11} /> Milestone
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-emerald-700">
                        {formatMoney(Number(chore.value))}
                      </span>
                    )}
                    {streak >= 2 && (
                      <span className="inline-flex items-center gap-0.5 text-xs font-bold text-orange-600">
                        <Flame size={12} />
                        {streak} streak
                      </span>
                    )}
                  </div>
                  {chore.description && (
                    <p className="text-sm text-slate-500 mt-0.5">{chore.description}</p>
                  )}
                </div>
                {isPending ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl">
                    <Clock size={15} />
                    Waiting
                  </span>
                ) : (
                  <button
                    onClick={() => tap(chore)}
                    disabled={busyId === chore.id}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-xl transition active:scale-95"
                  >
                    <CheckCircle2 size={16} />
                    {busyId === chore.id ? 'Sending' : 'Mark done'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Recent</h3>
          <ul className="space-y-2">
            {recent.map((c) => {
              const chore = childChores.find((ch) => ch.id === c.chore_id);
              const approved = c.status === 'approved';
              return (
                <li
                  key={c.id}
                  className="flex items-center gap-2 text-sm text-slate-700 bg-white rounded-xl border border-slate-100 px-3 py-2"
                >
                  {approved ? (
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle size={14} className="text-rose-500 shrink-0" />
                  )}
                  <span className="flex-1 truncate">{chore?.title ?? 'Chore'}</span>
                  <span className="text-xs text-slate-500">
                    {approved ? 'Approved' : 'Rejected'}
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
