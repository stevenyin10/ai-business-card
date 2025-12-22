'use client';

import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type LeadRow = {
  id?: number | string;
  created_at?: string;
  name?: string;
  phone?: string;
  note?: string;
};

type MessageRow = {
  id: number;
  created_at: string;
  session_id: string;
  role: string;
  content: string;
};

export default function LeadsDashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [userEmail, setUserEmail] = useState<string>('');

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  const [sessions, setSessions] = useState<Array<{ sessionId: string; lastAt: string }>>(
    [],
  );
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

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
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login');
      else setUserEmail(session.user.email ?? '');
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router, supabase]);

  const refreshLeads = async () => {
    setLoadingLeads(true);
    setLeadsError(null);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setLeads((data as any[]) ?? []);
    } catch (e: any) {
      setLeadsError(e?.message || '讀取 leads 失敗');
    } finally {
      setLoadingLeads(false);
    }
  };

  const refreshSessions = async () => {
    setLoadingSessions(true);
    setSessionsError(null);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('session_id, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;

      const seen = new Set<string>();
      const list: Array<{ sessionId: string; lastAt: string }> = [];
      for (const row of (data as any[]) ?? []) {
        const sid = String(row.session_id || '');
        if (!sid || seen.has(sid)) continue;
        seen.add(sid);
        list.push({ sessionId: sid, lastAt: String(row.created_at || '') });
      }
      setSessions(list);
      if (!selectedSessionId && list.length > 0) setSelectedSessionId(list[0].sessionId);
    } catch (e: any) {
      setSessionsError(e?.message || '讀取 sessions 失敗');
    } finally {
      setLoadingSessions(false);
    }
  };

  const refreshMessages = async (sessionId: string) => {
    if (!sessionId) return;
    setLoadingMessages(true);
    setMessagesError(null);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(500);
      if (error) throw error;
      setMessages((data as any[]) ?? []);
    } catch (e: any) {
      setMessagesError(e?.message || '讀取 messages 失敗');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    // 首次載入
    refreshLeads();
    refreshSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refreshMessages(selectedSessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionId]);

  return (
    <div className="min-h-[100svh] bg-gray-50">
      <div className="mx-auto max-w-6xl min-h-[100svh] flex flex-col">
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200">
          <div className="px-4 sm:px-6 py-4 text-gray-900 flex items-center justify-between">
            <div>
              <div className="font-semibold tracking-tight">業務後台</div>
              <div className="text-xs text-gray-500 mt-0.5">{userEmail ? `登入中：${userEmail}` : ''}</div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/"
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
              >
                回首頁
              </a>
              <a
                href="/dashboard"
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
              >
                名片設定
              </a>
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.replace('/login');
                }}
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
              >
                登出
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leads */}
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <div className="text-gray-900 font-semibold tracking-tight">客戶留單（leads）</div>
                <div className="text-sm text-gray-600 mt-1">只會顯示屬於你帳號的資料（RLS）。</div>
              </div>
              <button
                type="button"
                onClick={refreshLeads}
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
                disabled={loadingLeads}
              >
                重新整理
              </button>
            </div>

            {leadsError && (
              <div className="m-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {leadsError}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">時間</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">電話</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">備註</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loadingLeads ? (
                    <tr>
                      <td className="px-4 py-4 text-sm text-gray-500" colSpan={4}>
                        讀取中…
                      </td>
                    </tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td className="px-4 py-4 text-sm text-gray-500" colSpan={4}>
                        尚無資料
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead, idx) => (
                      <tr key={String(lead.id ?? idx)} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {lead.created_at
                            ? new Date(lead.created_at).toLocaleString('zh-TW')
                            : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {lead.name ?? '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {lead.phone ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-pre-line">
                          {lead.note ?? '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Messages */}
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <div className="text-gray-900 font-semibold tracking-tight">聊天紀錄（messages）</div>
                <div className="text-sm text-gray-600 mt-1">依 session_id 分組查看。</div>
              </div>
              <button
                type="button"
                onClick={refreshSessions}
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
                disabled={loadingSessions}
              >
                重新整理
              </button>
            </div>

            {sessionsError && (
              <div className="m-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {sessionsError}
              </div>
            )}

            <div className="p-4 flex items-center gap-2">
              <select
                className="flex-1 rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
              >
                {sessions.length === 0 ? (
                  <option value="">尚無 session</option>
                ) : (
                  sessions.map((s) => (
                    <option key={s.sessionId} value={s.sessionId}>
                      {s.sessionId} ({s.lastAt ? new Date(s.lastAt).toLocaleString('zh-TW') : '-'})
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                onClick={() => refreshMessages(selectedSessionId)}
                className="px-3 py-2 rounded-2xl border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50"
                disabled={!selectedSessionId || loadingMessages}
              >
                讀取
              </button>
            </div>

            {messagesError && (
              <div className="mx-4 mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {messagesError}
              </div>
            )}

            <div className="px-4 pb-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 max-h-[520px] overflow-y-auto space-y-2">
                {loadingMessages ? (
                  <div className="text-sm text-gray-500">讀取中…</div>
                ) : messages.length === 0 ? (
                  <div className="text-sm text-gray-500">尚無訊息</div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line ${
                          m.role === 'user'
                            ? 'bg-gray-950 text-white'
                            : 'bg-white border border-gray-200 text-gray-900'
                        }`}
                      >
                        {m.content}
                        <div className="mt-1 text-[10px] opacity-60">
                          {new Date(m.created_at).toLocaleString('zh-TW')}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-2 text-xs text-gray-500">
                若看不到資料，通常是 RLS / user_id 沒對上，或 messages/leads 尚未加上 user_id。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
