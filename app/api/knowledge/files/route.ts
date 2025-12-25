import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { readEnv } from '@/lib/runtimeEnv';

export const runtime = 'edge';

const TABLE = 'agent_knowledge_files';

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

type FileRow = {
  id: number;
  user_id: string;
  kind: 'pdf' | 'image' | 'text' | string;
  original_name: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  openai_file_id: string | null;
  openai_batch_id: string | null;
  knowledge_id: number | string | null;
  created_at: string;
};

export async function GET(req: Request) {
  const supabase = await getSupabaseAdminClient();
  if (!supabase) return Response.json({ error: 'Server config error' }, { status: 500 });

  const userId = await getUserId(req, supabase);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select(
        'id, user_id, kind, original_name, storage_bucket, storage_path, openai_file_id, openai_batch_id, knowledge_id, created_at',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    return Response.json({ data: (data as unknown as FileRow[]) ?? [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg || 'Failed to load' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const supabase = await getSupabaseAdminClient();
  if (!supabase) return Response.json({ error: 'Server config error' }, { status: 500 });

  const userId = await getUserId(req, supabase);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return Response.json({ error: 'Invalid id' }, { status: 400 });
  }

  let row: FileRow | null = null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select(
        'id, user_id, kind, original_name, storage_bucket, storage_path, openai_file_id, openai_batch_id, knowledge_id, created_at',
      )
      .eq('id', numericId)
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    row = (data as unknown as FileRow) ?? null;
  } catch {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  // Delete DB records first (ownership enforced). If linked to knowledge, delete knowledge to cascade.
  try {
    if (row.knowledge_id != null) {
      const { error } = await supabase
        .from('agent_knowledge')
        .delete()
        .eq('id', row.knowledge_id)
        .eq('user_id', userId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from(TABLE).delete().eq('id', numericId).eq('user_id', userId);
      if (error) throw error;
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg || 'Failed to delete' }, { status: 500 });
  }

  // Best-effort delete storage object.
  if (row.storage_bucket && row.storage_path) {
    try {
      await supabase.storage.from(row.storage_bucket).remove([row.storage_path]);
    } catch {
      // ignore
    }
  }

  // Best-effort delete OpenAI file.
  if (row.openai_file_id) {
    try {
      const openai = new OpenAI({ apiKey: await readEnv('OPENAI_API_KEY') });
      await openai.files.delete(row.openai_file_id);
    } catch {
      // ignore
    }
  }

  return Response.json({ success: true });
}
