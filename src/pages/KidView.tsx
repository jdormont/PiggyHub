import { ArrowLeft, ShoppingBag, PiggyBank, Heart } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { useChores } from '../context/ChoresContext';
import { KidChoresList } from '../components/KidChoresList';
import { GoalsPanel } from '../components/GoalsPanel';
import { BadgesShelf } from '../components/BadgesShelf';
import { WeeklyEarningsCard } from '../components/InsightsPanel';
import { TransactionsList } from '../components/TransactionsList';
import { formatMoney } from '../lib/balances';

interface KidViewProps {
  childId: string;
  onBack: () => void;
}

export function KidView({ childId, onBack }: KidViewProps) {
  const { children } = useFamily();
  const { balancesByChild } = useChores();
  const child = children.find((c) => c.id === childId);

  if (!child) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 bg-brand-600 text-white text-sm font-bold rounded-full"
        >
          Back
        </button>
      </div>
    );
  }

  const balances = balancesByChild[child.id] ?? { spend: 0, save: 0, give: 0, total: 0 };

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-sky-50 to-stone-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/70 backdrop-blur-md border-b border-white/80">
        <div className="max-w-2xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Parent view
          </button>
          <span className="text-xs font-extrabold uppercase tracking-widest text-brand-500 bg-brand-50 px-3 py-1 rounded-full">
            Kid Mode
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-10">
        {/* Hero */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-28 h-28 rounded-[2rem] bg-white shadow-xl flex items-center justify-center text-7xl mb-5 animate-scale-in">
            {child.avatar}
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight">
            Hi {child.name}!
          </h1>
          <p className="text-slate-500 font-bold mt-2 text-lg">Here's your money 💰</p>
        </div>

        {/* Money buckets */}
        <div className="space-y-4 mb-10">
          <BigBucket
            label="Spend"
            Icon={ShoppingBag}
            amount={formatMoney(balances.spend)}
            subtitle="Money you can use on fun things"
            gradient="from-sky-400 via-sky-500 to-blue-500"
          />
          <BigBucket
            label="Save"
            Icon={PiggyBank}
            amount={formatMoney(balances.save)}
            subtitle="Growing toward your goals"
            gradient="from-emerald-400 via-emerald-500 to-green-500"
          />
          <BigBucket
            label="Give"
            Icon={Heart}
            amount={formatMoney(balances.give)}
            subtitle="For people who need it"
            gradient="from-rose-400 via-rose-500 to-pink-500"
          />
        </div>

        {/* Weekly earnings */}
        <div className="mb-10">
          <WeeklyEarningsCard childId={child.id} />
        </div>

        {/* Chores */}
        <div className="mb-10">
          <KidChoresList child={child} />
        </div>

        {/* Goals */}
        <div className="mb-10">
          <h2 className="text-3xl font-black text-slate-900 mb-4">My goals 🎯</h2>
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm">
            <GoalsPanel child={child} kidMode />
          </div>
        </div>

        {/* Badges */}
        <div className="mb-10">
          <BadgesShelf child={child} />
        </div>

        {/* Recent activity */}
        <div className="mb-10">
          <h2 className="text-3xl font-black text-slate-900 mb-4">Recent activity</h2>
          <div className="bg-white rounded-3xl border border-stone-200 p-4 shadow-sm">
            <TransactionsList childId={child.id} limit={8} compact />
          </div>
        </div>
      </main>
    </div>
  );
}

function BigBucket({
  label,
  Icon,
  amount,
  subtitle,
  gradient,
}: {
  label: string;
  Icon: typeof ShoppingBag;
  amount: string;
  subtitle: string;
  gradient: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} text-white p-6 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]`}
    >
      {/* decorative circle */}
      <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
      <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full bg-white/10" />

      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-extrabold uppercase tracking-widest text-white/75">
            {label}
          </div>
          <div className="text-5xl sm:text-6xl font-black mt-2 tabular-nums drop-shadow-sm">
            {amount}
          </div>
          <div className="text-sm font-bold text-white/80 mt-2">{subtitle}</div>
        </div>
        <div className="w-16 h-16 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-inner">
          <Icon size={28} />
        </div>
      </div>
    </div>
  );
}
