import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { readEnv } from '@/lib/runtimeEnv';
import { normalizeSurveySettings, type SurveySettings } from '@/lib/surveySettings';

export const runtime = 'edge';

const SurveySchema = z.object({
  sessionId: z.string().optional().default(''),
  goal: z.string().min(1),
  budget: z.string().optional().default(''),
  timeline: z.string().optional().default(''),
  tradeIn: z.string().optional().default(''),
  note: z.string().optional().default(''),
});

const DynamicSurveySchema = z.object({
  sessionId: z.string().optional().default(''),
  form: z.unknown(),
  answers: z.record(z.string(), z.unknown()).default({}),
});

async function getSupabaseAdminClient() {
  const url = (await readEnv('SUPABASE_URL')) || (await readEnv('NEXT_PUBLIC_SUPABASE_URL'));
  const serviceRoleKey = await readEnv('SUPABASE_SERVICE_ROLE_KEY');
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

function formatDynamicSurveyContent(form: SurveySettings, answers: Record<string, unknown>): string {
  const lines: string[] = ['【問卷】', form.title ? `標題：${form.title}` : ''].filter(Boolean);

  for (const q of form.questions ?? []) {
    const raw = answers[q.id];

    let display = '';
    if (Array.isArray(raw)) {
      display = raw
        .map((v) => (typeof v === 'string' ? v : ''))
        .filter(Boolean)
        .join('、');
    } else if (typeof raw === 'string') {
      display = raw.trim();
    } else if (raw == null) {
      display = '';
    } else {
      display = String(raw);
    }

    if (!display) continue;
    lines.push(`${q.title}：${display}`);
  }

  return lines.filter(Boolean).join('\n');
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const parsedDynamic = DynamicSurveySchema.safeParse(body);
  const parsedLegacy = SurveySchema.safeParse(body);
  if (!parsedDynamic.success && !parsedLegacy.success) {
    return Response.json({ error: '無效資料' }, { status: 400 });
  }

  const supabase = await getSupabaseAdminClient();
  if (!supabase) {
    return new Response('缺少 Supabase 環境變數', { status: 500 });
  }

  const ownerUserId = await resolveOwnerUserId(req, supabase);
  if (!ownerUserId) {
    return new Response('缺少 owner user id', { status: 500 });
  }

  let rawSessionId = '';
  if (parsedDynamic.success) rawSessionId = parsedDynamic.data.sessionId;
  else if (parsedLegacy.success) rawSessionId = parsedLegacy.data.sessionId;

  const effectiveSessionId = rawSessionId || `srv-${crypto.randomUUID()}`;

  let schemaVersion = 1;
  let payload: unknown = null;
  let content = '';

  if (parsedDynamic.success) {
    schemaVersion = 2;
    const form = normalizeSurveySettings(parsedDynamic.data.form);
    const answers = parsedDynamic.data.answers;

    // Basic required validation
    for (const q of form.questions ?? []) {
      if (!q.required) continue;
      const v = answers[q.id];
      const isEmptyString = typeof v === 'string' && !v.trim();
      const isEmptyArray = Array.isArray(v) && v.length === 0;
      if (v == null || isEmptyString || isEmptyArray) {
        return Response.json({ error: `缺少必填題目：${q.title}` }, { status: 400 });
      }
    }

    payload = {
      form,
      answers,
    };
    content = formatDynamicSurveyContent(form, answers);
  } else if (parsedLegacy.success) {
    payload = {
      goal: parsedLegacy.data.goal,
      budget: parsedLegacy.data.budget,
      timeline: parsedLegacy.data.timeline,
      tradeIn: parsedLegacy.data.tradeIn,
      note: parsedLegacy.data.note,
    };
    content = formatSurveyContent(parsedLegacy.data);
  } else {
    return Response.json({ error: '無效資料' }, { status: 400 });
  }

  const { error: surveyError } = await supabase.from('survey').insert({
    session_id: effectiveSessionId,
    user_id: ownerUserId,
    payload,
    schema_version: schemaVersion,
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
