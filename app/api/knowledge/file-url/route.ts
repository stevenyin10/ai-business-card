import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

function getSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey);
}

type SupabaseAdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

function getBearerToken(req: Request): string {
  const raw = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return (m?.[1] || '').trim();
}

async function getUserId(req: Request, supabase: SupabaseAdminClient) {
  const token = getBearerToken(req);
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

export async function GET(req: Request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return Response.json({ error: 'Server config error' }, { status: 500 });

  const userId = await getUserId(req, supabase);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const bucket = String(url.searchParams.get('bucket') || '').trim();
  const path = String(url.searchParams.get('path') || '').trim();

  if (!bucket || !path) return Response.json({ error: 'Missing bucket/path' }, { status: 400 });

  // Basic guard: only allow signing objects under this user's folder.
  if (!path.startsWith(`${userId}/`)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);
    if (error) throw error;
    return Response.json({ url: data?.signedUrl ?? '' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg || 'Failed to sign url' }, { status: 500 });
  }
}
