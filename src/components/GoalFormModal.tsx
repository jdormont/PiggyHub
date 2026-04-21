import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { Goal, GoalInput } from '../lib/types';

interface GoalFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: GoalInput) => Promise<void> | void;
  onArchive?: () => Promise<void> | void;
  initial?: Goal;
}

const EMOJI_CHOICES = ['target', 'bike', 'game', 'book', 'art', 'music', 'trip', 'gift'];

const defaults: GoalInput = {
  title: '',
  target_amount: 20,
  target_date: null,
  emoji: 'target',
  image_url: '',
};

export function GoalFormModal({ open, onClose, onSubmit, onArchive, initial }: GoalFormModalProps) {
  const [form, setForm] = useState<GoalInput>(defaults);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        title: initial.title,
        target_amount: Number(initial.target_amount),
        target_date: initial.target_date,
        emoji: initial.emoji || 'target',
        image_url: initial.image_url ?? '',
      });
    } else {
      setForm(defaults);
    }
    setError(null);
  }, [open, initial]);

  const canSubmit = form.title.trim().length > 0 && Number(form.target_amount) > 0 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        ...form,
        title: form.title.trim(),
        target_amount: Number(form.target_amount),
        image_url: form.image_url?.trim() ?? '',
      });
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
      title={initial ? 'Edit goal' : 'New goal'}
      footer={
        <div className="flex items-center justify-between">
          <div>
            {initial && onArchive && (
              <button
                onClick={async () => {
                  if (!confirm(`Delete "${initial.title}"? Contributions will be refunded.`)) return;
                  await onArchive();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 text-sm text-rose-600 hover:bg-rose-50 px-2 py-1.5 rounded-lg transition"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg transition"
            >
              {submitting ? 'Saving' : initial ? 'Save changes' : 'Create goal'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">What are you saving for?</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Nintendo Switch, bike, trip…"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Target amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.target_amount}
                onChange={(e) => setForm({ ...form, target_amount: Number(e.target.value) })}
                className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Target date <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="date"
              value={form.target_date ?? ''}
              onChange={(e) => setForm({ ...form, target_date: e.target.value || null })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Icon</label>
          <div className="flex flex-wrap gap-2">
            {EMOJI_CHOICES.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setForm({ ...form, emoji })}
                className={`px-3 py-1.5 text-xs font-semibold capitalize rounded-lg border transition ${
                  form.emoji === emoji
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Photo URL <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="url"
            value={form.image_url ?? ''}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            placeholder="https://images.pexels.com/..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition"
          />
          <p className="text-xs text-slate-500 mt-1">
            A picture of what you're saving for makes it way more fun.
          </p>
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
