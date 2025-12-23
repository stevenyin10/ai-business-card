// app/api/leads/route.ts
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const LeadSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  note: z.string().optional().default(''),
  sessionId: z.string().optional().default(''),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: '無效資料' }, { status: 400 });

  const { name, phone, note, sessionId } = parsed.data;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // 儲存客戶資料，並關聯 sessionId 以便後續查詢對話紀錄
  const { error } = await supabase.from('leads').insert({
    name,
    phone,
    note,
    session_id: sessionId,
    user_id: process.env.DEFAULT_OWNER_USER_ID
  });

  if (error) return new Response('資料庫寫入失敗', { status: 500 });
  return Response.json({ success: true });
}