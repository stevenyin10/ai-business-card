import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

function getSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey);
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

const QuerySchema = z.object({
  sessionId: z.string().min(1),
});

export async function GET(req: Request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return new Response('缺少 Supabase 環境變數', { status: 500 });

  const token = getBearerToken(req);
  if (!token) return new Response('缺少 Authorization Bearer token', { status: 401 });

  if (!hasAuthGetUser(supabase)) return new Response('Supabase auth client 不可用', { status: 500 });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const userId = userData?.user?.id;
  if (userError || !userId) return new Response('無效登入資訊', { status: 401 });

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ sessionId: url.searchParams.get('sessionId') || '' });
  if (!parsed.success) return Response.json({ error: '無效資料' }, { status: 400 });

  const sessionId = parsed.data.sessionId;

  // Authorization strategy:
  // - First validate that this session belongs to the requesting business user.
  // - Then fetch messages by session_id only (avoid missing rows caused by mismatched user_id).
  //
  // We try ownership sources in this order:
  // 1) leads.session_id (preferred)
  // 2) visits.session_id
  // 3) messages.session_id (fallback)
  type OwnerRow = { user_id?: unknown } | null;

  const leadOwner = await supabase
    .from('leads')
    .select('user_id')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const leadOwnerId = (leadOwner.data as OwnerRow)?.user_id;
  if (typeof leadOwnerId === 'string' && leadOwnerId && leadOwnerId !== userId) {
    return new Response('沒有權限', { status: 403 });
  }

  let ownerKnown = typeof leadOwnerId === 'string' && !!leadOwnerId;
  if (!ownerKnown) {
    const visitOwner = await supabase
      .from('visits')
      .select('user_id')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const visitOwnerId = (visitOwner.data as OwnerRow)?.user_id;
    if (typeof visitOwnerId === 'string' && visitOwnerId && visitOwnerId !== userId) {
      return new Response('沒有權限', { status: 403 });
    }
    ownerKnown = typeof visitOwnerId === 'string' && !!visitOwnerId;
  }

  if (!ownerKnown) {
    const msgOwner = await supabase
      .from('messages')
      .select('user_id')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const msgOwnerId = (msgOwner.data as OwnerRow)?.user_id;
    if (typeof msgOwnerId === 'string' && msgOwnerId && msgOwnerId !== userId) {
      return new Response('沒有權限', { status: 403 });
    }
    ownerKnown = typeof msgOwnerId === 'string' && !!msgOwnerId;
  }

  // If we cannot prove ownership from any table, treat it as not found.
  if (!ownerKnown) {
    return new Response('找不到對話', { status: 404 });
  }

  const { data, error } = await supabase
    .from('messages')
    .select('id, created_at, session_id, role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(1000);

  if (error) {
    console.error('[messages] select failed:', error);
    return new Response('讀取失敗', { status: 500 });
  }

  return Response.json({ messages: data ?? [] });
}
