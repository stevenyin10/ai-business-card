type RequestContext = {
  env?: unknown;
};

let cachedEnv: Record<string, unknown> | null | undefined;

async function getPagesEnv(): Promise<Record<string, unknown> | null> {
  if (cachedEnv !== undefined) return cachedEnv;
  try {
    const mod = (await import('@cloudflare/next-on-pages')) as unknown as {
      getRequestContext?: () => RequestContext | undefined;
    };
    const ctx = mod.getRequestContext?.();
    const env = ctx?.env;
    cachedEnv = env && typeof env === 'object' ? (env as Record<string, unknown>) : null;
  } catch {
    cachedEnv = null;
  }
  return cachedEnv;
}

export async function readEnv(name: string): Promise<string> {
  const direct = (process.env[name] || '').trim();
  if (direct) return direct;

  const pagesEnv = await getPagesEnv();
  const v = pagesEnv?.[name];
  return typeof v === 'string' ? v.trim() : '';
}
