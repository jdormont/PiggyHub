import { useState } from 'react';
import { Pencil, Plus, PartyPopper, Target, Bike, Gamepad2, BookOpen, Palette, Music, Plane, Gift, Trophy } from 'lucide-react';
import { Child, Goal, GoalInput } from '../lib/types';
import { useGoals } from '../context/GoalsContext';
import { GoalFormModal } from './GoalFormModal';
import { GoalContributeModal } from './GoalContributeModal';
import { formatMoney } from '../lib/balances';

interface GoalsPanelProps {
  child: Child;
  kidMode?: boolean;
}

export function GoalsPanel({ child, kidMode }: GoalsPanelProps) {
  const { goals, progressById, createGoal, updateGoal, archiveGoal, completeGoal } = useGoals();
  const ownGoals = goals.filter((g) => g.child_id === child.id);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [contributingTo, setContributingTo] = useState<Goal | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (goal: Goal) => {
    setEditing(goal);
    setFormOpen(true);
  };

  const handleSubmit = async (input: GoalInput) => {
    if (editing) await updateGoal(editing.id, input);
    else await createGoal(child.id, input);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            {kidMode ? 'My goals' : 'Savings goals'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {ownGoals.length === 0
              ? 'Nothing saved for yet.'
              : `${ownGoals.length} goal${ownGoals.length === 1 ? '' : 's'} in progress.`}
          </p>
        </div>
        {!kidMode && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition"
          >
            <Plus size={14} />
            New goal
          </button>
        )}
      </div>

      {ownGoals.length === 0 ? (
        <EmptyGoals onAdd={kidMode ? undefined : openCreate} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ownGoals.map((g) => {
            const p = progressById[g.id];
            return (
              <GoalCard
                key={g.id}
                goal={g}
                progress={p}
                onContribute={() => setContributingTo(g)}
                onEdit={!kidMode ? () => openEdit(g) : undefined}
                onComplete={
                  !kidMode && p && p.percent >= 100 && !g.is_complete
                    ? () => completeGoal(g.id)
                    : undefined
                }
              />
            );
          })}
        </div>
      )}

      <GoalFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        initial={editing ?? undefined}
        onArchive={editing ? () => archiveGoal(editing.id) : undefined}
      />
      {contributingTo && (
        <GoalContributeModal
          open={Boolean(contributingTo)}
          onClose={() => setContributingTo(null)}
          goal={contributingTo}
        />
      )}
    </div>
  );
}

const ICONS: Record<string, typeof Target> = {
  target: Target,
  bike: Bike,
  game: Gamepad2,
  book: BookOpen,
  art: Palette,
  music: Music,
  trip: Plane,
  gift: Gift,
};

function GoalCard({
  goal,
  progress,
  onContribute,
  onEdit,
  onComplete,
}: {
  goal: Goal;
  progress: { contributed: number; percent: number; remaining: number; complete: boolean } | undefined;
  onContribute: () => void;
  onEdit?: () => void;
  onComplete?: () => void;
}) {
  const Icon = ICONS[goal.emoji] ?? Target;
  const percent = progress?.percent ?? 0;
  const contributed = progress?.contributed ?? 0;
  const target = Number(goal.target_amount);
  const reached = percent >= 100;
  const daysLeft = goal.target_date
    ? Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition shadow-sm hover:shadow-md ${
        goal.is_complete
          ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-white'
          : reached
          ? 'border-emerald-300 bg-white'
          : 'border-slate-200 bg-white'
      }`}
    >
      {goal.image_url ? (
        <div
          className="h-28 bg-slate-100 bg-cover bg-center"
          style={{ backgroundImage: `url(${goal.image_url})` }}
        />
      ) : (
        <div className="h-16 bg-gradient-to-r from-slate-50 to-slate-100 flex items-center justify-center">
          <Icon size={28} className="text-slate-400" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 truncate">{goal.title}</h3>
              {goal.is_complete && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full px-2 py-0.5">
                  <Trophy size={10} />
                  Done
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {formatMoney(contributed)} of {formatMoney(target)}
              {daysLeft != null && !goal.is_complete && (
                <>
                  {' · '}
                  {daysLeft < 0
                    ? 'past due'
                    : daysLeft === 0
                    ? 'due today'
                    : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
                </>
              )}
            </div>
          </div>
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
              aria-label="Edit goal"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>

        <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ${
              goal.is_complete || reached ? 'bg-emerald-500' : 'bg-sky-500'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5 text-xs">
          <span className="font-semibold text-slate-700">{percent}%</span>
          {!goal.is_complete && (
            <span className="text-slate-500">{formatMoney(progress?.remaining ?? target)} to go</span>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          {!goal.is_complete && (
            <button
              onClick={onContribute}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
            >
              <Plus size={14} />
              Add money
            </button>
          )}
          {onComplete && (
            <button
              onClick={onComplete}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition"
            >
              <PartyPopper size={14} />
              Mark bought
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyGoals({ onAdd }: { onAdd?: () => void }) {
  return (
    <div className="py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
      <div className="w-12 h-12 rounded-2xl bg-white text-slate-500 flex items-center justify-center mx-auto mb-3 border border-slate-200">
        <Target size={20} />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">No goals yet</h3>
      <p className="text-xs text-slate-500 mt-1 mb-4 max-w-xs mx-auto">
        Add a goal to start saving for something special.
      </p>
      {onAdd && (
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition"
        >
          <Plus size={14} />
          Add first goal
        </button>
      )}
    </div>
  );
}
