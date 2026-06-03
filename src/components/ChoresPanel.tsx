import { useMemo, useState } from 'react';
import { Plus, Pencil, Check, X, Flame, Trophy, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useChores } from '../context/ChoresContext';
import { useToast } from './Toast';
import { Child, Chore, ChoreInput, DAYS_OF_WEEK_SHORT } from '../lib/types';
import { ChoreFormModal } from './ChoreFormModal';
import { formatMoney } from '../lib/balances';

interface ChoresPanelProps {
  child: Child;
}

export function ChoresPanel({ child }: ChoresPanelProps) {
  const { chores, completions, createChore, updateChore, archiveChore, approveCompletion, rejectCompletion } =
    useChores();
  const toast = useToast();
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
            <Clock size={15} className="text-amber-500" />
            <h3 className="text-sm font-extrabold text-slate-900">
              Waiting for approval ({pending.length})
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
                  onApprove={async () => {
                    await approveCompletion(c.id);
                    toast.success(`${chore?.title ?? 'Chore'} approved!`);
                  }}
                  onReject={async (note) => {
                    await rejectCompletion(c.id, note);
                    toast.info(`${chore?.title ?? 'Chore'} rejected.`);
                  }}
                />
              );
            })}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-slate-900">Active chores</h3>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-full transition-all shadow-sm active:scale-95"
          >
            <Plus size={14} />
            New chore
          </button>
        </div>
        {childChores.length === 0 ? (
          <div className="py-12 text-center text-sm font-semibold text-slate-400 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200">
            No chores yet — add the first one!
          </div>
        ) : (
          <ul className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden">
            {childChores.map((chore) => (
              <li key={chore.id} className="p-4 flex items-center gap-3 bg-white hover:bg-stone-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 truncate">{chore.title}</span>
                    {chore.is_milestone ? (
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        Milestone
                      </span>
                    ) : (
                      <span className="text-sm font-extrabold text-emerald-600">
                        {formatMoney(Number(chore.value))}
                      </span>
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-stone-100 px-2 py-0.5 rounded-full">
                      {chore.frequency === 'weekly'
                        ? chore.day_of_week != null
                          ? `Weekly · ${DAYS_OF_WEEK_SHORT[chore.day_of_week]}`
                          : 'Weekly · Any day'
                        : chore.frequency}
                    </span>
                    {streakByChore[chore.id] >= 2 && (
                      <span className="inline-flex items-center gap-0.5 text-xs font-extrabold text-orange-500">
                        <Flame size={12} />
                        {streakByChore[chore.id]}
                      </span>
                    )}
                  </div>
                  {chore.description && (
                    <p className="text-xs text-slate-400 font-medium mt-0.5 line-clamp-1">{chore.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(chore);
                    setModalOpen(true);
                  }}
                  className="p-2 text-slate-400 hover:bg-stone-100 hover:text-slate-700 rounded-xl transition-colors"
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
          <h3 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2">
            <Trophy size={14} className="text-amber-500" />
            Recent history
          </h3>
          <ul className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden">
            {recentHistory.map((c) => {
              const chore = choreById(c.chore_id);
              const approved = c.status === 'approved';
              return (
                <li key={c.id} className="p-3 flex items-center gap-3 bg-white text-sm">
                  {approved ? (
                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle size={15} className="text-rose-400 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 truncate">
                      {chore?.title ?? 'Chore'}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">
                      {approved ? 'Approved' : 'Rejected'} ·{' '}
                      {new Date(c.reviewed_at ?? c.completed_at).toLocaleDateString()}
                      {c.rejection_note ? ` — "${c.rejection_note}"` : ''}
                    </div>
                  </div>
                  {approved && chore && !chore.is_milestone && (
                    <span className="text-sm font-extrabold text-emerald-600">
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
  onReject: (note: string) => Promise<void>;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  if (rejecting) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
        <div className="font-bold text-slate-900 truncate">{chore?.title ?? 'Chore'}</div>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">
            Reason for rejection <span className="font-normal">(optional)</span>
          </label>
          <input
            autoFocus
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') run(() => onReject(note.trim())).then(() => { setRejecting(false); setNote(''); });
              if (e.key === 'Escape') { setRejecting(false); setNote(''); }
            }}
            placeholder="e.g. Didn't clean under the bed"
            className="w-full border border-rose-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setRejecting(false); setNote(''); }}
            disabled={busy}
            className="flex-1 inline-flex items-center justify-center px-3 py-2.5 text-sm font-bold text-slate-600 bg-white border border-stone-200 hover:bg-stone-50 rounded-xl transition-all disabled:opacity-50 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => run(() => onReject(note.trim())).then(() => { setRejecting(false); setNote(''); })}
            disabled={busy}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-all disabled:opacity-50 min-h-[44px]"
          >
            <X size={14} />
            {busy ? 'Rejecting…' : 'Confirm reject'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
      <div className="flex-1 min-w-0">
        <div className="font-bold text-slate-900 truncate">{chore?.title ?? 'Chore'}</div>
        <div className="text-xs text-slate-500 font-medium mt-0.5">
          Marked done {new Date(completedAt).toLocaleString()}
          {chore && !chore.is_milestone && (
            <> · {formatMoney(Number(chore.value))}</>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setRejecting(true)}
          disabled={busy}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-bold text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-50 min-h-[44px]"
        >
          <X size={14} />
          Reject
        </button>
        <button
          type="button"
          onClick={() => run(onApprove)}
          disabled={busy}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all disabled:opacity-50 min-h-[44px]"
        >
          <Check size={14} />
          {busy ? 'Approving…' : 'Approve'}
        </button>
      </div>
    </div>
  );
}
