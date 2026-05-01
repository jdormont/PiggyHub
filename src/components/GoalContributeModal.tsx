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
  kidMode?: boolean;
}

const BUCKETS: Bucket[] = ['save', 'spend', 'give'];

const BUCKET_STYLE: Record<Bucket, { emoji: string; selected: string; unselected: string }> = {
  save:  { emoji: '🐷', selected: 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white border-emerald-500 shadow-md', unselected: 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:border-emerald-300' },
  spend: { emoji: '🛍️', selected: 'bg-gradient-to-br from-sky-400 to-blue-500 text-white border-sky-500 shadow-md',    unselected: 'bg-sky-50 border-sky-200 text-sky-800 hover:border-sky-300' },
  give:  { emoji: '❤️', selected: 'bg-gradient-to-br from-rose-400 to-pink-500 text-white border-rose-400 shadow-md',   unselected: 'bg-rose-50 border-rose-200 text-rose-800 hover:border-rose-300' },
};

export function GoalContributeModal({ open, onClose, goal, kidMode }: GoalContributeModalProps) {
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
      title={kidMode ? `💰 Add to "${goal.title}"` : `Add to "${goal.title}"`}
      footer={
        kidMode ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={!valid || submitting}
              className="w-full py-4 text-base font-extrabold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 rounded-2xl transition active:scale-95 shadow-md"
            >
              {submitting ? 'Adding...' : '🎯 Add to goal'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition rounded-xl"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!valid || submitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-lg transition"
            >
              {submitting ? 'Adding' : 'Add to goal'}
            </button>
          </div>
        )
      }
    >
      <div className="space-y-4">
        <div className={`${kidMode ? 'bg-gradient-to-br from-slate-50 to-white border-slate-200' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4`}>
          <div className={`flex justify-between ${kidMode ? 'text-base font-bold text-slate-700' : 'text-sm text-slate-700'}`}>
            <span>Saved so far</span>
            <span className="font-semibold">{formatMoney(progress.contributed)}</span>
          </div>
          <div className={`flex justify-between ${kidMode ? 'text-base font-bold text-slate-500 mt-1' : 'text-sm text-slate-700'}`}>
            <span>Still to go</span>
            <span className="font-semibold">{formatMoney(progress.remaining)}</span>
          </div>
          <div className={`${kidMode ? 'mt-3 h-3' : 'mt-2 h-2'} bg-white rounded-full overflow-hidden border border-slate-100`}>
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${kidMode ? 'bg-gradient-to-r from-brand-400 to-brand-600' : 'bg-emerald-500'}`}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>

        <div>
          <label className={`block ${kidMode ? 'text-base font-extrabold text-slate-800' : 'text-sm font-medium text-slate-700'} mb-2`}>
            {kidMode ? 'Which bucket? 🪣' : 'From bucket'}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {BUCKETS.map((b) => (
              <button
                type="button"
                key={b}
                onClick={() => setBucket(b)}
                className={`rounded-2xl border-2 text-center transition ${
                  kidMode
                    ? `p-3 ${bucket === b ? BUCKET_STYLE[b].selected : BUCKET_STYLE[b].unselected}`
                    : `p-3 rounded-lg border ${bucket === b ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900' : 'border-slate-200 bg-white hover:border-slate-300'}`
                }`}
              >
                {kidMode && <div className="text-2xl mb-1">{BUCKET_STYLE[b].emoji}</div>}
                <div className={`${kidMode ? 'text-sm font-extrabold' : 'text-sm font-semibold text-slate-900'} capitalize`}>
                  {b}
                </div>
                <div className={`${kidMode ? 'text-xs font-bold mt-0.5 opacity-80' : 'text-xs text-slate-500 mt-0.5'}`}>
                  {formatMoney(balances[b])}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={`block ${kidMode ? 'text-base font-extrabold text-slate-800' : 'text-sm font-medium text-slate-700'} mb-2`}>
            {kidMode ? 'How much? 💵' : 'Amount'}
          </label>
          <div className="relative">
            <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${kidMode ? 'text-slate-500 text-xl font-bold' : 'text-slate-400'}`}>$</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={`w-full outline-none transition border rounded-2xl ${
                kidMode
                  ? 'pl-8 pr-4 py-4 text-2xl font-extrabold border-slate-200 focus:ring-2 focus:ring-brand-400 focus:border-brand-400'
                  : 'pl-7 pr-3 py-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-lg font-semibold'
              }`}
            />
          </div>
          {suggested.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {suggested.map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setAmount(String(v))}
                  className={`font-extrabold rounded-2xl transition active:scale-95 ${
                    kidMode
                      ? 'px-5 py-3 text-base bg-brand-100 text-brand-700 hover:bg-brand-200 border-2 border-brand-200'
                      : 'px-3 py-2 text-sm font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 min-h-[40px]'
                  }`}
                >
                  {formatMoney(v)}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className={`${kidMode ? 'text-base font-bold' : 'text-sm'} text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3`}>
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
