const AVATARS = ['🦊', '🐼', '🐸', '🐵', '🦁', '🐯', '🐨', '🐰', '🦄', '🐙', '🦉', '🐝', '🐳', '🦖', '🐢', '🦕', '🐶', '🐱'];

interface AvatarPickerProps {
  value: string;
  onChange: (next: string) => void;
}

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  return (
    <div className="grid grid-cols-9 gap-2">
      {AVATARS.map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => onChange(a)}
          className={`aspect-square flex items-center justify-center text-2xl rounded-lg transition ${
            value === a
              ? 'bg-slate-900 ring-2 ring-slate-900 scale-105'
              : 'bg-slate-50 hover:bg-slate-100'
          }`}
          aria-label={`Avatar ${a}`}
        >
          {a}
        </button>
      ))}
    </div>
  );
}
