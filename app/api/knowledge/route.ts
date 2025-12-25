import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import OpenAI from 'openai';
import { addFileToVectorStore, getOrCreateUserVectorStoreId, type SupabaseLike } from '@/lib/openaiVectorStore';

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

const PostSchema = z.object({
  content: z.string().min(1),
});

export async function GET(req: Request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return Response.json({ error: 'Server config error' }, { status: 500 });

  const userId = await getUserId(req, supabase);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('agent_knowledge')
    .select('id, content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

export async function POST(req: Request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return Response.json({ error: 'Server config error' }, { status: 500 });

  const userId = await getUserId(req, supabase);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Invalid body' }, { status: 400 });

  const { content } = parsed.data;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let vectorStoreId = '';
  try {
    vectorStoreId = await getOrCreateUserVectorStoreId({
      openai,
      supabase: supabase as unknown as SupabaseLike,
      userId,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[knowledge] vector store init failed:', msg);
    return Response.json({ error: '向量庫初始化失敗（請確認 OPENAI_API_KEY 與資料表 user_vector_stores 已建立）' }, { status: 500 });
  }

  try {
    // Save to DB (for dashboard list)
    const { data: inserted, error } = await supabase
      .from('agent_knowledge')
      .insert({
        user_id: userId,
        content,
        embedding: null,
      })
      .select('id')
      .single();

    if (error) throw error;
    const knowledgeId = inserted?.id ?? null;

    // Avoid double-ingestion: if this content is tagged as coming from a PDF source,
    // the PDF itself is already uploaded via /api/knowledge/upload.
    const hasSourceFileMarker = /^\[SOURCE_FILE\]\s+name="[^"]+"\s+path="[^"]+"/m.test(content);
    if (!hasSourceFileMarker) {
      const txtFile = new File([content], `knowledge-${crypto.randomUUID()}.txt`, { type: 'text/plain' });
      const { openaiFileId, batchId } = await addFileToVectorStore({
        openai,
        vectorStoreId,
        file: txtFile,
      });

      // Best-effort record for dashboard "檔案/訓練狀態".
      try {
        await supabase.from('agent_knowledge_files').insert({
          user_id: userId,
          kind: 'text',
          original_name: txtFile.name,
          openai_file_id: openaiFileId,
          openai_batch_id: batchId,
          knowledge_id: knowledgeId,
        });
      } catch {
        // ignore (table may not exist yet)
      }
    }

    return Response.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Knowledge upload error:', msg);
    return Response.json({ error: msg || 'Failed to save' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return Response.json({ error: 'Server config error' }, { status: 500 });

  const userId = await getUserId(req, supabase);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  // Best-effort: delete OpenAI file(s) associated with this knowledge item.
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { data } = await supabase
      .from('agent_knowledge_files')
      .select('openai_file_id')
      .eq('user_id', userId)
      .eq('knowledge_id', id)
      .limit(20);

    const ids = Array.from(
      new Set(
        ((data as unknown as Array<{ openai_file_id?: string | null }>) ?? [])
          .map((r) => (r.openai_file_id || '').trim())
          .filter(Boolean),
      ),
    );
    for (const fid of ids) {
      try {
        await openai.files.delete(fid);
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  const { error } = await supabase
    .from('agent_knowledge')
    .delete()
    .eq('id', id)
    .eq('user_id', userId); // Ensure ownership

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
