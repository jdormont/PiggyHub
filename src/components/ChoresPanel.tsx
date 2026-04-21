import { useMemo, useState } from 'react';
import { Plus, Pencil, Check, X, Flame, Trophy, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useChores } from '../context/ChoresContext';
import { Child, Chore, ChoreInput, DAYS_OF_WEEK_SHORT } from '../lib/types';
import { ChoreFormModal } from './ChoreFormModal';
import { formatMoney } from '../lib/balances';

interface ChoresPanelProps {
  child: Child;
}

export function ChoresPanel({ child }: ChoresPanelProps) {
  const { chores, completions, createChore, updateChore, archiveChore, approveCompletion, rejectCompletion } =
    useChores();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Chore | null>(null);

  const childChores = useMemo(() => chores.filter((c) => c.child_id === child.id), [chores, child.id]);
  const childCompletions = useMemo(
    () => completions.filter((c) => c.child_id === child.id),
    [completions, child.id],
  );
  const pending = useMemo(
    () => childCompletions.filter((c) => c.status === 'pending'),
    [childCompletions],
  );
  const recentHistory = useMemo(
    () => childCompletions.filter((c) => c.status !== 'pending').slice(0, 10),
    [childCompletions],
  );

  const streakByChore = useMemo(() => {
    const map: Record<string, number> = {};
    for (const chore of childChores) {
      const sorted = childCompletions
        .filter((c) => c.chore_id === chore.id && c.status === 'approved')
        .sort((a, b) => (b.reviewed_at ?? '').localeCompare(a.reviewed_at ?? ''));
      const lastReject = childCompletions
        .filter((c) => c.chore_id === chore.id && c.status === 'rejected')
        .sort((a, b) => (b.reviewed_at ?? '').localeCompare(a.reviewed_at ?? ''))[0];
      const relevant = lastReject
        ? sorted.filter((c) => (c.reviewed_at ?? '') > (lastReject.reviewed_at ?? ''))
        : sorted;
      map[chore.id] = relevant.length;
    }
    return map;
  }, [childChores, childCompletions]);

  const choreById = (id: string) => childChores.find((c) => c.id === id);

  const onSubmit = async (input: ChoreInput) => {
    if (editing) await updateChore(editing.id, input);
    else await createChore(child.id, input);
  };

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              Waiting for your approval ({pending.length})
            </h3>
          </div>
          <div className="space-y-2">
            {pending.map((c) => {
              const chore = choreById(c.chore_id);
              return (
                <PendingRow
                  key={c.id}
                  chore={chore}
                  completedAt={c.completed_at}
                  onApprove={() => approveCompletion(c.id)}
                  onReject={async () => {
                    const note = prompt('Why is this being rejected? (optional)') ?? '';
                    await rejectCompletion(c.id, note.trim());
                  }}
                />
              );
            })}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900">Active chores</h3>
          <button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition"
          >
            <Plus size={14} />
            New chore
          </button>
        </div>
        {childChores.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            No chores yet. Add the first one.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {childChores.map((chore) => (
              <li key={chore.id} className="p-4 flex items-center gap-3 bg-white hover:bg-slate-50 transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 truncate">{chore.title}</span>
                    {chore.is_milestone ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                        Milestone
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-emerald-700">
                        {formatMoney(Number(chore.value))}
                      </span>
                    )}
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                      {chore.frequency === 'weekly' && chore.day_of_week != null
                        ? `Weekly · ${DAYS_OF_WEEK_SHORT[chore.day_of_week]}`
                        : chore.frequency}
                    </span>
                    {streakByChore[chore.id] >= 2 && (
                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-orange-600">
                        <Flame size={12} />
                        {streakByChore[chore.id]}
                      </span>
                    )}
                  </div>
                  {chore.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{chore.description}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setEditing(chore);
                    setModalOpen(true);
                  }}
                  className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition"
                  aria-label="Edit chore"
                >
                  <Pencil size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {recentHistory.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Trophy size={15} className="text-slate-500" />
            Recent history
          </h3>
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {recentHistory.map((c) => {
              const chore = choreById(c.chore_id);
              const approved = c.status === 'approved';
              return (
                <li key={c.id} className="p-3 flex items-center gap-3 bg-white text-sm">
                  {approved ? (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle size={16} className="text-rose-600 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">
                      {chore?.title ?? 'Chore'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {approved ? 'Approved' : 'Rejected'} ·{' '}
                      {new Date(c.reviewed_at ?? c.completed_at).toLocaleDateString()}
                      {c.rejection_note ? ` — "${c.rejection_note}"` : ''}
                    </div>
                  </div>
                  {approved && chore && !chore.is_milestone && (
                    <span className="text-sm font-semibold text-emerald-700">
                      +{formatMoney(Number(chore.value))}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <ChoreFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={onSubmit}
        onArchive={editing ? () => archiveChore(editing.id) : undefined}
        initial={editing}
      />
    </div>
  );
}

function PendingRow({
  chore,
  completedAt,
  onApprove,
  onReject,
}: {
  chore: Chore | undefined;
  completedAt: string;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="p-3 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-900 truncate">{chore?.title ?? 'Chore'}</div>
        <div className="text-xs text-slate-600">
          Marked done {new Date(completedAt).toLocaleString()}
          {chore && !chore.is_milestone && (
            <> · {formatMoney(Number(chore.value))}</>
          )}
        </div>
      </div>
      <button
        onClick={() => run(onReject)}
        disabled={busy}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg transition disabled:opacity-50"
      >
        <X size={13} />
        Reject
      </button>
      <button
        onClick={() => run(onApprove)}
        disabled={busy}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50"
      >
        <Check size={13} />
        Approve
      </button>
    </div>
  );
}
