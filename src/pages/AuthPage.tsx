import { useState } from 'react';
import { Wallet, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  {
    emoji: '✅',
    title: 'Chores that pay',
    desc: 'Kids earn real money by completing tasks you assign.',
  },
  {
    emoji: '🪣',
    title: 'Spend, Save & Give',
    desc: 'Every dollar is split across three buckets automatically.',
  },
  {
    emoji: '🎯',
    title: 'Goals they can see',
    desc: 'A progress bar toward the thing they actually want.',
  },
  {
    emoji: '🏅',
    title: 'Streaks & badges',
    desc: 'Celebrate consistency and build lasting habits.',
  },
];

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error: err } = await fn(email, password);
    if (err) setError(err);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left panel: value prop ── */}
      <div className="relative lg:w-[55%] bg-gradient-to-br from-brand-600 via-violet-600 to-indigo-700 flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-0 w-96 h-96 rounded-full bg-indigo-500/30 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-violet-400/20 blur-2xl pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Wallet size={20} className="text-white" />
          </div>
          <span className="text-xl font-extrabold text-white tracking-tight">PocketPal</span>
        </div>

        {/* Hero copy */}
        <div className="relative my-10 lg:my-0">
          <div className="text-6xl mb-6 leading-none">🐷</div>
          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight tracking-tight">
            Money skills<br />start at home.
          </h1>
          <p className="mt-4 text-lg text-white/75 font-semibold max-w-sm leading-relaxed">
            Give your kids a real allowance, real chores, and real goals — all in one place.
          </p>

          {/* Feature list */}
          <ul className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <span className="text-xl leading-none mt-0.5 shrink-0">{f.emoji}</span>
                <div>
                  <span className="font-extrabold text-white">{f.title}</span>
                  <span className="text-white/65 font-medium"> — {f.desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Social proof strip */}
        <div className="relative flex items-center gap-3 mt-8 lg:mt-0">
          <div className="flex -space-x-2">
            {['🧑‍👩‍👦', '👨‍👩‍👧‍👦', '👩‍👧', '👨‍👦'].map((e, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-sm"
              >
                {e}
              </div>
            ))}
          </div>
          <p className="text-sm font-bold text-white/70">
            Families building better habits
          </p>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="lg:w-[45%] bg-stone-50 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center">
              <Wallet size={17} />
            </div>
            <span className="text-lg font-extrabold text-slate-900">PocketPal</span>
          </div>

          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            {mode === 'signin' ? 'Welcome back 👋' : 'Join PocketPal 🎉'}
          </h2>
          <p className="text-slate-500 font-semibold mt-1.5 mb-8 text-sm">
            {mode === 'signin'
              ? 'Sign in to manage your kids’ money.'
              : 'Start teaching your kids financial habits today.'}
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-extrabold text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition bg-white font-semibold text-slate-900 placeholder:text-slate-300"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-extrabold text-slate-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition bg-white font-semibold text-slate-900 placeholder:text-slate-300"
                placeholder="At least 6 characters"
              />
            </div>

            {error && (
              <div className="text-sm font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 font-extrabold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-full transition-all shadow-sm hover:shadow-md active:scale-[0.98] mt-2"
            >
              {submitting
                ? 'Please wait…'
                : mode === 'signin'
                ? 'Sign in'
                : 'Create your family'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500 font-semibold">
            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
              }}
              className="font-extrabold text-brand-600 hover:text-brand-700 transition-colors"
            >
              {mode === 'signin' ? 'Sign up free' : 'Sign in'}
            </button>
          </div>

          {mode === 'signup' && (
            <ul className="mt-8 space-y-2">
              {[
                'Free to get started',
                'Works on any device',
                'No credit card required',
              ].map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
