import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Bucket, Child } from '../lib/types';
import { useChores } from '../context/ChoresContext';
import { formatMoney } from '../lib/balances';
import { validateKidTransfer } from '../lib/kidTransfer';

interface SendMoneyModalProps {
  open: boolean;
  onClose: () => void;
  sender: Child;
  siblings: Child[];
  onSent?: (recipient: Child) => void;
}

const BUCKETS: Bucket[] = ['spend', 'save', 'give'];

export function SendMoneyModal({ open, onClose, sender, siblings, onSent }: SendMoneyModalProps) {
  const { balancesByChild, requestKidTransfer } = useChores();
  const balances = balancesByChild[sender.id] ?? { spend: 0, save: 0, give: 0, total: 0 };

  const [recipientId, setRecipientId] = useState('');
  const [bucket, setBucket] = useState<Bucket>('spend');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRecipientId(siblings.length === 1 ? siblings[0].id : '');
    setBucket('spend');
    setAmount('');
    setMessage('');
    setError(null);
  }, [open, siblings]);

  const parsed = Number(amount);
  const problem = validateKidTransfer({ senderId: sender.id, recipientId, bucket, amount: parsed }, balances);

  const submit = async () => {
    if (problem) {
      setError(problem);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await requestKidTransfer({ senderId: sender.id, recipientId, bucket, amount: parsed, message });
      const recipient = siblings.find((s) => s.id === recipientId);
      onClose();
      if (recipient) onSent?.(recipient);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="💌 Send money to a sibling"
      footer={
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={!!problem || submitting}
            className="w-full py-4 text-base font-extrabold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-40 rounded-2xl transition active:scale-95 shadow-md"
          >
            {submitting ? 'Sending...' : '📨 Ask a parent to send it'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition rounded-xl"
          >
            Cancel
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <p className="text-sm font-bold text-slate-500">
          A parent has to say yes before the money moves.
        </p>

        <div>
          <label className="block text-base font-extrabold text-slate-800 mb-2">Who gets it?</label>
          <div className="grid grid-cols-2 gap-2">
            {siblings.map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => setRecipientId(s.id)}
                className={`rounded-2xl border-2 p-3 text-center transition ${
                  recipientId === s.id
                    ? 'border-brand-500 bg-brand-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="text-3xl">{s.avatar}</div>
                <div className="text-sm font-extrabold text-slate-800 mt-1">{s.name}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-base font-extrabold text-slate-800 mb-2">From which bucket?</label>
          <div className="grid grid-cols-3 gap-2">
            {BUCKETS.map((b) => (
              <button
                type="button"
                key={b}
                onClick={() => setBucket(b)}
                className={`rounded-2xl border-2 p-3 text-center transition ${
                  bucket === b ? 'border-brand-500 bg-brand-50 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="text-sm font-extrabold capitalize text-slate-800">{b}</div>
                <div className="text-xs font-bold text-slate-500 mt-0.5">{formatMoney(balances[b])}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-base font-extrabold text-slate-800 mb-2">How much? 💵</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xl font-bold">$</span>
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full outline-none transition border rounded-2xl pl-8 pr-4 py-4 text-2xl font-extrabold border-slate-200 focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-base font-extrabold text-slate-800 mb-2">Add a note (optional)</label>
          <input
            type="text"
            maxLength={120}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Happy birthday!"
            className="w-full outline-none border border-slate-200 rounded-2xl px-4 py-3 text-base font-bold focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
          />
        </div>

        {error && (
          <div className="text-base font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
