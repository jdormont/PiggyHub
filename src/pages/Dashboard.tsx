import { useMemo, useState } from 'react';
import { Plus, LogOut, Wallet, Users, Clock, CalendarClock } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Wallet size={16} />
            </div>
            <span className="font-bold text-slate-900">PocketPal</span>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition"
          >
            <LogOut size={15} />
            <span>Sign out</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Your family</h1>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
              Manage balances, chores, and goals for each child.
              {pendingCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                  <Clock size={11} />
                  {pendingCount} pending
                </span>
              )}
            </p>
          </div>
          {children.length > 0 && (
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white font-semibold text-sm rounded-lg hover:bg-slate-800 transition"
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
          <div className="text-slate-500">Loading…</div>
        ) : children.length === 0 ? (
          <EmptyState onAdd={() => setModalOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
  return (
    <div className="mb-6 bg-gradient-to-r from-amber-50 to-sky-50 border border-amber-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-white/80 text-amber-700 flex items-center justify-center">
          <CalendarClock size={16} />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-900">Allowance due</div>
          <div className="text-xs text-slate-600">
            {childrenDue.length === 1 ? '1 child has allowance ready to pay.' : `${childrenDue.length} children have allowance ready to pay.`}
          </div>
        </div>
      </div>
      <ul className="space-y-2">
        {childrenDue.map((c) => (
          <li
            key={c.id}
            className="flex items-center gap-3 bg-white/80 backdrop-blur rounded-xl border border-white px-3 py-2"
          >
            <span className="text-xl">{c.avatar}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">{c.name}</div>
              <div className="text-xs text-slate-500">
                {formatMoney(Number(c.allowance_amount))} {c.allowance_frequency} · due{' '}
                {c.allowance_next_date}
              </div>
            </div>
            <button
              onClick={() => onPay(c)}
              disabled={payingId === c.id}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg transition"
            >
              {payingId === c.id ? 'Paying' : 'Pay now'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto mb-4">
        <Users size={24} />
      </div>
      <h3 className="text-lg font-semibold text-slate-900">No children yet</h3>
      <p className="text-sm text-slate-500 mt-1 mb-5 max-w-sm mx-auto">
        Add your first child to start tracking their spend, save, and give buckets.
      </p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white font-semibold text-sm rounded-lg hover:bg-slate-800 transition"
      >
        <Plus size={16} />
        Add your first child
      </button>
    </div>
  );
}
