import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import {
  DEFAULT_BUSINESS_CARD,
  type BusinessCard,
} from '@/lib/businessCard';

export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

const Stringish = z.preprocess((v) => {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return undefined;
}, z.string().optional());

const StringArrayish = z.preprocess((v) => {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    const parts = v
      .split(/\r?\n|,|、|\u2022|·|•/g)
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : [v];
  }
  return undefined;
}, z.array(z.string()).optional());

const ExtractedCardSchema = z
  .object({
    name: Stringish,
    title: Stringish,
    company: Stringish,
    location: Stringish,
    phone: Stringish,
    line: Stringish,
    email: Stringish,
    hours: Stringish,
    highlights: StringArrayish,
    bio: Stringish,
    services: StringArrayish,
  })
  // Allow extra keys without failing object generation.
  .passthrough();

function cleanText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
}

function coalesceText(value: unknown, fallback: string): string {
  const t = cleanText(value);
  return t ? t : fallback;
}

function coalesceStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map((v) => cleanText(v))
    .filter(Boolean)
    .slice(0, 12);
  return items.length > 0 ? items : fallback;
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response('Missing OPENAI_API_KEY', { status: 500 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return new Response('Invalid form data', { status: 400 });
  }

  const fileValue = form.get('file');
  if (!fileValue) {
    return new Response('Missing file', { status: 400 });
  }

  // In Node/Next, multipart values are typically `File`, but be tolerant.
  const blob: Blob | File = fileValue instanceof Blob ? fileValue : (null as any);
  if (!blob) {
    return new Response('Invalid file', { status: 400 });
  }

  const mediaType = typeof (blob as any).type === 'string' ? (blob as any).type : '';
  if (!mediaType.startsWith('image/')) {
    return new Response('Unsupported file type (expected image/*)', { status: 400 });
  }

  if (typeof (blob as any).size === 'number' && (blob as any).size > MAX_IMAGE_BYTES) {
    return new Response('Image too large (max 8MB)', { status: 413 });
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());

  const instruction = `
你是一個 OCR + 資料抽取器。
請從「傳統紙本名片」照片中，擷取並結構化以下欄位。

規則：
- 只回傳 schema 需要的欄位，不要加入額外欄位。
- 如果某欄位在名片上不存在，請省略該欄位（不要硬編造）。
- 文字請保留原語言（可能是中文或英文）。
- 電話請保留原格式（例如 02-xxxx-xxxx / 09xx-xxx-xxx）。
- highlights / services：若名片上有條列或關鍵字就擷取；沒有就省略。
- location：若有地址/城市/據點資訊才填。
- hours：若有營業時間才填。
`;

  let object: unknown;
  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: ExtractedCardSchema,
      schemaName: 'BusinessCardExtraction',
      schemaDescription:
        '從傳統名片圖片抽取欄位（name/title/company/location/phone/line/email/hours/highlights/bio/services）。缺少就省略。',
      system: instruction,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: '請解析這張名片。' },
            { type: 'image', image: bytes, mediaType },
          ],
        },
      ],
      temperature: 0,
    });
    object = result.object;
  } catch (e: any) {
    const message =
      (typeof e?.message === 'string' && e.message) ||
      (typeof e === 'string' && e) ||
      'Card import failed';
    console.error('[card-import] generateObject failed:', e);
    return new Response(message, { status: 500 });
  }

  const extracted = ExtractedCardSchema.safeParse(object);
  if (!extracted.success) {
    console.error('[card-import] schema validation failed:', extracted.error);
    return new Response('Failed to parse model output', { status: 500 });
  }

  const nextCard: BusinessCard = {
    ...DEFAULT_BUSINESS_CARD,
    template: DEFAULT_BUSINESS_CARD.template,
    name: coalesceText(extracted.data.name, DEFAULT_BUSINESS_CARD.name),
    title: coalesceText(extracted.data.title, DEFAULT_BUSINESS_CARD.title),
    company: coalesceText(extracted.data.company, DEFAULT_BUSINESS_CARD.company),
    location: coalesceText(extracted.data.location, DEFAULT_BUSINESS_CARD.location),
    phone: coalesceText(extracted.data.phone, DEFAULT_BUSINESS_CARD.phone),
    line: coalesceText(extracted.data.line, DEFAULT_BUSINESS_CARD.line),
    email: coalesceText(extracted.data.email, DEFAULT_BUSINESS_CARD.email),
    hours: coalesceText(extracted.data.hours, DEFAULT_BUSINESS_CARD.hours),
    highlights: coalesceStringArray(
      extracted.data.highlights,
      DEFAULT_BUSINESS_CARD.highlights,
    ),
    bio: coalesceText(extracted.data.bio, DEFAULT_BUSINESS_CARD.bio),
    services: coalesceStringArray(
      extracted.data.services,
      DEFAULT_BUSINESS_CARD.services,
    ),
  };

  return Response.json({ businessCard: nextCard });
}
