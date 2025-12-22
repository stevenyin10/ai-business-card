import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey);
}

const LeadSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  line: z.string().optional().default(''),
  email: z.string().optional().default(''),
  note: z.string().optional().default(''),
  sessionId: z.string().optional().default(''),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = LeadSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: 'Invalid request body',
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const { name, phone, line, email, note, sessionId } = parsed.data;

  const supabaseAnon = getSupabaseClient();
  const supabaseAdmin = getSupabaseAdminClient();
  const supabase = supabaseAdmin ?? supabaseAnon;
  if (!supabase) {
    return new Response('Supabase is not configured', { status: 500 });
  }

  const combinedNoteParts = [
    note?.trim() ? `需求/備註: ${note.trim()}` : '',
    line?.trim() ? `LINE: ${line.trim()}` : '',
    email?.trim() ? `Email: ${email.trim()}` : '',
  ].filter(Boolean);

  const combinedNote = combinedNoteParts.join('\n');

  const authHeader = req.headers.get('authorization') || '';
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';

  let authedUserId: string | null = null;
  if (bearerToken && supabaseAnon) {
    try {
      const { data, error } = await supabaseAnon.auth.getUser(bearerToken);
      if (!error && data.user?.id) authedUserId = data.user.id;
    } catch {
      // ignore
    }
  }

  const fallbackUserId =
    typeof process.env.DEFAULT_OWNER_USER_ID === 'string'
      ? process.env.DEFAULT_OWNER_USER_ID
      : null;

  const ownerUserId = authedUserId || fallbackUserId;

  // Best-effort: attempt to include new columns if your DB schema already upgraded.
  const candidateRow: Record<string, any> = {
    name,
    phone,
    note: combinedNote,
  };

  if (sessionId.trim()) candidateRow.session_id = sessionId.trim();
  if (ownerUserId) candidateRow.user_id = ownerUserId;

  const { error: dbError } = await supabase.from('leads').insert(candidateRow);

  if (dbError) {
    // Fallback for legacy schema (no user_id/session_id columns yet).
    const legacy = await supabase
      .from('leads')
      .insert({ name, phone, note: combinedNote });

    if (legacy.error) {
      console.error('[Supabase Error]:', dbError);
      console.error('[Supabase Error Legacy]:', legacy.error);
      return new Response('Database insert failed', { status: 500 });
    }
  }

  const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const agentUserId = process.env.TEST_AGENT_USER_ID;
  if (lineToken && agentUserId) {
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lineToken}`,
      },
      body: JSON.stringify({
        to: agentUserId,
        messages: [
          {
            type: 'text',
            text: `🔥 新客戶留單！\n----------------\n👤 姓名: ${name}\n📞 電話: ${phone}\n📝 備註: ${combinedNote || '無'}`,
          },
        ],
      }),
    });

    if (!lineResponse.ok) {
      const errorText = await lineResponse.text();
      console.error('[LINE API Error]:', errorText);
      // 資料已寫入 DB，LINE 失敗不阻擋成功回應
    }
  }

  return Response.json({ success: true });
}
