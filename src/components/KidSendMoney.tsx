import { useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { Child } from '../lib/types';
import { useFamily } from '../context/FamilyContext';
import { useChores } from '../context/ChoresContext';
import { useToast } from './Toast';
import { SendMoneyModal } from './SendMoneyModal';
import { formatMoney } from '../lib/balances';

const STATUS_STYLE = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
} as const;

const STATUS_LABEL = {
  pending: 'Waiting for a parent',
  approved: 'Sent!',
  rejected: 'Not this time',
} as const;

export function KidSendMoney({ child }: { child: Child }) {
  const { children } = useFamily();
  const { transferRequests } = useChores();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  const siblings = useMemo(() => children.filter((c) => c.id !== child.id), [children, child.id]);
  const mine = useMemo(
    () => transferRequests.filter((r) => r.sender_child_id === child.id).slice(0, 5),
    [transferRequests, child.id],
  );

  if (siblings.length === 0) return null;

  return (
    <div>
      <h2 className="text-3xl font-black text-slate-900 mb-4">Send to a sibling 💌</h2>
      <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm space-y-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full inline-flex items-center justify-center gap-2 py-4 text-base font-extrabold text-white bg-brand-600 hover:bg-brand-700 rounded-2xl transition active:scale-95 shadow-md"
        >
          <Send size={18} />
          Send money
        </button>
        {mine.length > 0 && (
          <ul className="space-y-2">
            {mine.map((r) => {
              const to = children.find((c) => c.id === r.recipient_child_id);
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold text-slate-700 truncate">
                    {formatMoney(Number(r.amount))} → {to?.avatar} {to?.name ?? 'Sibling'}
                  </span>
                  <span className={`shrink-0 text-xs font-extrabold rounded-full px-2.5 py-1 ${STATUS_STYLE[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <SendMoneyModal
        open={open}
        onClose={() => setOpen(false)}
        sender={child}
        siblings={siblings}
        onSent={(r) => toast.success(`Request to send money to ${r.name} is waiting for a parent!`)}
      />
    </div>
  );
}
