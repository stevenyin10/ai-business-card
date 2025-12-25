import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { readEnv } from '@/lib/runtimeEnv';

export const runtime = 'edge';

async function getSupabaseAdminClient() {
  const url = (await readEnv('SUPABASE_URL')) || (await readEnv('NEXT_PUBLIC_SUPABASE_URL'));
  const serviceRoleKey = await readEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey);
}

type GetUserResult = {
  data?: { user?: { id?: string } };
  error?: { message?: string } | null;
};

function getBearerToken(req: Request): string {
  const raw = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return (m?.[1] || '').trim();
}

function hasAuthGetUser(
  client: unknown,
): client is { auth: { getUser: (token: string) => Promise<GetUserResult> } } {
  if (!client || typeof client !== 'object') return false;
  const c = client as Record<string, unknown>;
  if (!c.auth || typeof c.auth !== 'object') return false;
  const auth = c.auth as Record<string, unknown>;
  return typeof auth.getUser === 'function';
}

async function requireUserId(req: Request, supabase: unknown | null): Promise<string> {
  const token = getBearerToken(req);
  if (!token) return '';
  if (!supabase || !hasAuthGetUser(supabase)) return '';

  const { data, error } = await supabase.auth.getUser(token);
  if (error) return '';
  return (data?.user?.id || '').trim();
}

const UpsertSchema = z.object({
  systemPrompt: z.string().max(8000).default(''),
});

export async function GET(req: Request) {
  const supabase = await getSupabaseAdminClient();
  if (!supabase) return Response.json({ error: 'missing supabase env' }, { status: 500 });

  const userId = await requireUserId(req, supabase);
  if (!userId) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('user_chat_settings')
    .select('system_prompt, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    systemPrompt: data?.system_prompt ?? '',
    updatedAt: data?.updated_at ?? null,
  });
}

export async function POST(req: Request) {
  const supabase = await getSupabaseAdminClient();
  if (!supabase) return Response.json({ error: 'missing supabase env' }, { status: 500 });

  const userId = await requireUserId(req, supabase);
  if (!userId) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = UpsertSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'invalid body' }, { status: 400 });

  const systemPrompt = parsed.data.systemPrompt;

  const { error } = await supabase
    .from('user_chat_settings')
    .upsert({ user_id: userId, system_prompt: systemPrompt });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
