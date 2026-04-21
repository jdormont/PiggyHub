import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { Bucket, Goal } from '../lib/types';
import { useGoals } from '../context/GoalsContext';
import { useChores } from '../context/ChoresContext';
import { formatMoney } from '../lib/balances';

interface GoalContributeModalProps {
  open: boolean;
  onClose: () => void;
  goal: Goal;
}

const BUCKETS: Bucket[] = ['save', 'spend', 'give'];

export function GoalContributeModal({ open, onClose, goal }: GoalContributeModalProps) {
  const { contribute, progressById } = useGoals();
  const { balancesByChild } = useChores();
  const balances = balancesByChild[goal.child_id] ?? { spend: 0, save: 0, give: 0, total: 0 };
  const progress = progressById[goal.id] ?? { contributed: 0, percent: 0, remaining: Number(goal.target_amount), complete: false };

  const [amount, setAmount] = useState<string>('');
  const [bucket, setBucket] = useState<Bucket>('save');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount('');
    setBucket('save');
    setError(null);
  }, [open]);

  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed > 0 && parsed <= balances[bucket];
  const suggested = useMemo(() => {
    const remaining = progress.remaining;
    const options = [1, 5, 10, remaining].filter((v, i, arr) => v > 0 && v <= balances[bucket] && arr.indexOf(v) === i);
    return options.slice(0, 4);
  }, [balances, bucket, progress.remaining]);

  const submit = async () => {
    if (!valid) {
      setError('Not enough in that bucket for this amount.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await contribute(goal.id, parsed, bucket);
      onClose();
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
      title={`Add to "${goal.title}"`}
      footer={
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!valid || submitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-lg transition"
          >
            {submitting ? 'Adding' : 'Add to goal'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm">
          <div className="flex justify-between text-slate-700">
            <span>Saved so far</span>
            <span className="font-semibold">{formatMoney(progress.contributed)}</span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span>Still to go</span>
            <span className="font-semibold">{formatMoney(progress.remaining)}</span>
          </div>
          <div className="mt-2 h-2 bg-white rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-[width] duration-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">From bucket</label>
          <div className="grid grid-cols-3 gap-2">
            {BUCKETS.map((b) => (
              <button
                key={b}
                onClick={() => setBucket(b)}
                className={`p-3 rounded-lg border text-center transition ${
                  bucket === b
                    ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="text-sm font-semibold text-slate-900 capitalize">{b}</div>
                <div className="text-xs text-slate-500 mt-0.5">{formatMoney(balances[b])}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition text-lg font-semibold"
            />
          </div>
          {suggested.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {suggested.map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(String(v))}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  {formatMoney(v)}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
