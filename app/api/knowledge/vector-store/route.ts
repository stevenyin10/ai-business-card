import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getOrCreateUserVectorStoreId, type SupabaseLike } from '@/lib/openaiVectorStore';
import { readEnv } from '@/lib/runtimeEnv';

export const runtime = 'edge';

async function getSupabaseAdminClient() {
  const url = (await readEnv('SUPABASE_URL')) || (await readEnv('NEXT_PUBLIC_SUPABASE_URL'));
  const serviceRoleKey = await readEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey);
}

type SupabaseAdminClient = NonNullable<Awaited<ReturnType<typeof getSupabaseAdminClient>>>;

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

async function getExistingVectorStoreId(supabase: SupabaseAdminClient, userId: string) {
  try {
    const q = supabase.from('user_vector_stores').select('vector_store_id').eq('user_id', userId);
    const { data } = typeof (q as unknown as { maybeSingle?: () => Promise<{ data: { vector_store_id?: string | null } | null }> }).maybeSingle === 'function'
      ? await (q as unknown as { maybeSingle: () => Promise<{ data: { vector_store_id?: string | null } | null }> }).maybeSingle()
      : await (q as unknown as { single: () => Promise<{ data: { vector_store_id?: string | null } | null }> }).single();

    const id = (data?.vector_store_id || '').trim();
    return id || null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const supabase = await getSupabaseAdminClient();
  if (!supabase) return Response.json({ error: 'Server config error' }, { status: 500 });

  const userId = await getUserId(req, supabase);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const vectorStoreId = await getExistingVectorStoreId(supabase, userId);
  if (!vectorStoreId) {
    return Response.json({ present: false });
  }

  try {
    const openai = new OpenAI({ apiKey: await readEnv('OPENAI_API_KEY') });
    const vs = await openai.vectorStores.retrieve(vectorStoreId);
    return Response.json({
      present: true,
      vectorStoreId,
      vectorStore: vs,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ present: true, vectorStoreId, error: msg || 'Failed to retrieve vector store' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabase = await getSupabaseAdminClient();
  if (!supabase) return Response.json({ error: 'Server config error' }, { status: 500 });

  const userId = await getUserId(req, supabase);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const openai = new OpenAI({ apiKey: await readEnv('OPENAI_API_KEY') });
    const vectorStoreId = await getOrCreateUserVectorStoreId({
      openai,
      supabase: supabase as unknown as SupabaseLike,
      userId,
    });
    const vs = await openai.vectorStores.retrieve(vectorStoreId);
    return Response.json({ present: true, vectorStoreId, vectorStore: vs });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg || 'Failed to init vector store' }, { status: 500 });
  }
}
