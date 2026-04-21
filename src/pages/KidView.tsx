import { ArrowLeft, ShoppingBag, PiggyBank, Heart } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { useChores } from '../context/ChoresContext';
import { KidChoresList } from '../components/KidChoresList';
import { GoalsPanel } from '../components/GoalsPanel';
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
          onClick={onBack}
          className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg"
        >
          Back
        </button>
      </div>
    );
  }

  const balances = balancesByChild[child.id] ?? { spend: 0, save: 0, give: 0, total: 0 };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-sky-50 to-white">
      <header className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b border-white">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 transition"
          >
            <ArrowLeft size={16} />
            Parent view
          </button>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Kid Mode
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-24 h-24 rounded-3xl bg-white shadow-lg flex items-center justify-center text-6xl mb-4">
            {child.avatar}
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Hi {child.name}!
          </h1>
          <p className="text-slate-600 mt-1">Here's your money.</p>
        </div>

        <div className="space-y-4">
          <BigBucket
            label="Spend"
            Icon={ShoppingBag}
            amount={formatMoney(balances.spend)}
            subtitle="Money you can use on fun things"
            from="from-sky-400"
            to="to-sky-500"
          />
          <BigBucket
            label="Save"
            Icon={PiggyBank}
            amount={formatMoney(balances.save)}
            subtitle="Growing toward your goals"
            from="from-emerald-400"
            to="to-emerald-500"
          />
          <BigBucket
            label="Give"
            Icon={Heart}
            amount={formatMoney(balances.give)}
            subtitle="For people who need it"
            from="from-rose-400"
            to="to-rose-500"
          />
        </div>

        <div className="mt-10">
          <WeeklyEarningsCard childId={child.id} />
        </div>

        <div className="mt-10">
          <KidChoresList child={child} />
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">My goals</h2>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <GoalsPanel child={child} kidMode />
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Recent activity</h2>
          <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm">
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
  from,
  to,
}: {
  label: string;
  Icon: typeof ShoppingBag;
  amount: string;
  subtitle: string;
  from: string;
  to: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${from} ${to} text-white p-6 shadow-lg hover:shadow-xl transition-all hover:scale-[1.01]`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-wider text-white/80">
            {label}
          </div>
          <div className="text-5xl font-extrabold mt-2">{amount}</div>
          <div className="text-sm text-white/90 mt-2">{subtitle}</div>
        </div>
        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
          <Icon size={28} />
        </div>
      </div>
    </div>
  );
}