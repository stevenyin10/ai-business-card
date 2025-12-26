import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { readEnv } from '@/lib/runtimeEnv';
import { normalizeSurveySettings, DEFAULT_SURVEY_SETTINGS } from '@/lib/surveySettings';

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

async function resolveOwnerUserId(req: Request, supabase: unknown | null) {
  const fallback = (await readEnv('DEFAULT_OWNER_USER_ID')).trim();
  const token = getBearerToken(req);

  if (supabase && token && hasAuthGetUser(supabase)) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user?.id) return data.user.id;
    } catch {
      // ignore
    }
  }

  return fallback;
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
  form: z.unknown().optional(),
});

export async function GET(req: Request) {
  const supabase = await getSupabaseAdminClient();
  if (!supabase) return Response.json({ error: 'missing supabase env' }, { status: 500 });

  const ownerUserId = await resolveOwnerUserId(req, supabase);
  if (!ownerUserId) return Response.json({ form: DEFAULT_SURVEY_SETTINGS, updatedAt: null });

  const { data, error } = await supabase
    .from('user_survey_settings')
    .select('form, updated_at')
    .eq('user_id', ownerUserId)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const normalized = normalizeSurveySettings(data?.form);
  return Response.json({ form: normalized, updatedAt: data?.updated_at ?? null });
}

export async function POST(req: Request) {
  const supabase = await getSupabaseAdminClient();
  if (!supabase) return Response.json({ error: 'missing supabase env' }, { status: 500 });

  const userId = await requireUserId(req, supabase);
  if (!userId) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = UpsertSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'invalid body' }, { status: 400 });

  const normalized = normalizeSurveySettings(parsed.data.form);

  const { error } = await supabase
    .from('user_survey_settings')
    .upsert({ user_id: userId, form: normalized });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
