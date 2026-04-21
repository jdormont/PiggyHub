import { ShoppingBag, PiggyBank, Heart } from 'lucide-react';

interface SplitEditorProps {
  spend: number;
  save: number;
  give: number;
  onChange: (next: { spend: number; save: number; give: number }) => void;
}

const BUCKETS = [
  { key: 'spend' as const, label: 'Spend', Icon: ShoppingBag, color: 'text-sky-600', bg: 'bg-sky-50', ring: 'ring-sky-200' },
  { key: 'save' as const, label: 'Save', Icon: PiggyBank, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
  { key: 'give' as const, label: 'Give', Icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50', ring: 'ring-rose-200' },
];

export function SplitEditor({ spend, save, give, onChange }: SplitEditorProps) {
  const total = spend + save + give;
  const valid = total === 100;

  const update = (key: 'spend' | 'save' | 'give', raw: string) => {
    const v = Math.max(0, Math.min(100, Number(raw) || 0));
    const next = { spend, save, give, [key]: v };
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {BUCKETS.map(({ key, label, Icon, color, bg, ring }) => {
          const value = key === 'spend' ? spend : key === 'save' ? save : give;
          return (
            <label
              key={key}
              className={`${bg} ring-1 ${ring} rounded-xl p-3 flex flex-col items-center gap-2 cursor-text`}
            >
              <Icon className={color} size={20} />
              <span className="text-xs font-medium text-slate-600">{label}</span>
              <div className="flex items-baseline">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={value}
                  onChange={(e) => update(key, e.target.value)}
                  className="w-14 text-center text-xl font-semibold text-slate-900 bg-transparent focus:outline-none"
                />
                <span className="text-slate-500 text-sm">%</span>
              </div>
            </label>
          );
        })}
      </div>
      <div
        className={`text-xs font-medium ${valid ? 'text-emerald-600' : 'text-rose-600'} flex items-center justify-between`}
      >
        <span>Total: {total}%</span>
        {!valid && <span>Must equal 100%</span>}
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
        <div className="bg-sky-400" style={{ width: `${Math.min(100, spend)}%` }} />
        <div className="bg-emerald-400" style={{ width: `${Math.min(100, save)}%` }} />
        <div className="bg-rose-400" style={{ width: `${Math.min(100, give)}%` }} />
      </div>
    </div>
  );
}
