'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { normalizeSurveySettings } from '@/lib/surveySettings';

type SurveyRow = {
  id: number;
  created_at: string;
  session_id: string;
  payload: unknown;
  schema_version: number;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
}

function formatLegacyPayload(payload: unknown): Array<{ q: string; a: string }> {
  const p = asRecord(payload) ?? {};
  const goal = typeof p.goal === 'string' ? p.goal : '';
  const budget = typeof p.budget === 'string' ? p.budget : '';
  const timeline = typeof p.timeline === 'string' ? p.timeline : '';
  const tradeIn = typeof p.tradeIn === 'string' ? p.tradeIn : '';
  const note = typeof p.note === 'string' ? p.note : '';

  const out: Array<{ q: string; a: string }> = [];
  if (goal) out.push({ q: '需求/目的', a: goal });
  if (budget) out.push({ q: '預算', a: budget });
  if (timeline) out.push({ q: '購買時間', a: timeline });
  if (tradeIn) out.push({ q: '是否舊車換購', a: tradeIn });
  if (note) out.push({ q: '其他備註', a: note });
  return out;
}

function formatDynamicPayload(payload: unknown): { title: string; items: Array<{ q: string; a: string }> } {
  const p = asRecord(payload) ?? {};
  const form = normalizeSurveySettings(p.form);
  const answers = asRecord(p.answers) ?? {};

  const items: Array<{ q: string; a: string }> = [];
  for (const q of form.questions ?? []) {
    const raw = answers[q.id];
    let a = '';
    if (Array.isArray(raw)) {
      a = raw
        .map((v) => (typeof v === 'string' ? v : ''))
        .filter(Boolean)
        .join('、');
    } else if (typeof raw === 'string') {
      a = raw.trim();
    } else if (raw == null) {
      a = '';
    } else {
      a = String(raw);
    }
    if (!a) continue;
    items.push({ q: q.title, a });
  }

  return { title: form.title || '問卷', items };
}

export default function SurveyResponsesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [userEmail, setUserEmail] = useState<string>('');
  const [rows, setRows] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!data.session) {
        router.replace('/login');
        return;
      }

      setUserEmail(data.session.user.email ?? '');
      await reload();
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login');
      else setUserEmail(session.user.email ?? '');
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase]);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('survey')
        .select('id, created_at, session_id, payload, schema_version')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setRows((data ?? []) as unknown as SurveyRow[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || '讀取失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100svh] bg-black text-white selection:bg-amber-500/30 overflow-x-hidden">
      <div className="mx-auto max-w-5xl min-h-[100svh] flex flex-col">
        <div className="sticky top-0 z-10 bg-black/30 backdrop-blur-3xl border-b border-white/10">
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
            <div>
              <div className="font-semibold tracking-tight">問卷作答紀錄</div>
              <div className="text-xs text-white/50 mt-0.5">{userEmail ? `登入中：${userEmail}` : ''}</div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/survey"
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 active:bg-white/15"
              >
                回問卷設定
              </Link>
              <Link
                href="/dashboard/leads"
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 active:bg-white/15"
              >
                業務後台
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.replace('/login');
                }}
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 active:bg-white/15"
              >
                登出
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 sm:px-6 py-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="font-semibold tracking-tight">最近 200 筆</div>
                <div className="text-xs text-white/50 mt-0.5">點選一筆可展開查看 Q&A。</div>
              </div>
              <button
                type="button"
                onClick={reload}
                disabled={loading}
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 active:bg-white/15 disabled:opacity-50"
              >
                {loading ? '讀取中…' : '重新載入'}
              </button>
            </div>

            {error ? (
              <div className="m-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <div className="px-4 py-4">
              {loading ? (
                <div className="text-sm text-white/50">讀取中…</div>
              ) : rows.length === 0 ? (
                <div className="text-sm text-white/50">尚無作答</div>
              ) : (
                <div className="space-y-3">
                  {rows.map((r) => {
                    const opened = openId === r.id;

                    let title = '問卷';
                    let items: Array<{ q: string; a: string }> = [];
                    if (r.schema_version === 2) {
                      const formatted = formatDynamicPayload(r.payload);
                      title = formatted.title;
                      items = formatted.items;
                    } else {
                      items = formatLegacyPayload(r.payload);
                    }

                    return (
                      <div key={r.id} className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenId(opened ? null : r.id)}
                          className="w-full text-left px-4 py-3 hover:bg-white/5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium text-white">{title}</div>
                              <div className="mt-0.5 text-xs text-white/50">
                                {new Date(r.created_at).toLocaleString('zh-TW')} · session：{r.session_id}
                              </div>
                            </div>
                            <div className="text-xs text-white/50">#{r.id}</div>
                          </div>
                        </button>

                        {opened ? (
                          <div className="px-4 pb-4">
                            {items.length === 0 ? (
                              <div className="text-sm text-white/50">（無內容）</div>
                            ) : (
                              <div className="space-y-2">
                                {items.map((it, idx) => (
                                  <div key={`${r.id}-${idx}`} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                                    <div className="text-xs font-medium text-white/70">{it.q}</div>
                                    <div className="mt-1 text-sm text-white whitespace-pre-line">{it.a}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-3 text-xs text-white/50">
                若這頁看不到資料，多半是 RLS / user_id 沒對上；確認前台送出問卷時能寫入正確 user_id（通常由 DEFAULT_OWNER_USER_ID 或登入 token 決定）。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
