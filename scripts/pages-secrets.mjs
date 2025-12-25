import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

function parseArgs(argv) {
  const args = { project: '', from: '.env.local' };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--project' || a === '--project-name') {
      args.project = String(argv[i + 1] || '').trim();
      i += 1;
      continue;
    }
    if (a === '--from' || a === '--env-file') {
      args.from = String(argv[i + 1] || '').trim() || args.from;
      i += 1;
      continue;
    }
    if (a === '-h' || a === '--help') {
      args.help = true;
    }
  }
  return args;
}

function parseDotenv(content) {
  const out = new Map();
  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1);

    // Strip surrounding quotes (simple cases)
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    out.set(key, value);
  }
  return out;
}

function runWranglerPut({ project, key, value }) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'npx',
      ['-y', 'wrangler', 'pages', 'secret', 'put', key, '--project-name', project],
      {
        stdio: ['pipe', 'inherit', 'inherit'],
      },
    );

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`wrangler pages secret put ${key} failed with exit code ${code}`));
    });

    // Wrangler reads the secret value from stdin.
    child.stdin.write(String(value ?? ''));
    child.stdin.write('\n');
    child.stdin.end();
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log('Usage: node scripts/pages-secrets.mjs --project <name> [--from .env.local]');
    process.exit(0);
  }

  if (!args.project) {
    console.error('Missing --project <name>');
    process.exit(1);
  }

  const content = await readFile(args.from, 'utf8');
  const env = parseDotenv(content);

  const keys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'DEFAULT_OWNER_USER_ID',
  ];

  const present = keys.filter((k) => (env.get(k) || '').trim().length > 0);
  const missing = keys.filter((k) => !present.includes(k));

  if (present.length === 0) {
    console.error(`No expected keys found in ${args.from}.`);
    console.error('Expected one of: ' + keys.join(', '));
    process.exit(1);
  }

  console.log(`Setting ${present.length} Pages secrets on project: ${args.project}`);
  if (missing.length) {
    console.warn('Skipping missing keys: ' + missing.join(', '));
  }

  for (const key of present) {
    console.log(`- put ${key}`);
    await runWranglerPut({ project: args.project, key, value: env.get(key) });
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
