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

function extractTextFromUiMessage(message: any): string {
  if (typeof message?.content === 'string') return message.content.trim();
  const parts = Array.isArray(message?.parts) ? message.parts : [];
  return parts
    .filter((p: any) => p && p.type === 'text')
    .map((p: any) => p.text)
    .join('')
    .trim();
}

const SYSTEM_PROMPT = `你是一位專業的汽車銷售顧問助理。當判斷需要聯絡方式時，請呼叫 requestContactForm 工具。`;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { messages, sessionId } = body;
  const ownerUserId = process.env.DEFAULT_OWNER_USER_ID;

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: SYSTEM_PROMPT,
    messages: convertToModelMessages(messages),
    onFinish: async ({ text }) => {
      // 儲存對話邏輯：將使用者最後一句與 AI 的回應存入 DB
      const supabase = getSupabaseAdminClient();
      if (!supabase || !sessionId || !ownerUserId) return;

      const lastUserText = extractTextFromUiMessage(messages[messages.length - 1]);
      const rows = [];
      if (lastUserText) rows.push({ session_id: sessionId, role: 'user', content: lastUserText, user_id: ownerUserId });
      if (text) rows.push({ session_id: sessionId, role: 'assistant', content: text, user_id: ownerUserId });
      
      await supabase.from('messages').insert(rows);
    },
  });

  return result.toTextStreamResponse();
}