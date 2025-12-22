'use client';

import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';
import { Send } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BusinessCardView } from '@/app/components/BusinessCardView';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import {
  BUSINESS_CARD_STORAGE_KEY,
  DEFAULT_BUSINESS_CARD,
  safeParseBusinessCard,
  type BusinessCard,
} from '@/lib/businessCard';

export default function Chat() {
  const [mode, setMode] = useState<'chat' | 'card'>('chat');

  const [sessionId, setSessionId] = useState<string>('');
  const [authAccessToken, setAuthAccessToken] = useState<string>('');

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
    const key = 'ai-chat-session:v1';
    try {
      const existing = localStorage.getItem(key);
      if (existing && existing.trim()) {
        setSessionId(existing);
        return;
      }

      const next =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);
      localStorage.setItem(key, next);
      setSessionId(next);
    } catch {
      const next = Math.random().toString(36).slice(2);
      setSessionId(next);
    }
  }, []);

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

  const { messages, sendMessage, status, error } = useChat({
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
      console.error("❌ 後端報錯:", err);
      alert("發送失敗，請看 Console 錯誤訊息");
    },
  });

  // 2. 自定義發送函式
  const handleMySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!myInput.trim()) return; 

    console.log("🚀 準備發送訊息:", myInput);

    try {
      // 3. 使用 sendMessage 加入使用者訊息並呼叫 API
      await sendMessage({
        text: myInput,
      });
      
      console.log("✅ 發送指令已送出");
      setMyInput(''); // 清空輸入框
    } catch (err) {
      console.error("發送過程發生錯誤:", err);
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
    // 從最新訊息往回找，避免漏掉 streaming 過程中的 tool part
    for (let mi = messages.length - 1; mi >= 0; mi--) {
      const m: any = messages[mi];
      if (!m || !Array.isArray(m.parts)) continue;

      for (let pi = 0; pi < m.parts.length; pi++) {
        const part: any = m.parts[pi];
        const type = typeof part?.type === 'string' ? part.type : '';

        const toolNameFromType = type.startsWith('tool-') ? type.slice(5) : '';
        const toolName =
          toolNameFromType ||
          (typeof part?.toolName === 'string' ? part.toolName : '') ||
          (typeof part?.name === 'string' ? part.name : '') ||
          (typeof part?.tool?.name === 'string' ? part.tool.name : '');

        if (toolName !== 'requestContactForm') continue;

        const toolCallId =
          (typeof part?.toolCallId === 'string' ? part.toolCallId : '') ||
          (typeof part?.id === 'string' ? part.id : '');

        const payload =
          part?.result ??
          part?.output ??
          part?.args ??
          part?.input ??
          part?.data ??
          null;

        const reason =
          (typeof payload?.reason === 'string' && payload.reason) ||
          (typeof part?.reason === 'string' && part.reason) ||
          '為了安排後續服務，請留下聯絡方式';

        const suggestedNote =
          (typeof payload?.suggestedNote === 'string' && payload.suggestedNote) ||
          '';

        const key = `${m.id || mi}:${toolCallId || pi}`;
        console.debug('[lead] tool-trigger', { key, toolName, type, payload });
        return { key, reason, suggestedNote };
      }
    }

    // Fallback：模型沒有呼叫工具時，以文字判斷是否需要彈窗
    for (let mi = messages.length - 1; mi >= 0; mi--) {
      const m: any = messages[mi];
      if (!m || m.role !== 'assistant' || !Array.isArray(m.parts)) continue;

      const text = getTextParts(m.parts).trim();
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
        (normalized.includes('留') || normalized.includes('留下') || normalized.includes('提供') || normalized.includes('填')) &&
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
      
      {/* 標題 */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200">
          <div className="px-4 sm:px-6 py-4 text-gray-900 flex items-center justify-between">
            <div className="font-semibold tracking-tight">
              {mode === 'chat' ? '聊天模式' : '名片模式'}
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/login"
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
              >
                業務登入
              </a>
              <a
                href="/import"
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
              >
                匯入名片
              </a>
              <a
                href="/dashboard"
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
              >
                Dashboard
              </a>
              <button
                type="button"
                onClick={() => setMode((m) => (m === 'chat' ? 'card' : 'chat'))}
                aria-pressed={mode === 'card'}
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
              >
                {mode === 'chat' ? '切換名片' : '切換聊天'}
              </button>
            </div>
          </div>
        </div>

      {/* 錯誤顯示 */}
      {error && (
        <div className="bg-red-100 text-red-700 p-2 text-sm text-center">
          錯誤: {error.message}
        </div>
      )}

        {mode === 'chat' ? (
          <div className="flex-1 px-3 sm:px-6 py-4 flex justify-center">
            <div className="w-full max-w-md flex flex-col rounded-2xl sm:rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {/* 聊天內容 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 && (
                  <div className="text-center text-gray-400 mt-10">
                    請輸入訊息開始對話
                  </div>
                )}

                {messages.map((m, i) => (
                  <div
                    key={`${m.id}-${i}`}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        m.role === 'user'
                          ? 'bg-gray-950 text-white'
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    >
                      {hasToolPart(m.parts) ? (
                        <span className="italic opacity-80">🤖 正在處理預約...</span>
                      ) : (
                        getTextParts(m.parts)
                      )}
                    </div>
                  </div>
                ))}

                {status === 'streaming' && (
                  <div className="text-gray-400 text-xs ml-2">AI 正在思考...</div>
                )}
              </div>

              {/* 輸入區 */}
              <form onSubmit={handleMySubmit} className="p-3 bg-white border-t flex gap-2">
                <input
                  className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-gray-900 bg-white"
                  value={myInput}
                  onChange={(e) => setMyInput(e.target.value)}
                  placeholder="輸入訊息..."
                  disabled={status === 'streaming'}
                />
                <button
                  type="submit"
                  disabled={status === 'streaming' || !myInput.trim()}
                  className="bg-gray-950 text-white p-2 rounded-full hover:bg-gray-900 disabled:bg-gray-400 transition"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>

            {/* 聯絡方式表單 Modal */}
            {leadModalOpen && (
              <div className="fixed inset-0 z-20">
                <div
                  className="absolute inset-0 bg-black/30"
                  onClick={() => setLeadModalOpen(false)}
                />
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

                          // 讓 AI 回覆確認，避免留單後畫面空著
                          try {
                            await sendMessage({
                              text: '我已送出聯絡方式表單，請協助安排後續聯繫。',
                            });
                          } catch {
                            // ignore
                          }
                        } catch (err: any) {
                          setLeadSubmitError(err?.message || '送出失敗');
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
                            onChange={(e) =>
                              setLeadForm((p) => ({ ...p, name: e.target.value }))
                            }
                            required
                          />
                        </label>
                        <label className="block">
                          <div className="text-xs font-medium text-gray-600">電話 *</div>
                          <input
                            className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                            value={leadForm.phone}
                            onChange={(e) =>
                              setLeadForm((p) => ({ ...p, phone: e.target.value }))
                            }
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
                            onChange={(e) =>
                              setLeadForm((p) => ({ ...p, line: e.target.value }))
                            }
                          />
                        </label>
                        <label className="block">
                          <div className="text-xs font-medium text-gray-600">Email</div>
                          <input
                            className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                            value={leadForm.email}
                            onChange={(e) =>
                              setLeadForm((p) => ({ ...p, email: e.target.value }))
                            }
                          />
                        </label>
                      </div>

                      <label className="block">
                        <div className="text-xs font-medium text-gray-600">需求/備註</div>
                        <textarea
                          className="mt-1 w-full min-h-[88px] rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                          value={leadForm.note}
                          onChange={(e) =>
                            setLeadForm((p) => ({ ...p, note: e.target.value }))
                        }
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