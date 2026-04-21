import { Flame, Trophy, Crown } from 'lucide-react';
import { Badge, BadgeMilestone, Child } from '../lib/types';

interface BadgesShelfProps {
  child: Child;
}

const BADGE_META: Record<BadgeMilestone, { label: string; sub: string; Icon: typeof Flame; bg: string; text: string; border: string }> = {
  streak_5: {
    label: '5-Day Streak',
    sub: 'Hot streak!',
    Icon: Flame,
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200',
  },
  streak_10: {
    label: '10-Day Streak',
    sub: 'On a roll!',
    Icon: Trophy,
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200',
  },
  streak_25: {
    label: '25-Day Streak',
    sub: 'Legendary!',
    Icon: Crown,
    bg: 'bg-yellow-50',
    text: 'text-yellow-600',
    border: 'border-yellow-300',
  },
};

export function BadgesShelf({ child }: BadgesShelfProps) {
  const badges = child.badges ?? [];
  if (badges.length === 0) return null;

  // Deduplicate: keep highest milestone per chore for display brevity,
  // but show all if the child earned different milestones on different chores
  const sorted = [...badges].sort(
    (a, b) => new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime(),
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <h2 className="text-lg font-extrabold text-slate-900 mb-4">My badges</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {sorted.map((badge, i) => (
          <BadgeCard key={i} badge={badge} />
        ))}
      </div>
    </div>
  );
}

function BadgeCard({ badge }: { badge: Badge }) {
  const meta = BADGE_META[badge.type];
  if (!meta) return null;
  const { Icon, label, sub, bg, text, border } = meta;

  return (
    <div
      className={`flex flex-col items-center text-center rounded-2xl border ${bg} ${border} p-4 gap-2`}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${bg} border-2 ${border}`}>
        <Icon size={24} className={text} />
      </div>
      <div>
        <div className={`text-xs font-bold ${text} uppercase tracking-wide`}>{label}</div>
        <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>
        <div className="text-[10px] text-slate-400 mt-1 truncate max-w-[100px]">{badge.chore_title}</div>
      </div>
    </div>
  );
}

/* ── NewBadgeToast ────────────────────────────────────────────────── */

interface NewBadgeToastProps {
  badge: Badge;
  onDismiss: () => void;
}

export function NewBadgeToast({ badge, onDismiss }: NewBadgeToastProps) {
  const meta = BADGE_META[badge.type];
  if (!meta) return null;
  const { Icon, label, sub, bg, text, border } = meta;

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl border ${bg} ${border} shadow-xl animate-bounce-in max-w-xs w-full`}
      style={{ animation: 'slideUp 0.4s ease-out' }}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 ${border} ${bg}`}>
        <Icon size={20} className={text} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-bold ${text}`}>New badge: {label}</div>
        <div className="text-xs text-slate-500">{sub} — {badge.chore_title}</div>
      </div>
      <button
        onClick={onDismiss}
        className="text-slate-400 hover:text-slate-700 text-xs font-semibold ml-1"
      >
        OK
      </button>
    </div>
  );
}
