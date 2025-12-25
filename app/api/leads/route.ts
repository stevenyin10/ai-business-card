// app/api/leads/route.ts
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const LeadSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  note: z.string().optional().default(''),
  sessionId: z.string().optional().default(''),
});

function getBearerToken(req: Request): string {
  const raw = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return (m?.[1] || '').trim();
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: '無效資料' }, { status: 400 });

  const { name, phone, note, sessionId } = parsed.data;

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return new Response('缺少 Supabase 環境變數', { status: 500 });
  }
  const supabase = createClient(url, serviceRoleKey);

  const token = getBearerToken(req);
  let ownerUserId = (process.env.DEFAULT_OWNER_USER_ID || '').trim();
  if (token) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user?.id) ownerUserId = data.user.id;
    } catch {
      // ignore
    }
  }
  if (!ownerUserId) return new Response('缺少 owner user id', { status: 500 });

  // 儲存客戶資料，並關聯 sessionId 以便後續查詢對話紀錄
  const { error } = await supabase.from('leads').insert({
    name,
    phone,
    note,
    session_id: sessionId,
    user_id: ownerUserId,
  });

  if (error) return new Response('資料庫寫入失敗', { status: 500 });
  return Response.json({ success: true });
}