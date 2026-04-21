import { Child } from '../lib/types';
import { ChevronRight, Clock, Sparkles } from 'lucide-react';
import { useChores } from '../context/ChoresContext';
import { formatMoney } from '../lib/balances';

interface ChildCardProps {
  child: Child;
  onOpen: () => void;
  onKidView: () => void;
}

export function ChildCard({ child, onOpen, onKidView }: ChildCardProps) {
  const { balancesByChild, completions } = useChores();
  const balances = balancesByChild[child.id] ?? { spend: 0, save: 0, give: 0, total: 0 };
  const pendingCount = completions.filter(
    (c) => c.child_id === child.id && c.status === 'pending',
  ).length;

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all overflow-hidden">
      <button onClick={onOpen} className="w-full text-left p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-3xl">
            {child.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 text-lg truncate">{child.name}</h3>
              {pendingCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                  <Clock size={11} />
                  {pendingCount}
                </span>
              )}
              <ChevronRight
                size={16}
                className="ml-auto text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition"
              />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Total balance{' '}
              <span className="font-semibold text-slate-700">{formatMoney(balances.total)}</span>
              {child.savings_match_rate > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 font-medium">
                  <Sparkles size={11} /> {child.savings_match_rate}% match
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <BucketPill label="Spend" value={formatMoney(balances.spend)} tint="sky" />
          <BucketPill label="Save" value={formatMoney(balances.save)} tint="emerald" />
          <BucketPill label="Give" value={formatMoney(balances.give)} tint="rose" />
        </div>
      </button>
      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
        <span className="text-xs text-slate-500">
          {child.allowance_frequency === 'none'
            ? 'No allowance set'
            : `$${Number(child.allowance_amount).toFixed(2)} / ${child.allowance_frequency}`}
        </span>
        <button
          onClick={onKidView}
          className="text-xs font-semibold text-slate-700 hover:text-slate-900 transition"
        >
          Open kid view
        </button>
      </div>
    </div>
  );
}

function BucketPill({ label, value, tint }: { label: string; value: string; tint: 'sky' | 'emerald' | 'rose' }) {
  const styles: Record<typeof tint, string> = {
    sky: 'bg-sky-50 text-sky-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    rose: 'bg-rose-50 text-rose-700',
  };
  return (
    <div className={`${styles[tint]} rounded-lg px-2 py-1.5`}>
      <div className="text-[10px] font-medium uppercase tracking-wider opacity-75">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
