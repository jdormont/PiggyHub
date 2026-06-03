import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Chore, ChoreFrequency, ChoreInput, DAYS_OF_WEEK } from '../lib/types';

interface ChoreFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: ChoreInput) => Promise<void>;
  onArchive?: () => Promise<void>;
  initial?: Chore | null;
}

const defaults: ChoreInput = {
  title: '',
  description: '',
  value: 1,
  frequency: 'weekly',
  due_date: null,
  day_of_week: null,
  is_milestone: false,
};

export function ChoreFormModal({ open, onClose, onSubmit, onArchive, initial }: ChoreFormModalProps) {
  const [form, setForm] = useState<ChoreInput>(defaults);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        title: initial.title,
        description: initial.description,
        value: Number(initial.value),
        frequency: initial.frequency,
        due_date: initial.due_date,
        day_of_week: initial.day_of_week,
        is_milestone: initial.is_milestone,
      });
    } else {
      setForm(defaults);
    }
    setError(null);
  }, [open, initial]);

  const canSubmit = form.title.trim().length > 0 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const value = form.is_milestone ? 0 : Math.max(0, Number(form.value) || 0);
      const due_date = form.frequency === 'once' || form.frequency === 'monthly' ? form.due_date : null;
      const day_of_week = form.frequency === 'weekly' ? form.day_of_week : null;
      await onSubmit({ ...form, title: form.title.trim(), value, due_date, day_of_week });
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
      title={initial ? 'Edit chore' : 'New chore'}
      footer={
        <div className="flex items-center justify-between gap-3">
          {initial && onArchive ? (
            <button
              type="button"
              onClick={async () => {
                if (confirm('Archive this chore? History is preserved.')) {
                  await onArchive();
                  onClose();
                }
              }}
              className="text-sm font-medium text-rose-600 hover:text-rose-700"
            >
              Archive
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
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
              disabled={!canSubmit}
              className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg transition"
            >
              {submitting ? 'Saving' : initial ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Take out the trash"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Description <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition resize-none"
          />
        </div>

        <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_milestone}
            onChange={(e) => setForm({ ...form, is_milestone: e.target.checked })}
            className="mt-0.5 accent-slate-900"
          />
          <div>
            <div className="text-sm font-medium text-slate-900">Milestone task</div>
            <div className="text-xs text-slate-500">
              Tracks completion only — no money awarded (e.g. read for 20 minutes).
            </div>
          </div>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Pay</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                min={0}
                step="0.25"
                disabled={form.is_milestone}
                value={form.is_milestone ? 0 : form.value}
                onChange={(e) => setForm({ ...form, value: Number(e.target.value) || 0 })}
                className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Frequency</label>
            <select
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value as ChoreFrequency })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition bg-white"
            >
              <option value="once">One-time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        {form.frequency === 'weekly' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Day of week</label>
            <select
              value={form.day_of_week ?? ''}
              onChange={(e) => setForm({ ...form, day_of_week: e.target.value === '' ? null : Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition bg-white"
            >
              <option value="">Any day of the week</option>
              {DAYS_OF_WEEK.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}

        {(form.frequency === 'once' || form.frequency === 'monthly') && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Due date <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="date"
              value={form.due_date ?? ''}
              onChange={(e) => setForm({ ...form, due_date: e.target.value || null })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition"
            />
          </div>
        )}

        {error && (
          <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
