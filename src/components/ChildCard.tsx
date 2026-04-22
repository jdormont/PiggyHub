import { Child } from '../lib/types';
import { ChevronRight, Sparkles } from 'lucide-react';
import { useChores } from '../context/ChoresContext';
import { formatMoney } from '../lib/balances';

interface ChildCardProps {
  child: Child;
  onOpen: () => void;
  onKidView: () => void;
}

const AVATAR_GRADIENTS = [
  'from-violet-100 to-violet-200',
  'from-sky-100 to-sky-200',
  'from-emerald-100 to-emerald-200',
  'from-amber-100 to-amber-200',
  'from-rose-100 to-rose-200',
  'from-fuchsia-100 to-fuchsia-200',
];

function avatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export function ChildCard({ child, onOpen, onKidView }: ChildCardProps) {
  const { balancesByChild, completions } = useChores();
  const balances = balancesByChild[child.id] ?? { spend: 0, save: 0, give: 0, total: 0 };
  const pendingCount = completions.filter(
    (c) => c.child_id === child.id && c.status === 'pending',
  ).length;

  return (
    <div className="group bg-white rounded-3xl shadow-sm hover:shadow-lg border border-stone-200/80 hover:border-stone-300 transition-all duration-200 overflow-hidden">
      <button type="button" onClick={onOpen} className="w-full text-left p-6">
        <div className="flex items-start gap-4">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarGradient(child.name)} flex items-center justify-center text-4xl shrink-0 shadow-sm`}>
            {child.avatar}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-xl truncate">{child.name}</h3>
              {pendingCount > 0 && (
                <span className="inline-flex items-center text-xs font-bold text-amber-700 bg-amber-100 rounded-full px-2.5 py-0.5">
                  {pendingCount} pending
                </span>
              )}
              <ChevronRight
                size={18}
                className="ml-auto text-stone-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all shrink-0"
              />
            </div>
            <p className="text-sm text-slate-500 font-semibold mt-0.5">
              Total{' '}
              <span className="text-slate-800">{formatMoney(balances.total)}</span>
              {child.savings_match_rate > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 font-bold">
                  <Sparkles size={11} /> {child.savings_match_rate}% match
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <BucketPill label="Spend" value={formatMoney(balances.spend)} tint="sky" />
          <BucketPill label="Save" value={formatMoney(balances.save)} tint="emerald" />
          <BucketPill label="Give" value={formatMoney(balances.give)} tint="rose" />
        </div>
      </button>
      <div className="px-6 py-3.5 border-t border-stone-100 bg-stone-50/60 flex justify-between items-center">
        <span className="text-xs text-slate-400 font-semibold">
          {child.allowance_frequency === 'none'
            ? 'No allowance set'
            : `$${Number(child.allowance_amount).toFixed(2)} / ${child.allowance_frequency}`}
        </span>
        <button
          onClick={onKidView}
          className="text-xs font-extrabold text-brand-600 hover:text-brand-700 transition-colors px-3 py-1.5 rounded-full hover:bg-brand-50"
        >
          Kid view →
        </button>
      </div>
    </div>
  );
}

function BucketPill({ label, value, tint }: { label: string; value: string; tint: 'sky' | 'emerald' | 'rose' }) {
  const styles: Record<typeof tint, string> = {
    sky: 'bg-sky-50 text-sky-700 border border-sky-100',
    emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    rose: 'bg-rose-50 text-rose-700 border border-rose-100',
  };
  return (
    <div className={`${styles[tint]} rounded-2xl px-3 py-2.5`}>
      <div className="text-[10px] font-extrabold uppercase tracking-widest opacity-60">{label}</div>
      <div className="text-base font-extrabold mt-0.5">{value}</div>
    </div>
  );
}
