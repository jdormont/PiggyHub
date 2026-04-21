import { useState } from 'react';
import { ArrowLeft, Pencil, Eye, ShoppingBag, PiggyBank, Heart, Sparkles, Wallet } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { useChores } from '../context/ChoresContext';
import { ChildFormModal } from '../components/ChildFormModal';
import { ChoresPanel } from '../components/ChoresPanel';
import { GoalsPanel } from '../components/GoalsPanel';
import { InsightsPanel } from '../components/InsightsPanel';
import { MoneyActionsModal } from '../components/MoneyActionsModal';
import { TransactionsList } from '../components/TransactionsList';
import { ChildInput } from '../lib/types';
import { formatMoney } from '../lib/balances';

interface ChildDetailProps {
  childId: string;
  onBack: () => void;
  onKidView: () => void;
}

export function ChildDetail({ childId, onBack, onKidView }: ChildDetailProps) {
  const { children, updateChild, archiveChild } = useFamily();
  const { balancesByChild } = useChores();
  const child = children.find((c) => c.id === childId);
  const [tab, setTab] = useState<'chores' | 'transactions' | 'goals' | 'insights'>('chores');
  const [editOpen, setEditOpen] = useState(false);
  const [moneyOpen, setMoneyOpen] = useState(false);

  if (!child) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Child not found.</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const balances = balancesByChild[child.id] ?? { spend: 0, save: 0, give: 0, total: 0 };

  const handleUpdate = async (input: ChildInput) => {
    await updateChild(child.id, input);
  };

  const handleArchive = async () => {
    await archiveChild(child.id);
    onBack();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition min-h-[40px] px-1"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <div className="flex gap-1.5 sm:gap-2">
            {/* Kid view — icon-only on mobile */}
            <button
              onClick={onKidView}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition min-h-[40px]"
              aria-label="Kid view"
            >
              <Eye size={16} />
              <span className="hidden sm:inline">Kid view</span>
            </button>
            {/* Money — icon-only on mobile */}
            <button
              onClick={() => setMoneyOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition min-h-[40px]"
              aria-label="Money"
            >
              <Wallet size={16} />
              <span className="hidden sm:inline">Money</span>
            </button>
            {/* Edit — icon-only on mobile */}
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition min-h-[40px]"
              aria-label="Edit profile"
            >
              <Pencil size={16} />
              <span className="hidden sm:inline">Edit</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-3xl sm:text-4xl shrink-0">
            {child.avatar}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight truncate">{child.name}</h1>
            <p className="text-sm text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>Split {child.split_spend}/{child.split_save}/{child.split_give}</span>
              {child.savings_match_rate > 0 && (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                  <Sparkles size={12} /> {child.savings_match_rate}% match
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <BucketCard
            label="Spend"
            Icon={ShoppingBag}
            amount={formatMoney(balances.spend)}
            percent={child.split_spend}
            tint="sky"
          />
          <BucketCard
            label="Save"
            Icon={PiggyBank}
            amount={formatMoney(balances.save)}
            percent={child.split_save}
            tint="emerald"
          />
          <BucketCard
            label="Give"
            Icon={Heart}
            amount={formatMoney(balances.give)}
            percent={child.split_give}
            tint="rose"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl">
          {/* Scrollable tabs on mobile */}
          <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-none">
            {(['chores', 'transactions', 'goals', 'insights'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 sm:px-5 py-3 text-sm font-medium capitalize transition whitespace-nowrap min-h-[44px] ${
                  tab === t
                    ? 'text-slate-900 border-b-2 border-slate-900 -mb-px'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="p-4 sm:p-6">
            {tab === 'chores' && <ChoresPanel child={child} />}
            {tab === 'transactions' && <TransactionsList childId={child.id} allowDelete />}
            {tab === 'goals' && <GoalsPanel child={child} />}
            {tab === 'insights' && <InsightsPanel child={child} />}
          </div>
        </div>
      </main>

      <ChildFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleUpdate}
        onDelete={handleArchive}
        initial={child}
      />
      <MoneyActionsModal open={moneyOpen} onClose={() => setMoneyOpen(false)} child={child} />
    </div>
  );
}

function BucketCard({
  label,
  Icon,
  amount,
  percent,
  tint,
}: {
  label: string;
  Icon: typeof ShoppingBag;
  amount: string;
  percent: number;
  tint: 'sky' | 'emerald' | 'rose';
}) {
  const styles: Record<typeof tint, { bg: string; icon: string; accent: string }> = {
    sky: { bg: 'bg-sky-50', icon: 'text-sky-600', accent: 'text-sky-700' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', accent: 'text-emerald-700' },
    rose: { bg: 'bg-rose-50', icon: 'text-rose-600', accent: 'text-rose-700' },
  };
  const s = styles[tint];
  return (
    <div className={`${s.bg} rounded-2xl p-3 sm:p-5 border border-white/60`}>
      <div className="flex items-center justify-between">
        <div className={`${s.icon} w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/70 flex items-center justify-center`}>
          <Icon size={16} />
        </div>
        <span className={`${s.accent} text-xs font-semibold`}>{percent}%</span>
      </div>
      <div className="mt-2 sm:mt-4">
        <div className="text-[10px] sm:text-xs font-medium text-slate-600 uppercase tracking-wider">{label}</div>
        <div className="text-lg sm:text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1">{amount}</div>
      </div>
    </div>
  );
}
