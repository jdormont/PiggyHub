import { useState } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { useChores } from '../context/ChoresContext';
import { useToast } from './Toast';
import { formatMoney } from '../lib/balances';

/** Parent-side queue of kid-to-kid transfer requests awaiting approval. */
export function TransferRequestsPanel() {
  const { children } = useFamily();
  const { transferRequests, balancesByChild, approveKidTransfer, rejectKidTransfer } = useChores();
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending = transferRequests.filter((r) => r.status === 'pending');
  if (pending.length === 0) return null;

  const run = async (id: string, fn: () => Promise<void>, okMsg: string) => {
    setBusyId(id);
    try {
      await fn();
      toast.success(okMsg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mb-8 bg-white border border-amber-200 rounded-3xl p-5 shadow-sm">
      <h2 className="text-sm font-extrabold text-slate-900 mb-3">
        Money transfers waiting for approval ({pending.length})
      </h2>
      <div className="space-y-2">
        {pending.map((r) => {
          const from = children.find((c) => c.id === r.sender_child_id);
          const to = children.find((c) => c.id === r.recipient_child_id);
          const short = from ? Number(r.amount) > (balancesByChild[from.id]?.[r.bucket] ?? 0) : false;
          return (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-stone-50 border border-stone-200 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span>{from?.avatar} {from?.name}</span>
                  <ArrowRight size={14} className="text-slate-400" />
                  <span>{to?.avatar} {to?.name}</span>
                  <span className="text-brand-700">{formatMoney(Number(r.amount))}</span>
                </div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  From {from?.name}'s {r.bucket} bucket
                  {r.message ? ` · “${r.message}”` : ''}
                  {short ? ' · not enough in bucket right now' : ''}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => run(r.id, () => rejectKidTransfer(r.id, ''), 'Request declined')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-full disabled:opacity-40"
                >
                  <X size={14} /> Decline
                </button>
                <button
                  type="button"
                  disabled={busyId === r.id || short}
                  onClick={() =>
                    run(r.id, () => approveKidTransfer(r.id), `${formatMoney(Number(r.amount))} sent to ${to?.name ?? 'sibling'}!`)
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-full disabled:opacity-40"
                >
                  <Check size={14} /> Approve
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
