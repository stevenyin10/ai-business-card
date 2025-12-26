'use client';

import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';

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

type VisitRow = {
  session_id: string;
  created_at: string;
};

export default function LeadsDashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

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

  const [agentInput, setAgentInput] = useState('');
  const [sendingAgentMessage, setSendingAgentMessage] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);

  const [systemPrompt, setSystemPrompt] = useState('');
  const [loadingSystemPrompt, setLoadingSystemPrompt] = useState(false);
  const [savingSystemPrompt, setSavingSystemPrompt] = useState(false);
  const [systemPromptError, setSystemPromptError] = useState<string | null>(null);

  const [isSessionsOpen, setIsSessionsOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isLeadsOpen, setIsLeadsOpen] = useState(true);

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
      setUserId(data.session.user.id);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login');
      else {
        setUserEmail(session.user.email ?? '');
        setUserId(session.user.id);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router, supabase]);

  const fetchSystemPrompt = async () => {
    setLoadingSystemPrompt(true);
    setSystemPromptError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? '';
      if (!token) throw new Error('尚未登入');

      const res = await fetch('/api/chat/settings', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || '讀取失敗');
      }
      const json = (await res.json()) as { systemPrompt?: string };
      setSystemPrompt(typeof json.systemPrompt === 'string' ? json.systemPrompt : '');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setSystemPromptError(msg || '讀取失敗');
    } finally {
      setLoadingSystemPrompt(false);
    }
  };

  const saveSystemPrompt = async () => {
    setSavingSystemPrompt(true);
    setSystemPromptError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? '';
      if (!token) throw new Error('尚未登入');

      const res = await fetch('/api/chat/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ systemPrompt }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || '保存失敗');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setSystemPromptError(msg || '保存失敗');
    } finally {
      setSavingSystemPrompt(false);
    }
  };

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
      setLeads(((data ?? []) as unknown) as LeadRow[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setLeadsError(msg || '讀取 leads 失敗');
    } finally {
      setLoadingLeads(false);
    }
  };

  const refreshSessions = async () => {
    setLoadingSessions(true);
    setSessionsError(null);
    try {
      const { data, error } = await supabase
        .from('visits')
        .select('session_id, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;

      const seen = new Set<string>();
      const list: Array<{ sessionId: string; lastAt: string }> = [];
      for (const row of ((data as unknown as VisitRow[]) ?? [])) {
        const sid = String(row.session_id || '');
        if (!sid || seen.has(sid)) continue;
        seen.add(sid);
        list.push({ sessionId: sid, lastAt: String(row.created_at || '') });
      }
      setSessions(list);
      if (!selectedSessionId && list.length > 0) setSelectedSessionId(list[0].sessionId);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setSessionsError(msg || '讀取 sessions 失敗');
    } finally {
      setLoadingSessions(false);
    }
  };

  const refreshMessages = async (sessionId: string) => {
    if (!sessionId) return;
    setLoadingMessages(true);
    setMessagesError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? '';
      if (!token) throw new Error('尚未登入');

      const res = await fetch(`/api/messages?sessionId=${encodeURIComponent(sessionId)}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || '讀取 messages 失敗');
      }
      const json = (await res.json()) as { messages?: unknown };
      const rows = Array.isArray(json.messages) ? json.messages : [];
      setMessages((rows as unknown) as MessageRow[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessagesError(msg || '讀取 messages 失敗');
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendAgentMessage = async () => {
    if (!agentInput.trim() || !selectedSessionId || !userId) return;
    setSendingAgentMessage(true);
    try {
      const { error } = await supabase.from('messages').insert({
        session_id: selectedSessionId,
        role: 'agent',
        content: agentInput.trim(),
        user_id: userId,
      });
      if (error) throw error;

      // 發送廣播通知前端 (因為前端 RLS 可能擋住 INSERT 監聽)
      const channel = supabase.channel(`session-${selectedSessionId}`);
      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'agent-message',
            payload: {
              role: 'agent',
              content: agentInput.trim(),
              created_at: new Date().toISOString(),
            },
          });
          supabase.removeChannel(channel);
        }
      });

      setAgentInput('');
      refreshMessages(selectedSessionId);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(msg || '發送失敗');
    } finally {
      setSendingAgentMessage(false);
    }
  };

  useEffect(() => {
    // 首次載入
    refreshLeads();
    refreshSessions();
    fetchSystemPrompt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAutoReplyStatus = async (sid: string) => {
    if (!sid) return;
    const { data } = await supabase
      .from('session_controls')
      .select('auto_reply_enabled')
      .eq('session_id', sid)
      .maybeSingle();
    // 若無資料預設為 true
    setAutoReplyEnabled(data?.auto_reply_enabled ?? true);
  };

  const toggleAutoReply = async () => {
    if (!selectedSessionId) return;
    const next = !autoReplyEnabled;
    setAutoReplyEnabled(next); // optimistic update

    const { error } = await supabase
      .from('session_controls')
      .upsert({ session_id: selectedSessionId, auto_reply_enabled: next });
    
    if (error) {
      alert('更新失敗');
      setAutoReplyEnabled(!next); // revert
    }
  };

  useEffect(() => {
    refreshMessages(selectedSessionId);
    fetchAutoReplyStatus(selectedSessionId);
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
              <Link
                href="/"
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
              >
                回首頁
              </Link>
              <Link
                href="/dashboard"
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
              >
                名片設定
              </Link>
              <Link
                href="/dashboard/survey"
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
              >
                問卷設定
              </Link>
              <Link
                href="/dashboard/knowledge"
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
              >
                知識庫
              </Link>
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

        <div className="flex-1 px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden lg:col-span-12">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <div className="font-semibold tracking-tight">聊天 Prompt 設定</div>
                <div className="text-xs text-gray-500 mt-0.5">這段會附加在系統提示詞後面，讓 AI 更符合你的銷售場景。</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchSystemPrompt}
                  disabled={loadingSystemPrompt}
                  className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-60"
                >
                  {loadingSystemPrompt ? '讀取中…' : '重新載入'}
                </button>
                <button
                  type="button"
                  onClick={saveSystemPrompt}
                  disabled={savingSystemPrompt}
                  className="text-sm font-medium px-3 py-1.5 rounded-full bg-gray-950 text-white hover:bg-gray-900 disabled:opacity-60"
                >
                  {savingSystemPrompt ? '保存中…' : '保存'}
                </button>
              </div>
            </div>

            <div className="px-5 py-4">
              {systemPromptError ? (
                <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {systemPromptError}
                </div>
              ) : null}

              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={6}
                placeholder="例如：\n- 你是某品牌汽車的資深銷售顧問\n- 價格請以本月活動為準，不確定就先問預算\n- 若客人提到試乘，先詢問地點與時間並引導留聯絡方式"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900"
              />
            </div>
          </div>

          {/* Visitors (sessions) */}
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden lg:col-span-3">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div 
                className="flex items-center gap-2 cursor-pointer select-none"
                onClick={() => setIsSessionsOpen(!isSessionsOpen)}
              >
                {isSessionsOpen ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                <div>
                  <div className="text-gray-900 font-semibold tracking-tight">訪客（visits）</div>
                  <div className="text-sm text-gray-600 mt-1">代表曾聊天/送出問卷的使用者。</div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  refreshSessions();
                }}
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
                disabled={loadingSessions}
              >
                重新整理
              </button>
            </div>

            {isSessionsOpen && (
              <>
            {sessionsError && (
              <div className="m-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {sessionsError}
              </div>
            )}

            <div className="p-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-2 max-h-[620px] overflow-y-auto">
                {loadingSessions ? (
                  <div className="text-sm text-gray-500 p-2">讀取中…</div>
                ) : sessions.length === 0 ? (
                  <div className="text-sm text-gray-500 p-2">尚無 session</div>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((s) => {
                      const active = s.sessionId === selectedSessionId;
                      return (
                        <button
                          key={s.sessionId}
                          type="button"
                          onClick={() => {
                            setSelectedSessionId(s.sessionId);
                            refreshMessages(s.sessionId);
                          }}
                          className={
                            active
                              ? 'w-full text-left rounded-2xl border border-gray-950 bg-gray-950 text-white px-3 py-2'
                              : 'w-full text-left rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 px-3 py-2'
                          }
                        >
                          <div className={active ? 'text-sm font-medium' : 'text-sm font-medium text-gray-900'}>
                            {s.sessionId}
                          </div>
                          <div className={active ? 'text-xs opacity-80 mt-0.5' : 'text-xs text-gray-500 mt-0.5'}>
                            最後活動：{s.lastAt ? new Date(s.lastAt).toLocaleString('zh-TW') : '-'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            </>
            )}
          </div>

          {/* Chat + Survey timeline */}
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden lg:col-span-6">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div 
                className="flex items-center gap-2 cursor-pointer select-none"
                onClick={() => setIsChatOpen(!isChatOpen)}
              >
                {isChatOpen ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                <div>
                  <div className="text-gray-900 font-semibold tracking-tight">聊天 / 問卷答覆</div>
                  <div className="text-sm text-gray-600 mt-1">依選取的 session 顯示時間軸。</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedSessionId && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAutoReply();
                    }}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                      autoReplyEnabled
                        ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                        : 'border-gray-300 bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {autoReplyEnabled ? 'AI 自動回覆：開啟' : 'AI 自動回覆：關閉'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    refreshMessages(selectedSessionId);
                  }}
                  className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
                  disabled={!selectedSessionId || loadingMessages}
                >
                  重新整理
                </button>
              </div>
            </div>

            {isChatOpen && (
              <>
            {messagesError && (
              <div className="m-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {messagesError}
              </div>
            )}

            <div className="px-4 py-4">
              {!selectedSessionId ? (
                <div className="text-sm text-gray-500">請先從左側選擇一個 session。</div>
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 max-h-[620px] overflow-y-auto space-y-2">
                  {loadingMessages ? (
                    <div className="text-sm text-gray-500">讀取中…</div>
                  ) : messages.length === 0 ? (
                    <div className="text-sm text-gray-500">尚無訊息</div>
                  ) : (
                    messages.map((m) => {
                      const isUser = m.role === 'user';
                      const isSurvey = m.role === 'survey';
                      const isAgent = m.role === 'agent';
                      const isAssistant = m.role === 'assistant';
                      return (
                        <div
                          key={m.id}
                          className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line ${
                              isUser
                                ? 'bg-gray-950 text-white'
                                : isAgent
                                  ? 'bg-blue-50 border border-blue-200 text-blue-900'
                                  : isSurvey
                                    ? 'bg-white border border-gray-200 text-gray-900'
                                    : 'bg-white border border-gray-200 text-gray-900'
                            }`}
                          >
                            {isSurvey ? (
                              <div className="text-[11px] font-medium text-gray-500 mb-1">問卷</div>
                            ) : isAgent ? (
                              <div className="text-[11px] font-medium text-blue-600 mb-1">業務介入</div>
                            ) : isAssistant ? (
                              <div className="text-[11px] font-medium text-gray-500 mb-1">AI</div>
                            ) : null}
                            {m.content}
                            <div className="mt-1 text-[10px] opacity-60">
                              {new Date(m.created_at).toLocaleString('zh-TW')}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {selectedSessionId && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={agentInput}
                    onChange={(e) => setAgentInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && sendAgentMessage()}
                    placeholder="輸入訊息介入對話..."
                    className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-gray-900 focus:outline-none"
                    disabled={sendingAgentMessage}
                  />
                  <button
                    type="button"
                    onClick={sendAgentMessage}
                    disabled={sendingAgentMessage || !agentInput.trim()}
                    className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    傳送
                  </button>
                </div>
              )}

              <div className="mt-2 text-xs text-gray-500">
                若看不到資料，通常是 RLS / user_id 沒對上，或 messages/leads 尚未加上 user_id。
              </div>
            </div>
            </>
            )}
          </div>

          {/* Leads (right) */}
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden lg:col-span-3">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div 
                className="flex items-center gap-2 cursor-pointer select-none"
                onClick={() => setIsLeadsOpen(!isLeadsOpen)}
              >
                {isLeadsOpen ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                <div>
                  <div className="text-gray-900 font-semibold tracking-tight">留下的名單（leads）</div>
                  <div className="text-sm text-gray-600 mt-1">只會顯示屬於你帳號的資料（RLS）。</div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  refreshLeads();
                }}
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
                disabled={loadingLeads}
              >
                重新整理
              </button>
            </div>

            {isLeadsOpen && (
              <>
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
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
