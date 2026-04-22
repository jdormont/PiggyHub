import { useMemo, useState } from 'react';
import { Plus, LogOut, Wallet, Users, CalendarClock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { useChores } from '../context/ChoresContext';
import { ChildCard } from '../components/ChildCard';
import { ChildFormModal } from '../components/ChildFormModal';
import { Child, ChildInput } from '../lib/types';
import { formatMoney } from '../lib/balances';

interface DashboardProps {
  onOpenChild: (id: string) => void;
  onOpenKidView: (id: string) => void;
}

export function Dashboard({ onOpenChild, onOpenKidView }: DashboardProps) {
  const { signOut } = useAuth();
  const { children, loading, createChild } = useFamily();
  const { pendingCount, payAllowance } = useChores();
  const [modalOpen, setModalOpen] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const allowanceDue = useMemo(
    () =>
      children.filter(
        (c) =>
          c.allowance_frequency !== 'none' &&
          Number(c.allowance_amount) > 0 &&
          c.allowance_next_date !== null &&
          c.allowance_next_date <= today,
      ),
    [children, today],
  );

  const handleCreate = async (input: ChildInput) => {
    await createChild(input);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-stone-200/60 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-sm">
              <Wallet size={17} />
            </div>
            <span className="font-extrabold text-slate-900 text-lg tracking-tight">PocketPal</span>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors px-3 py-1.5 rounded-full hover:bg-stone-100"
          >
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Your family</h1>
            <p className="text-slate-500 mt-1 font-medium">
              Balances, chores, and goals for each kid.
              {pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 rounded-full px-2.5 py-0.5">
                  {pendingCount} pending
                </span>
              )}
            </p>
          </div>
          {children.length > 0 && (
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white font-bold text-sm rounded-full hover:bg-brand-700 transition-all shadow-sm hover:shadow-md active:scale-95"
            >
              <Plus size={16} />
              Add child
            </button>
          )}
        </div>

        {allowanceDue.length > 0 && (
          <AllowanceDueBanner
            childrenDue={allowanceDue}
            payingId={payingId}
            onPay={async (c) => {
              setPayingId(c.id);
              try {
                await payAllowance(c.id);
              } catch (e) {
                alert(e instanceof Error ? e.message : 'Could not pay allowance');
              } finally {
                setPayingId(null);
              }
            }}
          />
        )}

        {loading ? (
          <div className="text-slate-400 font-medium">Loading…</div>
        ) : children.length === 0 ? (
          <EmptyState onAdd={() => setModalOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {children.map((c) => (
              <ChildCard
                key={c.id}
                child={c}
                onOpen={() => onOpenChild(c.id)}
                onKidView={() => onOpenKidView(c.id)}
              />
            ))}
          </div>
        )}
      </main>

      <ChildFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}

function AllowanceDueBanner({
  childrenDue,
  onPay,
  payingId,
}: {
  childrenDue: Child[];
  onPay: (c: Child) => Promise<void>;
  payingId: string | null;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const hasOverdue = childrenDue.some(
    (c) => c.allowance_next_date !== null && c.allowance_next_date < today,
  );
  return (
    <div className={`mb-8 rounded-3xl p-5 ${hasOverdue ? 'bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200' : 'bg-gradient-to-r from-amber-50 to-violet-50 border border-amber-200'}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center ${hasOverdue ? 'text-rose-500' : 'text-amber-500'}`}>
          <CalendarClock size={18} />
        </div>
        <div>
          <div className="font-bold text-slate-900">
            Allowance {hasOverdue ? 'overdue' : 'due today'}
          </div>
          <div className="text-sm text-slate-500 font-medium">
            {childrenDue.length === 1 ? '1 child is ready to be paid.' : `${childrenDue.length} children are ready to be paid.`}
          </div>
        </div>
      </div>
      <ul className="space-y-2">
        {childrenDue.map((c) => (
          <AllowanceRow key={c.id} child={c} paying={payingId === c.id} onPay={() => onPay(c)} today={today} />
        ))}
      </ul>
    </div>
  );
}

function AllowanceRow({
  child,
  paying,
  onPay,
  today,
}: {
  child: Child;
  paying: boolean;
  onPay: () => void;
  today: string;
}) {
  const daysOverdue =
    child.allowance_next_date && child.allowance_next_date < today
      ? Math.floor(
          (new Date(today).getTime() - new Date(child.allowance_next_date).getTime()) /
            86400_000,
        )
      : 0;

  return (
    <li className="flex items-center gap-3 bg-white/90 backdrop-blur rounded-2xl border border-white px-4 py-3 shadow-sm">
      <span className="text-2xl shrink-0">{child.avatar}</span>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-slate-900 truncate">{child.name}</div>
        <div className="text-sm text-slate-500 font-medium">
          {formatMoney(Number(child.allowance_amount))} {child.allowance_frequency}
          {daysOverdue > 0 ? (
            <span className="ml-1 text-rose-600 font-bold">
              · {daysOverdue}d overdue
            </span>
          ) : (
            <span className="ml-1">· due today</span>
          )}
        </div>
      </div>
      <button
        onClick={onPay}
        disabled={paying}
        className="px-4 py-2 text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 rounded-full transition-all active:scale-95 shadow-sm min-h-[40px] shrink-0"
      >
        {paying ? 'Paying…' : 'Pay now'}
      </button>
    </li>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="bg-white border-2 border-dashed border-stone-200 rounded-3xl py-20 px-6 text-center animate-fade-up">
      <div className="w-16 h-16 rounded-3xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-5 shadow-sm">
        <Users size={28} />
      </div>
      <h3 className="text-xl font-extrabold text-slate-900">No children yet</h3>
      <p className="text-sm text-slate-500 font-medium mt-2 mb-6 max-w-sm mx-auto">
        Add your first child to start tracking their spend, save, and give buckets.
      </p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-bold text-sm rounded-full hover:bg-brand-700 transition-all shadow-sm hover:shadow-md active:scale-95"
      >
        <Plus size={16} />
        Add your first child
      </button>
    </div>
  );
}
