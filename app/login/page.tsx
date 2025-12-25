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
    <div className="min-h-[100svh] bg-gray-50">
      <div className="mx-auto max-w-md min-h-[100svh] flex flex-col">
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200">
          <div className="px-4 py-4 text-gray-900 flex items-center justify-between">
            <div className="font-semibold tracking-tight">業務員登入</div>
            <Link
              href="/"
              className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
            >
              回首頁
            </Link>
          </div>
        </div>

        <div className="flex-1 px-4 py-6">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-5">
            <div className="text-sm text-gray-600">
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
                    ? 'border-gray-950 bg-gray-950 text-white'
                    : 'border-gray-200 bg-white text-gray-900'
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
                    ? 'border-gray-950 bg-gray-950 text-white'
                    : 'border-gray-200 bg-white text-gray-900'
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
                <div className="text-xs font-medium text-gray-600">Email</div>
                <input
                  type="email"
                  className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </label>

              <label className="block">
                <div className="text-xs font-medium text-gray-600">密碼</div>
                <input
                  type="password"
                  className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                />
              </label>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 px-4 py-2 rounded-full bg-gray-950 text-white text-sm font-medium hover:bg-gray-900 disabled:bg-gray-400"
              >
                {loading ? '處理中…' : mode === 'signin' ? '登入' : '註冊'}
              </button>
            </form>

            <div className="mt-3 text-xs text-gray-500">
              需要先在 Supabase 開啟 Email provider（Authentication → Providers → Email）。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
