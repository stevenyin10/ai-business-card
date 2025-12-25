// app/api/chat/route.ts
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export const runtime = 'edge';

type WaitUntil = (promise: Promise<unknown>) => void;
let cachedWaitUntil: WaitUntil | null | undefined;

async function getWaitUntil(): Promise<WaitUntil | null> {
  if (cachedWaitUntil !== undefined) return cachedWaitUntil;
  try {
    const mod = (await import('@cloudflare/next-on-pages')) as {
      getRequestContext?: () => { ctx?: { waitUntil?: WaitUntil } } | undefined;
    };
    const ctx = mod.getRequestContext?.()?.ctx;
    cachedWaitUntil = typeof ctx?.waitUntil === 'function' ? ctx.waitUntil.bind(ctx) : null;
  } catch {
    cachedWaitUntil = null;
  }
  return cachedWaitUntil;
}

function getSupabaseProjectRef(): string {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  try {
    const u = new URL(url);
    const host = u.hostname;
    const parts = host.split('.');
    return parts[0] || host;
  } catch {
    return '';
  }
}

function getSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey);
}

type SupabaseAdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

async function getUserVectorStoreId(
  supabase: SupabaseAdminClient,
  userId: string,
): Promise<string> {
  try {
    const q = supabase
      .from('user_vector_stores')
      .select('vector_store_id')
      .eq('user_id', userId);
    const { data } =
      typeof (q as unknown as { maybeSingle?: () => Promise<{ data: unknown }> }).maybeSingle === 'function'
        ? await (q as unknown as { maybeSingle: () => Promise<{ data: unknown }> }).maybeSingle()
        : await (q as unknown as { single: () => Promise<{ data: unknown }> }).single();

    const row = (data ?? null) as { vector_store_id?: unknown } | null;
    return typeof row?.vector_store_id === 'string' ? row.vector_store_id : '';
  } catch {
    return '';
  }
}

const ChatBodySchema = z.object({
  sessionId: z.string().optional().default(''),
  messages: z.array(z.unknown()).default([]),
});

function pickFirstString(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function extractMessagesFromBody(raw: Record<string, unknown>): unknown[] {
  const direct = raw.messages;
  if (Array.isArray(direct)) return direct;

  // Common alternative shapes from chat SDKs / custom clients
  const prompt = pickFirstString(raw.prompt, raw.input, raw.text, raw.message);
  if (prompt) return [{ role: 'user', content: prompt }];

  const messageObj = raw.message;
  if (messageObj && typeof messageObj === 'object') {
    const m = messageObj as Record<string, unknown>;
    const content = pickFirstString(m.content, m.text);
    const role = pickFirstString(m.role) || 'user';
    if (content) return [{ role, content }];
  }

  return [];
}

function getBearerToken(req: Request): string {
  const raw = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return (m?.[1] || '').trim();
}

type GetUserResult = {
  data?: { user?: { id?: string } };
  error?: { message?: string } | null;
};

function hasAuthGetUser(
  client: unknown,
): client is { auth: { getUser: (token: string) => Promise<GetUserResult> } } {
  if (!client || typeof client !== 'object') return false;
  const c = client as Record<string, unknown>;
  if (!c.auth || typeof c.auth !== 'object') return false;
  const auth = c.auth as Record<string, unknown>;
  return typeof auth.getUser === 'function';
}

async function resolveOwnerUserId(req: Request, supabase: unknown | null) {
  const fallback = (process.env.DEFAULT_OWNER_USER_ID || '').trim();
  const token = getBearerToken(req);

  if (supabase && token && hasAuthGetUser(supabase)) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user?.id) return data.user.id;
      if (error) console.warn('[chat] resolveOwnerUserId: getUser failed:', error.message);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('[chat] resolveOwnerUserId: getUser threw:', msg);
    }
  }

  return fallback;
}

function findLastUserText(messages: unknown[]): string {
  for (let i = (messages?.length ?? 0) - 1; i >= 0; i--) {
    const raw = messages[i];
    if (!raw || typeof raw !== 'object') continue;
    const m = raw as Record<string, unknown>;
    if (m.role !== 'user') continue;
    const t = extractTextFromUiMessage(m);
    if (t) return t;
  }
  // fallback: best-effort
  return extractTextFromUiMessage(messages?.[messages.length - 1]);
}

