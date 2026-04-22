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

const TABS = ['chores', 'transactions', 'goals', 'insights'] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  chores: 'Chores',
  transactions: 'Transactions',
  goals: 'Goals',
  insights: 'Insights',
};

export function ChildDetail({ childId, onBack, onKidView }: ChildDetailProps) {
  const { children, updateChild, archiveChild } = useFamily();
  const { balancesByChild } = useChores();
  const child = children.find((c) => c.id === childId);
  const [tab, setTab] = useState<Tab>('chores');
  const [editOpen, setEditOpen] = useState(false);
  const [moneyOpen, setMoneyOpen] = useState(false);

  if (!child) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-slate-500 font-medium mb-4">Child not found.</p>
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 bg-brand-600 text-white text-sm font-bold rounded-full"
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
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-stone-200/60 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors min-h-[40px] px-2 rounded-full hover:bg-stone-100"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onKidView}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-bold text-slate-600 hover:bg-stone-100 rounded-full transition-all min-h-[40px]"
              aria-label="Kid view"
            >
              <Eye size={15} />
              <span className="hidden sm:inline">Kid view</span>
            </button>
            <button
              type="button"
              onClick={() => setMoneyOpen(true)}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-stone-200 hover:bg-stone-50 rounded-full transition-all min-h-[40px] shadow-sm"
              aria-label="Money"
            >
              <Wallet size={15} />
              <span className="hidden sm:inline">Money</span>
            </button>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-full transition-all min-h-[40px] shadow-sm active:scale-95"
              aria-label="Edit profile"
            >
              <Pencil size={15} />
              <span className="hidden sm:inline">Edit</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-violet-100 to-violet-200 flex items-center justify-center text-4xl sm:text-5xl shrink-0 shadow-sm">
            {child.avatar}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight truncate">{child.name}</h1>
            <p className="text-sm text-slate-500 font-semibold flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              <span>Split {child.split_spend}/{child.split_save}/{child.split_give}</span>
              {child.savings_match_rate > 0 && (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                  <Sparkles size={12} /> {child.savings_match_rate}% match
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
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

        <div className="bg-white border border-stone-200/80 rounded-3xl shadow-sm overflow-hidden">
          {/* Pill tab switcher */}
          <div className="flex gap-1 p-2 border-b border-stone-100 overflow-x-auto scrollbar-none">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-bold rounded-full whitespace-nowrap transition-all min-h-[40px] ${
                  tab === t
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-stone-100'
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="p-5 sm:p-6">
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
  const styles: Record<typeof tint, { bg: string; icon: string; accent: string; border: string }> = {
    sky:     { bg: 'bg-sky-50',     icon: 'text-sky-500',     accent: 'text-sky-600 font-extrabold',     border: 'border-sky-100'     },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-500', accent: 'text-emerald-600 font-extrabold', border: 'border-emerald-100' },
    rose:    { bg: 'bg-rose-50',    icon: 'text-rose-500',    accent: 'text-rose-600 font-extrabold',    border: 'border-rose-100'    },
  };
  const s = styles[tint];
  return (
    <div className={`${s.bg} rounded-3xl p-3 sm:p-5 border ${s.border}`}>
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className={`${s.icon} w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-white shadow-sm flex items-center justify-center`}>
          <Icon size={17} />
        </div>
        <span className={`${s.accent} text-sm`}>{percent}%</span>
      </div>
      <div className="text-[10px] sm:text-xs font-extrabold text-slate-500 uppercase tracking-widest">{label}</div>
      <div className="text-xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 sm:mt-1 tabular-nums">{amount}</div>
    </div>
  );
}
