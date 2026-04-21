import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Target, Calendar, Zap } from 'lucide-react';
import { Child } from '../lib/types';
import { useChores } from '../context/ChoresContext';
import { useGoals } from '../context/GoalsContext';
import {
  getMonthlyBreakdown,
  getLifetimeStats,
  getGoalProjections,
  MonthSlice,
} from '../lib/insights';
import { formatMoney } from '../lib/balances';

interface InsightsPanelProps {
  child: Child;
}

export function InsightsPanel({ child }: InsightsPanelProps) {
  const { transactions } = useChores();
  const { goals, contributions, progressById } = useGoals();

  const childTxs = useMemo(
    () => transactions.filter((t) => t.child_id === child.id),
    [transactions, child.id],
  );

  const monthly = useMemo(() => getMonthlyBreakdown(childTxs, 6), [childTxs]);
  const stats = useMemo(() => getLifetimeStats(childTxs), [childTxs]);
  const projections = useMemo(
    () => getGoalProjections(goals.filter((g) => g.child_id === child.id), contributions, progressById),
    [goals, contributions, progressById, child.id],
  );

  const hasAnyData = stats.totalEarned > 0;

  return (
    <div className="space-y-6">
      {/* Lifetime stats — 2 cols on phone, 4 on tablet+ */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total earned" value={formatMoney(stats.totalEarned)} color="text-sky-600" />
        <StatCard label="Total spent" value={formatMoney(stats.totalSpent)} color="text-rose-500" />
        <StatCard label="Total saved" value={formatMoney(stats.totalSaved)} color="text-emerald-600" />
        <StatCard
          label="Save rate"
          value={`${stats.saveRate}%`}
          color={stats.saveRate >= 20 ? 'text-emerald-600' : 'text-amber-600'}
          sub={stats.saveRate >= 20 ? 'great habit' : 'room to grow'}
        />
      </div>

      {/* Bar chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-1">Monthly earnings</h3>
        <p className="text-xs text-slate-500 mb-4">Last 6 months — split by bucket</p>
        {hasAnyData ? (
          <MonthlyChart slices={monthly} />
        ) : (
          <EmptyChart />
        )}
        {/* Legend */}
        <div className="flex gap-4 mt-4 flex-wrap">
          <Legend color="bg-sky-400" label="Spend" />
          <Legend color="bg-emerald-400" label="Save" />
          <Legend color="bg-rose-400" label="Give" />
          <Legend color="bg-slate-200" label="Spent (outflow)" />
        </div>
      </div>

      {/* Goal projections */}
      {projections.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Goal projections</h3>
          <p className="text-xs text-slate-500 mb-4">Based on contribution activity over the last 4 weeks</p>
          <div className="space-y-3">
            {projections.map((p) => (
              <div key={p.goalId} className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Target size={15} className="text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{p.title}</div>
                    <div className="text-xs text-slate-500">{formatMoney(p.remaining)} to go</div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {p.estimatedDate ? (
                    <>
                      <div className="text-sm font-bold text-slate-900">
                        {p.estimatedDate.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="text-xs text-slate-500">
                        ~{p.weeksToGo} wk{p.weeksToGo === 1 ? '' : 's'} · {formatMoney(p.weeklyRate)}/wk pace
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-400 italic">No recent activity</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-xl font-extrabold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-600">
      <span className={`w-3 h-3 rounded-sm ${color}`} />
      {label}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-40 flex items-center justify-center text-sm text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
      No transactions yet — earnings will appear here.
    </div>
  );
}

function MonthlyChart({ slices }: { slices: MonthSlice[] }) {
  const W = 480;
  const H = 160;
  const PADDING = { top: 8, right: 8, bottom: 28, left: 44 };
  const chartW = W - PADDING.left - PADDING.right;
  const chartH = H - PADDING.top - PADDING.bottom;

  // Max stack height across all months (earn stack or spend bar)
  const maxVal = slices.reduce((m, s) => {
    const earn = s.earnSpend + s.earnSave + s.earnGive;
    return Math.max(m, earn, s.spent);
  }, 0);

  if (maxVal === 0) return <EmptyChart />;

  const scale = (v: number) => (v / maxVal) * chartH;

  const groupW = chartW / slices.length;
  const barW = Math.min(24, groupW * 0.35);
  const gap = barW * 0.5;

  // Y-axis gridlines
  const ticks = 4;
  const gridLines = Array.from({ length: ticks + 1 }, (_, i) => (maxVal * i) / ticks);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {/* Grid lines */}
      {gridLines.map((val, i) => {
        const y = PADDING.top + chartH - scale(val);
        return (
          <g key={i}>
            <line
              x1={PADDING.left}
              x2={PADDING.left + chartW}
              y1={y}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            <text
              x={PADDING.left - 4}
              y={y + 4}
              textAnchor="end"
              fontSize={9}
              fill="#94a3b8"
            >
              ${val >= 100 ? `${Math.round(val)}` : val.toFixed(0)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {slices.map((s, i) => {
        const cx = PADDING.left + i * groupW + groupW / 2;
        const earnX = cx - gap / 2 - barW;
        const spentX = cx + gap / 2;
        const baseY = PADDING.top + chartH;

        // Stacked earn bar: spend (bottom) → save (mid) → give (top)
        const spendH = scale(s.earnSpend);
        const saveH = scale(s.earnSave);
        const giveH = scale(s.earnGive);

        const spentH = scale(s.spent);

        return (
          <g key={i}>
            {/* Earn stack */}
            {spendH > 0 && (
              <rect x={earnX} y={baseY - spendH} width={barW} height={spendH} fill="#38bdf8" rx={2} />
            )}
            {saveH > 0 && (
              <rect x={earnX} y={baseY - spendH - saveH} width={barW} height={saveH} fill="#34d399" rx={2} />
            )}
            {giveH > 0 && (
              <rect x={earnX} y={baseY - spendH - saveH - giveH} width={barW} height={giveH} fill="#fb7185" rx={2} />
            )}

            {/* Spent bar */}
            {spentH > 0 && (
              <rect x={spentX} y={baseY - spentH} width={barW} height={spentH} fill="#e2e8f0" rx={2} />
            )}

            {/* Month label */}
            <text
              x={cx}
              y={H - 8}
              textAnchor="middle"
              fontSize={10}
              fill="#64748b"
              fontWeight={500}
            >
              {s.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── WeeklyEarningsCard (used in KidView) ─────────────────────────── */

export function WeeklyEarningsCard({ childId }: { childId: string }) {
  const { transactions } = useChores();
  const childTxs = useMemo(
    () => transactions.filter((t) => t.child_id === childId),
    [transactions, childId],
  );

  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7;
  const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
  const startOfLastWeek = new Date(startOfThisWeek.getTime() - 7 * 86400_000);

  let thisWeek = 0;
  let lastWeek = 0;
  for (const tx of childTxs) {
    if (Number(tx.amount) <= 0) continue;
    const d = new Date(tx.created_at);
    if (d >= startOfThisWeek) thisWeek += Number(tx.amount);
    else if (d >= startOfLastWeek) lastWeek += Number(tx.amount);
  }
  thisWeek = parseFloat(thisWeek.toFixed(2));
  lastWeek = parseFloat(lastWeek.toFixed(2));
  const delta = parseFloat((thisWeek - lastWeek).toFixed(2));

  if (thisWeek === 0 && lastWeek === 0) return null;

  const up = delta > 0;
  const flat = delta === 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-slate-900">This week</h2>
        <div
          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
            flat
              ? 'bg-slate-100 text-slate-600'
              : up
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-rose-100 text-rose-600'
          }`}
        >
          {flat ? <Minus size={12} /> : up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {flat ? 'Same as last week' : `${up ? '+' : ''}${formatMoney(delta)} vs last week`}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-sky-50 to-sky-100 rounded-xl p-4 border border-sky-200 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap size={13} className="text-sky-500" />
            <span className="text-xs font-semibold text-sky-700 uppercase tracking-wide">This week</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-sky-700 tabular-nums">{formatMoney(thisWeek)}</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar size={13} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Last week</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-500 tabular-nums">{formatMoney(lastWeek)}</div>
        </div>
      </div>
    </div>
  );
}
