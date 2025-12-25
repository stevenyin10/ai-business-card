import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import OpenAI from 'openai';

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

const BodySchema = z.object({
  batchIds: z.array(z.string().min(1)).max(20),
});

export async function POST(req: Request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return Response.json({ error: 'Server config error' }, { status: 500 });

  const userId = await getUserId(req, supabase);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Invalid body' }, { status: 400 });

  const vectorStoreId = await getExistingVectorStoreId(supabase, userId);
  if (!vectorStoreId) return Response.json({ error: 'Vector store not initialized' }, { status: 400 });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const batchIds = Array.from(new Set(parsed.data.batchIds.map((s) => s.trim()).filter(Boolean))).slice(0, 20);
  const result: Record<string, { status?: string; file_counts?: unknown; error?: string }> = {};

  for (const bid of batchIds) {
    try {
      const batch = await openai.vectorStores.fileBatches.retrieve(bid, { vector_store_id: vectorStoreId });
      result[bid] = {
        status: batch.status,
        file_counts: (batch as unknown as { file_counts?: unknown }).file_counts,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      result[bid] = { error: msg || 'Failed' };
    }
  }

  return Response.json({ vectorStoreId, batches: result });
}
