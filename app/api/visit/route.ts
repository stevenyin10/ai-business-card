import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const VisitSchema = z.object({
  sessionId: z.string().min(1),
  path: z.string().optional().default('/'),
});

function getSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = VisitSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: '無效資料' }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  if (!supabase) return new Response('缺少 Supabase 環境變數', { status: 500 });

  const ownerUserId = (process.env.DEFAULT_OWNER_USER_ID || '').trim();
  if (!ownerUserId) return new Response('缺少 owner user id', { status: 500 });

  const ua = req.headers.get('user-agent') || null;
  const referrer = req.headers.get('referer') || null;

  const { error } = await supabase.from('visits').insert({
    session_id: parsed.data.sessionId,
    user_id: ownerUserId,
    path: parsed.data.path || '/',
    user_agent: ua,
    referrer,
  });

  if (error) {
    console.error('[visit] insert failed:', error);
    return new Response('資料庫寫入失敗', { status: 500 });
  }

  return Response.json({ success: true });
}