function extractTextFromUiMessage(message: unknown): string {
  if (!message || typeof message !== 'object') return '';
  const m = message as Record<string, unknown>;

  if (typeof m.content === 'string') {
    const t = m.content.trim();
    if (t) return t;
  }

  // AI SDK / UIMessage sometimes uses `content` as an array of parts:
  // e.g. { content: [{ type: 'text', text: 'hi' }, ...] }
  if (Array.isArray(m.content)) {
    const texts: string[] = [];
    for (const part of m.content) {
      if (!part || typeof part !== 'object') continue;
      const p = part as Record<string, unknown>;
      if (p.type !== 'text') continue;
      if (typeof p.text === 'string') texts.push(p.text);
    }
    const t = texts.join('').trim();
    if (t) return t;
  }

  const rawParts = Array.isArray(m.parts) ? m.parts : [];
  const texts: string[] = [];
  for (const part of rawParts) {
    if (!part || typeof part !== 'object') continue;
    const p = part as Record<string, unknown>;
    if (p.type !== 'text') continue;
    if (typeof p.text === 'string') texts.push(p.text);
  }
  return texts.join('').trim();
}

function normalizeUiMessages(messages: unknown[]): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const raw of Array.isArray(messages) ? messages : []) {
    if (!raw || typeof raw !== 'object') continue;
    const m = raw as Record<string, unknown>;
    const role = typeof m.role === 'string' ? m.role : 'user';
    const content = typeof m.content === 'string' ? m.content : '';
    const parts = Array.isArray(m.parts)
      ? m.parts
      : Array.isArray(m.content)
        ? m.content
        : content
          ? [{ type: 'text', text: content }]
          : [];
    out.push({ ...m, role, content, parts });
  }
  return out;
}

const SYSTEM_PROMPT = `你是一位專業的汽車銷售顧問助理。當判斷需要聯絡方式時，請呼叫 requestContactForm 工具。`;

