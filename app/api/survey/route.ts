import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const SurveySchema = z.object({
  sessionId: z.string().optional().default(''),
  goal: z.string().min(1),
  budget: z.string().optional().default(''),
  timeline: z.string().optional().default(''),
  tradeIn: z.string().optional().default(''),
  note: z.string().optional().default(''),
});

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

async function resolveOwnerUserId(req: Request, supabase: unknown | null) {
  const fallback = (process.env.DEFAULT_OWNER_USER_ID || '').trim();
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

function formatSurveyContent(input: z.infer<typeof SurveySchema>): string {
  const lines = [
    '【問卷】',
    `需求/目的：${input.goal}`,
    input.budget ? `預算：${input.budget}` : '',
    input.timeline ? `購買時間：${input.timeline}` : '',
    input.tradeIn ? `是否舊車換購：${input.tradeIn}` : '',
    input.note ? `其他備註：${input.note}` : '',
  ].filter(Boolean);

  return lines.join('\n');
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = SurveySchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: '無效資料' }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return new Response('缺少 Supabase 環境變數', { status: 500 });
  }

  const ownerUserId = await resolveOwnerUserId(req, supabase);
  if (!ownerUserId) {
    return new Response('缺少 owner user id', { status: 500 });
  }

  const effectiveSessionId = parsed.data.sessionId || `srv-${crypto.randomUUID()}`;
  const content = formatSurveyContent(parsed.data);

  const payload = {
    goal: parsed.data.goal,
    budget: parsed.data.budget,
    timeline: parsed.data.timeline,
    tradeIn: parsed.data.tradeIn,
    note: parsed.data.note,
  };

  const { error: surveyError } = await supabase.from('survey').insert({
    session_id: effectiveSessionId,
    user_id: ownerUserId,
    payload,
    schema_version: 1,
  });

  if (surveyError) {
    console.error('[survey] insert survey table failed:', surveyError);
    return new Response('資料庫寫入失敗', { status: 500 });
  }

  // Keep a readable record in the conversation timeline (best-effort)
  const { error } = await supabase.from('messages').insert({
    session_id: effectiveSessionId,
    role: 'survey',
    content,
    user_id: ownerUserId,
  });

  if (error) {
    console.error('[survey] insert failed:', error);
    // survey table is already stored; don't fail the request for the chat log insert
  }

  return Response.json({ success: true, sessionId: effectiveSessionId });
}
