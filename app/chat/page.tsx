'use client';

import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';
import { Send } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BusinessCardView } from '@/app/components/BusinessCardView';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import {
  BUSINESS_CARD_STORAGE_KEY,
  DEFAULT_BUSINESS_CARD,
  safeParseBusinessCard,
  type BusinessCard,
} from '@/lib/businessCard';

export default function ChatPage() {
  const [mode, setMode] = useState<'chat' | 'survey' | 'card'>('chat');

  const [sessionId] = useState<string>(() => {
    const key = 'ai-chat-session:v1';
    try {
      const existing = localStorage.getItem(key);
      if (existing && existing.trim()) return existing;

      const next =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);
      localStorage.setItem(key, next);
      return next;
    } catch {
      return Math.random().toString(36).slice(2);
    }
  });
  const [authAccessToken, setAuthAccessToken] = useState<string>('');

  const didLogVisitRef = useRef(false);

  const [businessCard, setBusinessCard] = useState<BusinessCard>(
    DEFAULT_BUSINESS_CARD,
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BUSINESS_CARD_STORAGE_KEY);
      if (!raw) return;
      const parsed = safeParseBusinessCard(JSON.parse(raw));
      if (parsed) setBusinessCard(parsed);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    if (didLogVisitRef.current) return;
    didLogVisitRef.current = true;

    fetch('/api/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, path: '/chat' }),
    }).catch(() => {
      // ignore
    });
  }, [sessionId]);

  useEffect(() => {
    // Optional: if business user is logged in, attach their JWT so backend can
    // write rows with the correct user_id (RLS select will then work).
    let supabase: ReturnType<typeof createSupabaseBrowserClient> | null = null;
    try {
      supabase = createSupabaseBrowserClient();
    } catch {
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAuthAccessToken(data.session?.access_token ?? '');
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthAccessToken(session?.access_token ?? '');
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // 1. 手動管理輸入框狀態
  const [myInput, setMyInput] = useState('');

  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadReason, setLeadReason] = useState('');
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSubmitError, setLeadSubmitError] = useState<string | null>(null);
  const [leadSubmitSuccess, setLeadSubmitSuccess] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: '',
    phone: '',
    line: '',
    email: '',
    note: '',
  });

  const lastLeadTriggerKeyRef = useRef<string | null>(null);

  const [surveyForm, setSurveyForm] = useState({
    goal: '',
    budget: '',
    timeline: '',
    tradeIn: '',
    note: '',
  });
  const [surveySubmitting, setSurveySubmitting] = useState(false);

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport: new TextStreamChatTransport({
      api: '/api/chat',
      body: () => ({ sessionId }),
      headers: () => {
        const headers: Record<string, string> = {};
        if (authAccessToken) headers.Authorization = `Bearer ${authAccessToken}`;
        return headers;
      },
    }),
    onError: (err) => {
      console.error('❌ 後端報錯:', err);
      alert('發送失敗，請看 Console 錯誤訊息');
    },
  });

  useEffect(() => {
    if (!sessionId) return;
    const supabase = createSupabaseBrowserClient();

    const asRecord = (v: unknown): Record<string, unknown> | null =>
      v && typeof v === 'object' ? (v as Record<string, unknown>) : null;

    // 1. 監聽 Postgres Changes (若 RLS 允許)
    const dbChannel = supabase
      .channel(`db-messages-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = asRecord(payload.new);
          const role = typeof row?.role === 'string' ? row.role : '';
          const content = typeof row?.content === 'string' ? row.content : '';
          const id = row?.id != null ? String(row.id) : '';
          const createdAtRaw = typeof row?.created_at === 'string' ? row.created_at : '';

          if (role === 'agent') {
            setMessages((prev) => {
              if (id && prev.some((m) => m.id === id)) return prev;
              const nextMsg = {
                id: id || `db-${Date.now()}`,
                role: 'agent',
                content,
                createdAt: createdAtRaw ? new Date(createdAtRaw) : new Date(),
                parts: [{ type: 'text', text: content }],
              };
              return [...prev, nextMsg as unknown as (typeof prev)[number]];
            });
          }
        },
      )
      .subscribe();

    // 2. 監聽 Broadcast (繞過 RLS，即時性高)
    const broadcastChannel = supabase
      .channel(`session-${sessionId}`)
      .on('broadcast', { event: 'agent-message' }, (payload) => {
        const msg = asRecord(payload.payload);
        const content = typeof msg?.content === 'string' ? msg.content : '';
        const createdAtRaw = typeof msg?.created_at === 'string' ? msg.created_at : '';
        setMessages((prev) => {
          // 避免重複 (雖然 broadcast 沒有 ID，但可以用內容+時間判斷，或乾脆不判斷，因為通常不會重複)
          // 這裡簡單用時間戳記當 ID
          const tempId = `broadcast-${Date.now()}`;
          const nextMsg = {
            id: tempId,
            role: 'agent',
            content,
            createdAt: createdAtRaw ? new Date(createdAtRaw) : new Date(),
            parts: [{ type: 'text', text: content }],
          };
          return [...prev, nextMsg as unknown as (typeof prev)[number]];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(broadcastChannel);
    };
  }, [sessionId, setMessages]);

  const submitSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'streaming' || surveySubmitting) return;

    try {
      setSurveySubmitting(true);
      const res = await fetch('/api/survey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authAccessToken ? { Authorization: `Bearer ${authAccessToken}` } : {}),
        },
        body: JSON.stringify({ sessionId, ...surveyForm }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || '送出失敗');
      }
      setMode('chat');
      setSurveyForm({ goal: '', budget: '', timeline: '', tradeIn: '', note: '' });
    } catch (err) {
      console.error('送出問卷失敗:', err);
      alert('送出失敗，請看 Console 錯誤訊息');
    } finally {
      setSurveySubmitting(false);
    }
  };

  // 2. 自定義發送函式
  const handleMySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!myInput.trim()) return;

    if (!sessionId) {
      console.warn('sessionId not ready yet; skip sending');
      alert('初始化中，請稍等 1 秒再送出');
      return;
    }

    console.log('🚀 準備發送訊息:', myInput);

    try {
      // 3. 使用 sendMessage 加入使用者訊息並呼叫 API
      await sendMessage({
        text: myInput,
      });

      console.log('✅ 發送指令已送出');
      setMyInput(''); // 清空輸入框
    } catch (err) {
      console.error('發送過程發生錯誤:', err);
    }
  };

  const hasToolPart = (parts: Array<{ type: string }>) =>
    parts.some(
      (p) =>
        p.type === 'dynamic-tool' ||
        p.type === 'tool-call' ||
        p.type === 'tool-result' ||
        p.type === 'tool-error' ||
        p.type.startsWith('tool-'),
    );

  const getTextParts = (parts: Array<{ type: string }>) =>
    parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('');

  const findContactFormTrigger = useMemo(() => {
    const asRecord = (v: unknown): Record<string, unknown> | null =>
      v && typeof v === 'object' ? (v as Record<string, unknown>) : null;

    // 從最新訊息往回找，避免漏掉 streaming 過程中的 tool part
    for (let mi = messages.length - 1; mi >= 0; mi--) {
      const m = asRecord((messages as unknown as unknown[])[mi]);
      const rawParts = Array.isArray(m?.parts) ? m?.parts : [];
      if (!m || rawParts.length === 0) continue;

      for (let pi = 0; pi < rawParts.length; pi++) {
        const part = asRecord(rawParts[pi]);
        const type = typeof part?.type === 'string' ? part.type : '';

        const toolNameFromType = type.startsWith('tool-') ? type.slice(5) : '';
        const toolName =
          toolNameFromType ||
          (typeof part?.toolName === 'string' ? part.toolName : '') ||
          (typeof part?.name === 'string' ? part.name : '') ||
          (typeof asRecord(part?.tool)?.name === 'string' ? String(asRecord(part?.tool)?.name) : '');

        if (toolName !== 'requestContactForm') continue;

        const toolCallId =
          (typeof part?.toolCallId === 'string' ? part.toolCallId : '') ||
          (typeof part?.id === 'string' ? part.id : '');

        const payload = asRecord(
          part?.result ?? part?.output ?? part?.args ?? part?.input ?? part?.data ?? null,
        );

        const reason =
          (typeof payload?.reason === 'string' && payload.reason) ||
          (typeof part?.reason === 'string' && part.reason) ||
          '為了安排後續服務，請留下聯絡方式';

        const suggestedNote =
          (typeof payload?.suggestedNote === 'string' && payload.suggestedNote) ||
          '';

        const key = `${(typeof m.id === 'string' ? m.id : String(m.id ?? mi))}:${toolCallId || pi}`;
        console.debug('[lead] tool-trigger', { key, toolName, type, payload });
        return { key, reason, suggestedNote };
      }
    }

    // Fallback：模型沒有呼叫工具時，以文字判斷是否需要彈窗
    for (let mi = messages.length - 1; mi >= 0; mi--) {
      const m = asRecord((messages as unknown as unknown[])[mi]);
      if (!m || m.role !== 'assistant') continue;
      const rawParts = Array.isArray(m.parts) ? m.parts : [];
      if (rawParts.length === 0) continue;

      const text = getTextParts(rawParts as Array<{ type: string }>).trim();
      if (!text) continue;

      const normalized = text.toLowerCase();
      const strongPhrases = [
        '填寫表單',
        '填表單',
        '填一下表單',
        '留下聯絡方式',
        '留下你的聯絡方式',
        '留下您的聯絡方式',
        '留下資料',
        '留資料',
        '提供聯絡方式',
        '提供電話',
        '留電話',
        '留手機',
        '留下電話',
        '留下手機',
        '留下信箱',
        '留下 email',
        '留下 line',
        '留下line',
        '留下line id',
        '留下lineid',
      ];

      const intentWords = [
        '表單',
        '聯絡方式',
        '聯絡',
        '聯繫',
        '電話',
        '手機',
        '回電',
        '回撥',
        '預約',
        '賞車',
        '試乘',
        '報價',
        '估價',
        '安排',
      ];

      const hitStrong = strongPhrases.some((p) => normalized.includes(p));
      const hitIntent =
        (normalized.includes('留') ||
          normalized.includes('留下') ||
          normalized.includes('提供') ||
          normalized.includes('填')) &&
        intentWords.some((w) => normalized.includes(w));

      const hit = hitStrong || hitIntent;

      if (!hit) continue;

      const key = `fallback:${m.id || mi}`;
      console.debug('[lead] text-fallback-trigger', { key, text });
      return { key, reason: '為了安排後續服務，請留下聯絡方式', suggestedNote: '' };
    }
    return null;
  }, [messages]);

  useEffect(() => {
    if (mode !== 'chat') return;
    if (!findContactFormTrigger) return;

    if (lastLeadTriggerKeyRef.current === findContactFormTrigger.key) return;
    lastLeadTriggerKeyRef.current = findContactFormTrigger.key;

    setLeadReason(findContactFormTrigger.reason);
    setLeadSubmitError(null);
    setLeadSubmitSuccess(false);
    setLeadForm((prev) => ({
      ...prev,
      note: findContactFormTrigger.suggestedNote || prev.note,
    }));
    setLeadModalOpen(true);
  }, [findContactFormTrigger, mode]);

  const templates: Array<BusinessCard['template']> = [
    'classic',
    'impact',
    'gallery',
    'split',
  ];

  const persistBusinessCard = (next: BusinessCard) => {
    setBusinessCard(next);
    try {
      localStorage.setItem(BUSINESS_CARD_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const setTemplate = (template: BusinessCard['template']) => {
    persistBusinessCard({ ...businessCard, template });
  };

  const cycleTemplate = (dir: -1 | 1) => {
    const idx = templates.indexOf(businessCard.template);
    const nextIndex = (idx + dir + templates.length) % templates.length;
    setTemplate(templates[nextIndex]);
  };

  return (
    <div className="min-h-[100svh] bg-gray-50">
      <div className="mx-auto max-w-5xl min-h-[100svh] flex flex-col">
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200">
          <div className="px-4 sm:px-6 py-4 text-gray-900 flex items-center justify-between">
            <div className="font-semibold tracking-tight">
              {mode === 'chat' ? '聊天模式' : mode === 'survey' ? '問卷模式' : '名片模式'}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
              >
                首頁
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
              >
                業務登入
              </Link>
              <Link
                href="/import"
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
              >
                匯入名片
              </Link>
              <Link
                href="/dashboard"
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
              >
                Dashboard
              </Link>

              <button
                type="button"
                onClick={() => setMode('chat')}
                aria-pressed={mode === 'chat'}
                className={
                  mode === 'chat'
                    ? 'text-sm font-medium px-3 py-1.5 rounded-full bg-gray-950 text-white hover:bg-gray-900 active:bg-gray-900'
                    : 'text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100'
                }
              >
                聊天
              </button>
              <button
                type="button"
                onClick={() => setMode('survey')}
                aria-pressed={mode === 'survey'}
                className={
                  mode === 'survey'
                    ? 'text-sm font-medium px-3 py-1.5 rounded-full bg-gray-950 text-white hover:bg-gray-900 active:bg-gray-900'
                    : 'text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100'
                }
              >
                問卷
              </button>
              <button
                type="button"
                onClick={() => setMode('card')}
                aria-pressed={mode === 'card'}
                className={
                  mode === 'card'
                    ? 'text-sm font-medium px-3 py-1.5 rounded-full bg-gray-950 text-white hover:bg-gray-900 active:bg-gray-900'
                    : 'text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100'
                }
              >
                名片
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-2 text-sm text-center">錯誤: {error.message}</div>
        )}

        {mode === 'chat' ? (
          <div className="flex-1 px-3 sm:px-6 py-4 flex justify-center">
            <div className="w-full max-w-md flex flex-col rounded-2xl sm:rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 && (
                  <div className="text-center text-gray-400 mt-10">請輸入訊息開始對話</div>
                )}

                {messages.map((m, i) => {
                  const isAgent = String((m as { role?: unknown }).role || '') === 'agent';
                  return (
                    <div
                      key={`${m.id}-${i}`}
                      className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          m.role === 'user'
                            ? 'bg-gray-950 text-white'
                            : isAgent
                              ? 'bg-blue-50 border border-blue-200 text-blue-900'
                              : 'bg-white border border-gray-200 text-gray-900'
                        }`}
                      >
                        {isAgent ? (
                          <div className="text-[10px] font-bold text-blue-600 mb-1">業務人員</div>
                        ) : null}
                        {hasToolPart(m.parts) ? (
                          <span className="italic opacity-80">🤖 正在處理預約...</span>
                        ) : (
                          getTextParts(m.parts)
                        )}
                      </div>
                    </div>
                  );
                })}

                {status === 'streaming' && (
                  <div className="text-gray-400 text-xs ml-2">AI 正在思考...</div>
                )}
              </div>

              <form onSubmit={handleMySubmit} className="p-3 bg-white border-t flex gap-2">
                <input
                  className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-gray-900 bg-white"
                  value={myInput}
                  onChange={(e) => setMyInput(e.target.value)}
                  placeholder={sessionId ? '輸入訊息...' : '初始化中...'}
                  disabled={status === 'streaming' || !sessionId}
                />
                <button
                  type="submit"
                  disabled={status === 'streaming' || !myInput.trim() || !sessionId}
                  className="bg-gray-950 text-white p-2 rounded-full hover:bg-gray-900 disabled:bg-gray-400 transition"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>

            {leadModalOpen && (
              <div className="fixed inset-0 z-20">
                <div className="absolute inset-0 bg-black/30" onClick={() => setLeadModalOpen(false)} />
                <div className="absolute inset-0 flex items-end sm:items-center justify-center p-3 sm:p-6">
                  <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-200">
                      <div className="text-gray-900 font-semibold tracking-tight">留下聯絡方式</div>
                      <div className="mt-1 text-sm text-gray-600">{leadReason}</div>
                    </div>

                    <form
                      className="px-5 py-5 space-y-3"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setLeadSubmitting(true);
                        setLeadSubmitError(null);

                        try {
                          const res = await fetch('/api/leads', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              ...(authAccessToken
                                ? { Authorization: `Bearer ${authAccessToken}` }
                                : {}),
                            },
                            body: JSON.stringify({ ...leadForm, sessionId }),
                          });
                          if (!res.ok) {
                            const text = await res.text().catch(() => '');
                            throw new Error(text || '送出失敗');
                          }
                          setLeadSubmitSuccess(true);
                          setLeadModalOpen(false);

                          try {
                            await sendMessage({
                              text: '我已送出聯絡方式表單，請協助安排後續聯繫。',
                            });
                          } catch {
                            // ignore
                          }
                        } catch (err: unknown) {
                          const msg = err instanceof Error ? err.message : String(err);
                          setLeadSubmitError(msg || '送出失敗');
                        } finally {
                          setLeadSubmitting(false);
                        }
                      }}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block">
                          <div className="text-xs font-medium text-gray-600">稱呼 *</div>
                          <input
                            className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                            value={leadForm.name}
                            onChange={(e) => setLeadForm((p) => ({ ...p, name: e.target.value }))}
                            required
                          />
                        </label>
                        <label className="block">
                          <div className="text-xs font-medium text-gray-600">電話 *</div>
                          <input
                            className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                            value={leadForm.phone}
                            onChange={(e) => setLeadForm((p) => ({ ...p, phone: e.target.value }))}
                            required
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block">
                          <div className="text-xs font-medium text-gray-600">LINE</div>
                          <input
                            className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                            value={leadForm.line}
                            onChange={(e) => setLeadForm((p) => ({ ...p, line: e.target.value }))}
                          />
                        </label>
                        <label className="block">
                          <div className="text-xs font-medium text-gray-600">Email</div>
                          <input
                            className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                            value={leadForm.email}
                            onChange={(e) => setLeadForm((p) => ({ ...p, email: e.target.value }))}
                          />
                        </label>
                      </div>

                      <label className="block">
                        <div className="text-xs font-medium text-gray-600">需求/備註</div>
                        <textarea
                          className="mt-1 w-full min-h-[88px] rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                          value={leadForm.note}
                          onChange={(e) => setLeadForm((p) => ({ ...p, note: e.target.value }))}
                        />
                      </label>

                      {leadSubmitError ? (
                        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-3 py-2">
                          {leadSubmitError}
                        </div>
                      ) : null}

                      {leadSubmitSuccess ? (
                        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-2xl px-3 py-2">
                          已送出，謝謝！
                        </div>
                      ) : null}

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setLeadModalOpen(false)}
                          className="flex-1 border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 rounded-full py-2.5 font-medium"
                          disabled={leadSubmitting}
                        >
                          取消
                        </button>
                        <button
                          type="submit"
                          className="flex-1 bg-gray-950 hover:bg-gray-900 text-white rounded-full py-2.5 font-medium disabled:bg-gray-400"
                          disabled={leadSubmitting || !leadForm.name.trim() || !leadForm.phone.trim()}
                        >
                          {leadSubmitting ? '送出中…' : '送出'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : mode === 'survey' ? (
          <div className="flex-1 px-3 sm:px-6 py-6 flex items-start justify-center">
            <div className="w-full max-w-md rounded-2xl sm:rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <div className="text-gray-900 font-semibold tracking-tight">購車問卷</div>
                <div className="mt-1 text-sm text-gray-600">填完後會把內容送到聊天，方便接續服務。</div>
              </div>

              <form className="px-5 py-5 space-y-3" onSubmit={submitSurvey}>
                <label className="block">
                  <div className="text-xs font-medium text-gray-600">需求/目的 *</div>
                  <input
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                    value={surveyForm.goal}
                    onChange={(e) => setSurveyForm((p) => ({ ...p, goal: e.target.value }))}
                    placeholder="例如：通勤代步 / 家用 / 休旅 / 省油"
                    required
                    disabled={status === 'streaming' || surveySubmitting}
                  />
                </label>

                <label className="block">
                  <div className="text-xs font-medium text-gray-600">預算</div>
                  <select
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                    value={surveyForm.budget}
                    onChange={(e) => setSurveyForm((p) => ({ ...p, budget: e.target.value }))}
                    disabled={status === 'streaming' || surveySubmitting}
                  >
                    <option value="">（未填）</option>
                    <option value="50 萬以下">50 萬以下</option>
                    <option value="50–80 萬">50–80 萬</option>
                    <option value="80–120 萬">80–120 萬</option>
                    <option value="120–200 萬">120–200 萬</option>
                    <option value="200 萬以上">200 萬以上</option>
                  </select>
                </label>

                <label className="block">
                  <div className="text-xs font-medium text-gray-600">購買時間</div>
                  <select
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                    value={surveyForm.timeline}
                    onChange={(e) => setSurveyForm((p) => ({ ...p, timeline: e.target.value }))}
                    disabled={status === 'streaming' || surveySubmitting}
                  >
                    <option value="">（未填）</option>
                    <option value="1 週內">1 週內</option>
                    <option value="1 個月內">1 個月內</option>
                    <option value="1–3 個月">1–3 個月</option>
                    <option value="3 個月以上">3 個月以上</option>
                    <option value="尚未確定">尚未確定</option>
                  </select>
                </label>

                <label className="block">
                  <div className="text-xs font-medium text-gray-600">是否舊車換購</div>
                  <select
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                    value={surveyForm.tradeIn}
                    onChange={(e) => setSurveyForm((p) => ({ ...p, tradeIn: e.target.value }))}
                    disabled={status === 'streaming' || surveySubmitting}
                  >
                    <option value="">（未填）</option>
                    <option value="是">是</option>
                    <option value="否">否</option>
                    <option value="不確定">不確定</option>
                  </select>
                </label>

                <label className="block">
                  <div className="text-xs font-medium text-gray-600">其他備註</div>
                  <textarea
                    className="mt-1 w-full min-h-[88px] rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                    value={surveyForm.note}
                    onChange={(e) => setSurveyForm((p) => ({ ...p, note: e.target.value }))}
                    disabled={status === 'streaming' || surveySubmitting}
                  />
                </label>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setMode('chat')}
                    className="flex-1 border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 rounded-full py-2.5 font-medium"
                    disabled={status === 'streaming' || surveySubmitting}
                  >
                    回聊天
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gray-950 hover:bg-gray-900 text-white rounded-full py-2.5 font-medium disabled:bg-gray-400"
                    disabled={status === 'streaming' || surveySubmitting || !surveyForm.goal.trim()}
                  >
                    {surveySubmitting ? '送出中…' : '送出問卷'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 px-3 sm:px-6 py-6 flex items-start justify-center">
            <div className="w-full">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600">
                  模板：<span className="text-gray-900 font-medium">{businessCard.template}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => cycleTemplate(-1)}
                    className="px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 text-sm font-medium"
                  >
                    上一個
                  </button>
                  <button
                    type="button"
                    onClick={() => cycleTemplate(1)}
                    className="px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 text-sm font-medium"
                  >
                    下一個
                  </button>
                </div>
              </div>

              <BusinessCardView
                card={businessCard}
                cta={
                  <button
                    type="button"
                    onClick={() => setMode('chat')}
                    className="w-full bg-gray-950 text-white rounded-full py-2.5 font-medium hover:bg-gray-900 transition"
                  >
                    開始聊天
                  </button>
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
