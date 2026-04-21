import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Minus, Plus } from 'lucide-react';
import { Modal } from './Modal';
import { Bucket, Child } from '../lib/types';
import { useChores } from '../context/ChoresContext';
import { formatMoney, splitEarning } from '../lib/balances';

type Mode = 'add' | 'spend' | 'transfer';

interface MoneyActionsModalProps {
  open: boolean;
  onClose: () => void;
  child: Child;
  initialMode?: Mode;
}

const BUCKETS: Bucket[] = ['spend', 'save', 'give'];

export function MoneyActionsModal({ open, onClose, child, initialMode = 'add' }: MoneyActionsModalProps) {
  const { balancesByChild, addMoney, recordSpend, transferMoney } = useChores();
  const balances = balancesByChild[child.id] ?? { spend: 0, save: 0, give: 0, total: 0 };

  const [mode, setMode] = useState<Mode>(initialMode);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [addMode, setAddMode] = useState<'split' | 'bucket'>('split');
  const [bucket, setBucket] = useState<Bucket>('spend');
  const [fromBucket, setFromBucket] = useState<Bucket>('spend');
  const [toBucket, setToBucket] = useState<Bucket>('save');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setAmount('');
    setDescription('');
    setCategory('');
    setAddMode('split');
    setBucket('spend');
    setFromBucket('spend');
    setToBucket('save');
    setError(null);
  }, [open, initialMode]);

  const parsedAmount = Number(amount);
  const valid = Number.isFinite(parsedAmount) && parsedAmount > 0;

  const preview = useMemo(() => {
    if (!valid) return null;
    if (mode === 'add' && addMode === 'split') {
      return splitEarning(parsedAmount, child);
    }
    return null;
  }, [valid, mode, addMode, parsedAmount, child]);

  const submit = async () => {
    if (!valid) {
      setError('Enter an amount greater than $0.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'add') {
        await addMoney({
          childId: child.id,
          amount: parsedAmount,
          mode: addMode,
          bucket: addMode === 'bucket' ? bucket : undefined,
          description,
        });
      } else if (mode === 'spend') {
        if (balances[bucket] < parsedAmount) {
          throw new Error(
            `${capitalize(bucket)} only has ${formatMoney(balances[bucket])}. Reduce the amount or pick a different bucket.`,
          );
        }
        await recordSpend({
          childId: child.id,
          amount: parsedAmount,
          bucket,
          description,
          category: category || undefined,
        });
      } else {
        if (fromBucket === toBucket) throw new Error('Pick two different buckets.');
        if (balances[fromBucket] < parsedAmount) {
          throw new Error(
            `${capitalize(fromBucket)} only has ${formatMoney(balances[fromBucket])}.`,
          );
        }
        await transferMoney({
          childId: child.id,
          from: fromBucket,
          to: toBucket,
          amount: parsedAmount,
          description,
        });
      }
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
      title={`Money for ${child.name}`}
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
            disabled={submitting || !valid}
            className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg transition"
          >
            {submitting ? 'Saving' : mode === 'add' ? 'Add' : mode === 'spend' ? 'Record spend' : 'Transfer'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
          <ModeTab label="Add" active={mode === 'add'} onClick={() => setMode('add')} />
          <ModeTab label="Spend" active={mode === 'spend'} onClick={() => setMode('spend')} />
          <ModeTab label="Transfer" active={mode === 'transfer'} onClick={() => setMode('transfer')} />
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
        </div>

        {mode === 'add' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <ChoicePill
                label="Split into buckets"
                sub={`${child.split_spend}/${child.split_save}/${child.split_give}`}
                active={addMode === 'split'}
                onClick={() => setAddMode('split')}
              />
              <ChoicePill
                label="Single bucket"
                sub="Choose one"
                active={addMode === 'bucket'}
                onClick={() => setAddMode('bucket')}
              />
            </div>
            {addMode === 'bucket' && <BucketPicker value={bucket} onChange={setBucket} />}
            {preview && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Preview
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Spend</span>
                  <span className="font-medium">{formatMoney(preview.spend)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Save</span>
                  <span className="font-medium">{formatMoney(preview.save)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Give</span>
                  <span className="font-medium">{formatMoney(preview.give)}</span>
                </div>
              </div>
            )}
          </>
        )}

        {mode === 'spend' && (
          <>
            <BucketPicker value={bucket} onChange={setBucket} balances={balances} />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Category <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Toys, Food, Gifts..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition"
              />
            </div>
          </>
        )}

        {mode === 'transfer' && (
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
              <select
                value={fromBucket}
                onChange={(e) => setFromBucket(e.target.value as Bucket)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white capitalize"
              >
                {BUCKETS.map((b) => (
                  <option key={b} value={b}>
                    {capitalize(b)} ({formatMoney(balances[b])})
                  </option>
                ))}
              </select>
            </div>
            <ArrowRight size={18} className="text-slate-400 mb-2.5" />
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
              <select
                value={toBucket}
                onChange={(e) => setToBucket(e.target.value as Bucket)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white capitalize"
              >
                {BUCKETS.map((b) => (
                  <option key={b} value={b}>
                    {capitalize(b)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Note <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              mode === 'add'
                ? 'Birthday money from Grandma'
                : mode === 'spend'
                ? 'Lego set'
                : 'Moving to savings'
            }
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition"
          />
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

function ModeTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const Icon = label === 'Add' ? Plus : label === 'Spend' ? Minus : ArrowRight;
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition ${
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function ChoicePill({
  label,
  sub,
  active,
  onClick,
}: {
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-3 rounded-lg border transition ${
        active
          ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="text-sm font-semibold text-slate-900">{label}</div>
      <div className="text-xs text-slate-500">{sub}</div>
    </button>
  );
}

function BucketPicker({
  value,
  onChange,
  balances,
}: {
  value: Bucket;
  onChange: (b: Bucket) => void;
  balances?: { spend: number; save: number; give: number };
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {BUCKETS.map((b) => (
        <button
          key={b}
          onClick={() => onChange(b)}
          className={`p-3 rounded-lg border text-center transition ${
            value === b
              ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="text-sm font-semibold text-slate-900 capitalize">{b}</div>
          {balances && (
            <div className="text-xs text-slate-500 mt-0.5">{formatMoney(balances[b])}</div>
          )}
        </button>
      ))}
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
