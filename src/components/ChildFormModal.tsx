import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { AvatarPicker } from './AvatarPicker';
import { SplitEditor } from './SplitEditor';
import { Child, ChildInput, AllowanceFrequency } from '../lib/types';

interface ChildFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: ChildInput) => Promise<void>;
  onDelete?: () => Promise<void>;
  initial?: Child | null;
}

const defaultInput: ChildInput = {
  name: '',
  avatar: '🦊',
  dob: null,
  split_spend: 60,
  split_save: 30,
  split_give: 10,
  allowance_amount: 0,
  allowance_frequency: 'none',
  allowance_next_date: null,
  savings_match_rate: 0,
};

export function ChildFormModal({ open, onClose, onSubmit, onDelete, initial }: ChildFormModalProps) {
  const [form, setForm] = useState<ChildInput>(defaultInput);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          name: initial.name,
          avatar: initial.avatar,
          dob: initial.dob,
          split_spend: initial.split_spend,
          split_save: initial.split_save,
          split_give: initial.split_give,
          allowance_amount: Number(initial.allowance_amount),
          allowance_frequency: initial.allowance_frequency,
          allowance_next_date: initial.allowance_next_date,
          savings_match_rate: initial.savings_match_rate,
        });
      } else {
        setForm(defaultInput);
      }
      setError(null);
    }
  }, [open, initial]);

  const splitTotal = form.split_spend + form.split_save + form.split_give;
  const canSubmit = form.name.trim().length > 0 && splitTotal === 100 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ ...form, name: form.name.trim() });
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
      title={initial ? 'Edit child' : 'Add a child'}
      footer={
        <div className="flex items-center justify-between gap-3">
          {initial && onDelete ? (
            <button
              type="button"
              onClick={async () => {
                if (confirm(`Archive ${initial.name}'s profile? History is preserved.`)) {
                  await onDelete();
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
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition"
            >
              {submitting ? 'Saving' : initial ? 'Save changes' : 'Create child'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Alex"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Avatar</label>
          <AvatarPicker value={form.avatar} onChange={(v) => setForm({ ...form, avatar: v })} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Date of birth <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="date"
            value={form.dob ?? ''}
            onChange={(e) => setForm({ ...form, dob: e.target.value || null })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition"
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label className="block text-sm font-medium text-slate-700">Bucket split</label>
            <span className="text-xs text-slate-500">Every dollar earned splits this way</span>
          </div>
          <SplitEditor
            spend={form.split_spend}
            save={form.split_save}
            give={form.split_give}
            onChange={(next) =>
              setForm({
                ...form,
                split_spend: next.spend,
                split_save: next.save,
                split_give: next.give,
              })
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Allowance amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.allowance_amount}
                onChange={(e) =>
                  setForm({ ...form, allowance_amount: Number(e.target.value) || 0 })
                }
                className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Frequency</label>
            <select
              value={form.allowance_frequency}
              onChange={(e) =>
                setForm({
                  ...form,
                  allowance_frequency: e.target.value as AllowanceFrequency,
                })
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition bg-white"
            >
              <option value="none">No allowance</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Savings match rate
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={form.savings_match_rate}
              onChange={(e) =>
                setForm({ ...form, savings_match_rate: Number(e.target.value) })
              }
              className="flex-1 accent-slate-900"
            />
            <span className="w-14 text-right text-sm font-semibold text-slate-900">
              {form.savings_match_rate}%
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            You'll match this much for every dollar they save.
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
