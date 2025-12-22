// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai'; 
import { convertToModelMessages, streamText } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey);
}

function getSupabaseAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

function extractTextFromUiMessage(message: any): string {
  const parts = Array.isArray(message?.parts) ? message.parts : [];
  const text = parts
    .filter((p: any) => p && p.type === 'text' && typeof p.text === 'string')
    .map((p: any) => p.text)
    .join('')
    .trim();

  if (text) return text;

  // Fallbacks for any unexpected shapes.
  if (typeof message?.content === 'string') return message.content.trim();
  if (typeof message?.text === 'string') return message.text.trim();
  return '';
}

// 2. 設定系統提示詞 (System Prompt)
// 這是 AI 的大腦設定，教它如何扮演業務助理
const SYSTEM_PROMPT = `
你是一位專業的汽車銷售顧問小陳的 AI 助理。
個性：熱情、專業、親切，回話簡短有力，不要長篇大論。
任務：回答客戶關於汽車的問題 (如價格、性能、優惠)。

話題限制（很重要）：
- 只回答與「汽車購車/車款/配備/性能/保養/貸款/交車/優惠/試乘預約/回電聯繫」相關的問題。
- 如果使用者提出不相干的話題（例如：寫程式、醫療、法律、投資、八卦、其他產品），請直接婉拒，並把對話導回汽車諮詢。
- 婉拒時請用一句話說明你只能協助汽車相關，並反問一個汽車相關的引導問題（例如想看哪個車款、預算、是否要預約賞車）。

重要策略：
1. 回答完客戶問題後，請適時詢問客戶是否需要「預約賞車」或「專人回電詳細解說」。
2. 當你判斷需要跟進（想預約、想報價、想回電、明確表示有興趣、需要專人協助），請「一定要」呼叫 requestContactForm 工具來觸發前端彈出聯絡表單。
  - 原則：不要在聊天內容要求對方直接輸入電話/個資，改請對方填表單。
  - 你可以在呼叫工具後，用一句話引導對方填表單即可。
3. 如果使用者表示「已填寫/已送出聯絡表單/已留聯絡方式」，請回覆確認與下一步（例如多久內回電、需要準備哪些資訊），並且不要再次要求聯絡方式，也不要再呼叫 requestContactForm。
`;

// 設定為 Edge Runtime 或 NodeJS Runtime 都可以，但在 Vercel 上建議用預設或指定
// export const runtime = 'edge'; // 如果遇到相容性問題可以註解掉這行

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response('Missing OPENAI_API_KEY', { status: 500 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json(
      {
        error: 'Invalid JSON body',
        hint: 'Expected application/json with { messages: UIMessage[], sessionId?: string }',
      },
      { status: 400 },
    );
  }
  const messages = body?.messages;
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';

  if (!Array.isArray(messages)) {
    return Response.json(
      {
        error: 'Invalid request body',
        hint: 'Expected { messages: [...] } from useChat',
        receivedKeys: Object.keys(body as any),
        sessionIdProvided: !!sessionId,
      },
      { status: 400 },
    );
  }

  const tools = {
    requestContactForm: {
      description:
        '當你判斷需要收集聯絡方式以便安排回電/報價/預約時，使用此工具觸發前端彈出聯絡表單。此工具不會寫入資料庫。',
      inputSchema: z.object({
        reason: z
          .string()
          .describe('為什麼需要聯絡方式（例如：安排回電、提供報價、預約賞車）'),
        suggestedNote: z
          .string()
          .optional()
          .describe('可選：建議帶入備註，例如車款/需求重點'),
      }),
      execute: async ({ reason, suggestedNote }: any) => {
        return {
          open: true,
          reason,
          suggestedNote: suggestedNote ?? '',
        };
      },
    },
  };

  // useChat 會送 UIMessage (parts)；streamText 需要模型 messages。
  const uiMessagesWithoutId = messages.map(({ id: _id, ...rest }: any) => rest);
  const modelMessages = convertToModelMessages(uiMessagesWithoutId, { tools });

  const lastUserUiMessage = [...messages]
    .reverse()
    .find((m: any) => m && m.role === 'user');
  const lastUserText = lastUserUiMessage ? extractTextFromUiMessage(lastUserUiMessage) : '';

  const authHeader = req.headers.get('authorization') || '';
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';

  let authedUserId: string | null = null;
  if (bearerToken) {
    try {
      const supabaseAuth = getSupabaseAuthClient();
      if (supabaseAuth) {
        const { data, error } = await supabaseAuth.auth.getUser(bearerToken);
        if (!error && data.user?.id) authedUserId = data.user.id;
      }
    } catch {
      // ignore
    }
  }

  const fallbackUserId =
    typeof process.env.DEFAULT_OWNER_USER_ID === 'string'
      ? process.env.DEFAULT_OWNER_USER_ID
      : null;

  const ownerUserId = authedUserId || fallbackUserId;
  const persistEnabled = !!sessionId && !!ownerUserId;
  const supabaseAdmin = persistEnabled ? getSupabaseAdminClient() : null;

  // 3. 呼叫 AI 進行串流回應
  const result = streamText({
    model: openai('gpt-4o-mini'), // 使用最經濟實惠的模型
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    tools,
    onFinish: async ({ text }) => {
      // Best-effort persistence. Never break chat.
      if (!supabaseAdmin || !persistEnabled) return;
      try {
        const rows: Array<any> = [];
        if (lastUserText) {
          rows.push({
            session_id: sessionId,
            role: 'user',
            content: lastUserText,
            user_id: ownerUserId,
          });
        }
        if (typeof text === 'string' && text.trim()) {
          rows.push({
            session_id: sessionId,
            role: 'assistant',
            content: text.trim(),
            user_id: ownerUserId,
          });
        }
        if (rows.length === 0) return;

        const { error } = await supabaseAdmin.from('messages').insert(rows);
        if (error) {
          console.error('[messages] insert failed:', error);
        }
      } catch (e) {
        console.error('[messages] insert exception:', e);
      }
    },
  });

  // 回傳串流回應
  return result.toTextStreamResponse();
}