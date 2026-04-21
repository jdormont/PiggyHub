import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowRightLeft, Gift, Heart, PiggyBank, ShoppingBag, Sparkles, Trash2, Wallet } from 'lucide-react';
import { Bucket, Transaction, TxType } from '../lib/types';
import { useChores } from '../context/ChoresContext';
import { formatMoney } from '../lib/balances';

interface TransactionsListProps {
  childId: string;
  limit?: number;
  allowDelete?: boolean;
  compact?: boolean;
}

const BUCKETS: ('all' | Bucket)[] = ['all', 'spend', 'save', 'give'];
const TYPES: ('all' | TxType)[] = ['all', 'earn', 'allowance', 'spend', 'transfer', 'match'];

export function TransactionsList({ childId, limit, allowDelete, compact }: TransactionsListProps) {
  const { transactions, deleteTransaction } = useChores();
  const [bucket, setBucket] = useState<'all' | Bucket>('all');
  const [type, setType] = useState<'all' | TxType>('all');

  const filtered = useMemo(() => {
    let rows = transactions.filter((t) => t.child_id === childId);
    if (bucket !== 'all') rows = rows.filter((t) => t.bucket === bucket);
    if (type !== 'all') rows = rows.filter((t) => t.type === type);
    if (limit) rows = rows.slice(0, limit);
    return rows;
  }, [transactions, childId, bucket, type, limit]);

  if (compact) {
    return (
      <ul className="space-y-2">
        {filtered.length === 0 && (
          <li className="text-sm text-slate-500 py-4 text-center">No activity yet.</li>
        )}
        {filtered.map((t) => (
          <TxRow key={t.id} tx={t} />
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-4">
      {!limit && (
        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          <FilterGroup label="Bucket" options={BUCKETS} value={bucket} onChange={(v) => setBucket(v as 'all' | Bucket)} />
          <FilterGroup label="Type" options={TYPES} value={type} onChange={(v) => setType(v as 'all' | TxType)} />
        </div>
      )}
      {filtered.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          No transactions yet.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
          {filtered.map((t) => (
            <TxRow
              key={t.id}
              tx={t}
              onDelete={
                allowDelete
                  ? async () => {
                      if (!confirm('Delete this transaction? Balances will update.')) return;
                      await deleteTransaction(t.id);
                    }
                  : undefined
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TxRow({ tx, onDelete }: { tx: Transaction; onDelete?: () => void }) {
  const positive = Number(tx.amount) >= 0;
  const { Icon, tint } = iconFor(tx);
  const date = new Date(tx.created_at);
  const dateLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const timeLabel = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return (
    <li className="p-3 flex items-center gap-3 hover:bg-slate-50 transition">
      <div className={`w-9 h-9 rounded-xl ${tint} flex items-center justify-center shrink-0`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-900 truncate">{tx.description || typeLabel(tx.type)}</div>
        <div className="text-xs text-slate-500">
          {dateLabel} · {timeLabel} · <span className="capitalize">{tx.bucket}</span>
          {tx.category && <> · {tx.category}</>}
        </div>
      </div>
      <div className={`text-sm font-semibold tabular-nums shrink-0 ${positive ? 'text-emerald-700' : 'text-rose-600'}`}>
        {positive ? '+' : ''}
        {formatMoney(Number(tx.amount))}
      </div>
      {/* Always visible on touch, hover-fade on pointer devices */}
      {onDelete && (
        <button
          onClick={onDelete}
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition min-w-[36px] min-h-[36px] flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100"
          aria-label="Delete transaction"
        >
          <Trash2 size={14} />
        </button>
      )}
    </li>
  );
}

function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className="flex bg-slate-100 rounded-lg p-0.5 overflow-x-auto">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`px-3 py-1.5 text-xs font-semibold capitalize rounded-md transition whitespace-nowrap min-h-[32px] ${
              value === o ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function iconFor(tx: Transaction): { Icon: typeof Wallet; tint: string } {
  const positive = Number(tx.amount) >= 0;
  if (tx.type === 'match') return { Icon: Sparkles, tint: 'bg-emerald-100 text-emerald-700' };
  if (tx.type === 'allowance') return { Icon: Wallet, tint: 'bg-sky-100 text-sky-700' };
  if (tx.type === 'transfer')
    return {
      Icon: ArrowRightLeft,
      tint: positive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700',
    };
  if (tx.type === 'spend') return { Icon: ShoppingBag, tint: 'bg-rose-100 text-rose-700' };
  if (positive && tx.bucket === 'save') return { Icon: PiggyBank, tint: 'bg-emerald-100 text-emerald-700' };
  if (positive && tx.bucket === 'give') return { Icon: Heart, tint: 'bg-rose-100 text-rose-700' };
  if (positive) return { Icon: Gift, tint: 'bg-amber-100 text-amber-700' };
  return { Icon: positive ? ArrowUp : ArrowDown, tint: 'bg-slate-100 text-slate-600' };
}

function typeLabel(t: TxType): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}
