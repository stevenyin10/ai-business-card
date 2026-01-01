'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) router.replace('/dashboard/leads');
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace('/dashboard/leads');
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router, supabase]);

  return (
    <div className="min-h-[100svh] bg-black text-white selection:bg-amber-500/30 overflow-x-hidden">
      <div className="mx-auto max-w-md min-h-[100svh] flex flex-col">
        <div className="sticky top-0 z-10 bg-black/30 backdrop-blur-3xl border-b border-white/10">
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="font-semibold tracking-tight">業務員登入</div>
            <Link
              href="/"
              className="text-sm font-medium px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 active:bg-white/15"
            >
              回首頁
            </Link>
          </div>
        </div>

        <div className="flex-1 px-4 py-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 shadow-sm p-5">
            <div className="text-sm text-white/70">
              {mode === 'signin' ? '使用 Email / 密碼登入' : '建立新帳號'}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                }}
                className={`px-3 py-1.5 rounded-full border text-sm font-medium ${
                  mode === 'signin'
                    ? 'border-white/10 bg-white text-black'
                    : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                登入
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className={`px-3 py-1.5 rounded-full border text-sm font-medium ${
                  mode === 'signup'
                    ? 'border-white/10 bg-white text-black'
                    : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                註冊
              </button>
            </div>

            <form
              className="mt-5 space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                setError(null);

                try {
                  if (!email.trim() || !password) {
                    throw new Error('請輸入 Email 與密碼');
                  }

                  if (mode === 'signin') {
                    const { error } = await supabase.auth.signInWithPassword({
                      email,
                      password,
                    });
                    if (error) throw error;
                  } else {
                    const { error } = await supabase.auth.signUp({
                      email,
                      password,
                    });
                    if (error) throw error;
                    // 如果你在 Supabase 關掉 Confirm email，這裡會直接登入；否則會需要收信。
                  }
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : String(err);
                  setError(msg || '登入失敗');
                } finally {
                  setLoading(false);
                }
              }}
            >
              <label className="block">
                <div className="text-xs font-medium text-white/70">Email</div>
                <input
                  type="email"
                  className="mt-1 w-full rounded-2xl border border-white/10 px-3 py-2 text-sm text-white bg-white/5 placeholder:text-white/30 outline-none focus:border-amber-500/30 focus:ring-2 focus:ring-amber-500/20"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </label>

              <label className="block">
                <div className="text-xs font-medium text-white/70">密碼</div>
                <input
                  type="password"
                  className="mt-1 w-full rounded-2xl border border-white/10 px-3 py-2 text-sm text-white bg-white/5 placeholder:text-white/30 outline-none focus:border-amber-500/30 focus:ring-2 focus:ring-amber-500/20"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                />
              </label>

              {error && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:invert disabled:opacity-50"
              >
                {loading ? '處理中…' : mode === 'signin' ? '登入' : '註冊'}
              </button>
            </form>

            <div className="mt-3 text-xs text-white/50">
              需要先在 Supabase 開啟 Email provider（Authentication → Providers → Email）。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