async function getUserSystemPrompt(supabase: SupabaseAdminClient, userId: string): Promise<string> {
  try {
    const q = supabase
      .from('user_chat_settings')
      .select('system_prompt')
      .eq('user_id', userId);
    const { data } =
      typeof (q as unknown as { maybeSingle?: () => Promise<{ data: unknown }> }).maybeSingle === 'function'
        ? await (q as unknown as { maybeSingle: () => Promise<{ data: unknown }> }).maybeSingle()
        : await (q as unknown as { single: () => Promise<{ data: unknown }> }).single();

    const row = (data ?? null) as { system_prompt?: unknown } | null;
    return typeof row?.system_prompt === 'string' ? row.system_prompt : '';
  } catch {
    return '';
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const raw = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const parsed = ChatBodySchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: '無效資料' }, { status: 400 });

  const sessionId = pickFirstString(raw.sessionId, parsed.data.sessionId);
  const messages = extractMessagesFromBody(raw);

  const bearerToken = getBearerToken(req);

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error('[chat] missing Supabase env: need SUPABASE_SERVICE_ROLE_KEY and (SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL)');
  }

  const ownerUserId = await resolveOwnerUserId(req, supabase);
  if (!ownerUserId) {
    console.error('[chat] missing owner user id: set DEFAULT_OWNER_USER_ID or pass Authorization bearer token');
  }

  const effectiveSessionId = sessionId || `srv-${crypto.randomUUID()}`;
  const sessionIdGenerated = !sessionId;

  if (supabase && sessionIdGenerated) {
    console.warn('[chat] sessionId is empty; generated a sessionId for persistence');
  }

  // 先把使用者最後一句存起來：即便 streaming 中斷，也至少留到 user message。
  let ragQueryChars = 0;
  let vectorStoreId = '';
  const ragProvider = 'openai-vector-store';
  if (supabase && effectiveSessionId && ownerUserId) {
    const lastUserText = findLastUserText(messages);
    if (lastUserText) {
      ragQueryChars = lastUserText.length;
      const { error } = await supabase.from('messages').insert({
        session_id: effectiveSessionId,
        role: 'user',
        content: lastUserText,
        user_id: ownerUserId,
      });
      if (error) console.error('[chat] insert user message failed:', error);
    }

    // 檢查是否開啟自動回覆
    const { data: control } = await supabase
      .from('session_controls')
      .select('auto_reply_enabled')
      .eq('session_id', effectiveSessionId)
      .single();
    
    if (control && control.auto_reply_enabled === false) {
      // 若關閉自動回覆，回傳空字串或特定標記，讓前端知道不需處理
      return new Response(' ', { status: 200 });
    }
  }

  let systemPromptFinal = SYSTEM_PROMPT;

  if (supabase && ownerUserId) {
    const extra = (await getUserSystemPrompt(supabase, ownerUserId)).trim();
    if (extra) systemPromptFinal = `${SYSTEM_PROMPT}\n\n[業務自訂規則]\n${extra}`;
  }

  if (supabase && ownerUserId) {
    vectorStoreId = await getUserVectorStoreId(supabase, ownerUserId);
  }

  const normalizedUiMessages = normalizeUiMessages(messages as unknown[]);

  const openaiApiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!openaiApiKey) {
    return new Response('伺服器缺少 OPENAI_API_KEY，請先設定環境變數。', { status: 500 });
  }

  const openaiClient = new OpenAI({ apiKey: openaiApiKey });

  const waitUntil = await getWaitUntil();

  // Convert UI messages into Responses API "EasyInputMessage" list (text only)
  const inputMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const m of normalizedUiMessages) {
    const role = String(m.role || 'user');
    const text = extractTextFromUiMessage(m);
    if (!text) continue;
    if (role === 'assistant' || role === 'agent') inputMessages.push({ role: 'assistant', content: text });
    else inputMessages.push({ role: 'user', content: text });
  }

  if (inputMessages.length === 0) {
    return new Response('請提供 messages 或 prompt/input。', { status: 400 });
  }

  const tools: OpenAI.Responses.Tool[] | undefined = vectorStoreId
    ? [{ type: 'file_search', vector_store_ids: [vectorStoreId], max_num_results: 8 }]
    : undefined;

  const include: Array<'file_search_call.results'> | undefined = tools
    ? ['file_search_call.results']
    : undefined;

  let stream: AsyncIterable<{ type?: string; delta?: string }>;
  try {
    stream = (await openaiClient.responses.create({
      model: 'gpt-4o-mini',
      instructions: systemPromptFinal,
      input: inputMessages.map((m) => ({ role: m.role, content: m.content, type: 'message' })),
      tools,
      stream: true,
      include,
    })) as unknown as AsyncIterable<{ type?: string; delta?: string }>; // stream events
  } catch (e: unknown) {
    const errObj = e as { status?: unknown; message?: unknown };
    const status = typeof errObj?.status === 'number' ? errObj.status : undefined;
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[chat] openai.responses.create failed:', status ?? '', msg);

    const isRegionBlocked =
      status === 403 && /Country,\s*region,\s*or\s*territory\s*not\s*supported/i.test(msg);

    // If OpenAI rejects due to region restrictions, respond gracefully with a safe fallback.
    if (isRegionBlocked) {
      const fallbackText =
        '目前 AI 自動回覆在此地區暫時不可用。\n' +
        '請稍後再試，或留下聯絡方式（姓名/電話）我會由業務盡快與你聯絡。';

      // Persist a visible assistant message so the business dashboard has a complete timeline.
      if (supabase && effectiveSessionId && ownerUserId) {
        const insertPromise = (async () => {
          try {
            const { error } = await supabase.from('messages').insert({
              session_id: effectiveSessionId,
              role: 'assistant',
              content: fallbackText,
              user_id: ownerUserId,
            });
            if (error) console.error('[chat] insert fallback assistant message failed:', error);
          } catch (insertErr) {
            console.error('[chat] insert fallback assistant message threw:', insertErr);
          }
        })();

        if (waitUntil) waitUntil(insertPromise);
        else await insertPromise;
      }

      const res = new Response(fallbackText, {
        status: 200,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'x-chat-openai-region-blocked': '1',
        },
      });
      if (waitUntil) res.headers.set('x-chat-persist-waituntil', '1');
      const ref = getSupabaseProjectRef();
      if (ref) res.headers.set('x-supabase-project-ref', ref);
      return res;
    }

    return new Response(`AI 服務呼叫失敗：${msg}`, { status: 502 });
  }

  let assistantTextAcc = '';
  const encoder = new TextEncoder();

  let persistedAssistant = false;
  const persistAssistantOnce = async () => {
    if (persistedAssistant) return;
    persistedAssistant = true;
    if (!supabase || !effectiveSessionId || !ownerUserId) return;
    const t = assistantTextAcc.trim();
    if (!t) return;

    const insertPromise = (async () => {
      const tryInsert = async (content: string) => {
        const { error } = await supabase.from('messages').insert({
          session_id: effectiveSessionId,
          role: 'assistant',
          content,
          user_id: ownerUserId,
        });
        return error;
      };

      try {
        let content = t;
        const MAX_CHARS = 20000;
        if (content.length > MAX_CHARS) content = `${content.slice(0, MAX_CHARS)}\n…(截斷)`;

        const error = await tryInsert(content);
        if (!error) return;
        console.error('[chat] insert assistant message failed:', error);

        if (content.length > 4000) {
          const shorter = `${content.slice(0, 3500)}\n…(已截斷以避免寫入失敗)`;
          const retryError = await tryInsert(shorter);
          if (retryError) console.error('[chat] insert assistant retry failed:', retryError);
        }
      } catch (e) {
        console.error('[chat] insert assistant message threw:', e);
      }
    })();

    if (waitUntil) {
      waitUntil(insertPromise);
      return;
    }
    await insertPromise;
  };

  const res = new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        (async () => {
          let streamErrored = false;
          try {
            for await (const ev of stream) {
              if (ev?.type === 'response.output_text.delta' && typeof ev.delta === 'string') {
                assistantTextAcc += ev.delta;
                controller.enqueue(encoder.encode(ev.delta));
              }
            }
          } catch (e) {
            streamErrored = true;
            controller.error(e);
          } finally {
            if (!streamErrored) controller.close();

            // Persist assistant message after streaming completes (or errors)
            await persistAssistantOnce();
          }
        })().catch((e) => {
          try {
            controller.error(e);
          } catch {
            // ignore
          }
        });
      },
      async cancel() {
        // Client disconnected / aborted request; persist whatever we have.
        await persistAssistantOnce();
      },
    }),
    {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
      },
    },
  );
  const ref = getSupabaseProjectRef();
  if (ref) res.headers.set('x-supabase-project-ref', ref);
  const hasSupabase = !!supabase;
  const hasSessionId = !!sessionId;
  const hasOwnerUserId = !!ownerUserId;
  res.headers.set(
    'x-chat-persist-attempted',
    hasSupabase && !!effectiveSessionId && hasOwnerUserId ? '1' : '0',
  );
  res.headers.set('x-chat-has-supabase', hasSupabase ? '1' : '0');
  res.headers.set('x-chat-has-sessionid', hasSessionId ? '1' : '0');
  res.headers.set('x-chat-has-owneruserid', hasOwnerUserId ? '1' : '0');
  res.headers.set('x-chat-has-bearer', bearerToken ? '1' : '0');
  res.headers.set('x-rag-query-chars', String(ragQueryChars));
  res.headers.set('x-rag-provider', ragProvider);
  if (waitUntil) res.headers.set('x-chat-persist-waituntil', '1');
  res.headers.set('x-vs-present', vectorStoreId ? '1' : '0');
  res.headers.set('x-vs-id-len', String(vectorStoreId ? vectorStoreId.length : 0));
  res.headers.set('x-chat-sessionid-len', String(sessionId.length));
  res.headers.set('x-chat-sessionid-effective-len', String(effectiveSessionId.length));
  res.headers.set('x-chat-sessionid-generated', sessionIdGenerated ? '1' : '0');
  return res;
}