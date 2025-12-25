import { openai as aiOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { addFileToVectorStore, getOrCreateUserVectorStoreId, type SupabaseLike } from '@/lib/openaiVectorStore';

export const runtime = 'edge';

const KNOWLEDGE_FILES_BUCKET = 'agent-knowledge-files';

function sanitizeFilename(name: string): string {
  return (name || 'file')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

function extensionFromMime(mimeType: string): string {
  const mt = (mimeType || '').toLowerCase();
  if (mt === 'image/jpeg' || mt === 'image/jpg') return 'jpg';
  if (mt === 'image/png') return 'png';
  if (mt === 'image/webp') return 'webp';
  if (mt === 'image/gif') return 'gif';
  return 'bin';
}

// Helper to get Supabase Admin Client
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

function arrayBufferToBase64(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function getUserId(req: Request, supabase: SupabaseAdminClient) {
  const token = getBearerToken(req);
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

export async function POST(req: Request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return Response.json({ error: 'Server config error' }, { status: 500 });

  const userId = await getUserId(req, supabase);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

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
    console.error('[knowledge/upload] vector store init failed:', msg);
    return Response.json({ error: '向量庫初始化失敗（請確認 OPENAI_API_KEY 與資料表 user_vector_stores 已建立）' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    const sourceFilePath = String(formData.get('source_file_path') || '').trim();
    const sourceFileName = String(formData.get('source_file_name') || '').trim();
    const sourcePage = String(formData.get('source_page') || '').trim();

    if (!file) {
      return Response.json({ error: 'No file uploaded' }, { status: 400 });
    }

    let content = '';
    let uploadedObjectPath: string | null = null;

    if (file.type === 'application/pdf') {
      // Store the original PDF file in Supabase Storage for later reference.
      const arrayBuffer = await file.arrayBuffer();
      const safeName = sanitizeFilename(file.name);
      const objectPath = `${userId}/${crypto.randomUUID()}-${safeName || 'document'}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from(KNOWLEDGE_FILES_BUCKET)
        .upload(objectPath, new Uint8Array(arrayBuffer), {
          contentType: file.type || 'application/pdf',
          upsert: false,
        });

      if (uploadError) {
        console.error('[knowledge/upload] pdf storage upload failed:', uploadError);
        const hint = String(uploadError.message || '').toLowerCase().includes('bucket')
          ? ` (請確認 Supabase Storage 已建立 bucket: ${KNOWLEDGE_FILES_BUCKET})`
          : '';
        return Response.json({ error: `PDF 檔案保存失敗${hint}` }, { status: 500 });
      }

      // Also upload the PDF to OpenAI and add it into this user's vector store.
      try {
        const { openaiFileId, batchId } = await addFileToVectorStore({
          openai,
          vectorStoreId,
          file,
        });

        // Best-effort record for dashboard "上傳檔案/訓練狀態".
        try {
          await supabase.from('agent_knowledge_files').insert({
            user_id: userId,
            kind: 'pdf',
            original_name: file.name,
            storage_bucket: KNOWLEDGE_FILES_BUCKET,
            storage_path: objectPath,
            openai_file_id: openaiFileId,
            openai_batch_id: batchId,
          });
        } catch {
          // ignore
        }

        return Response.json({
          success: true,
          storagePath: objectPath,
          bucket: KNOWLEDGE_FILES_BUCKET,
          vectorStoreId,
          openaiFileId,
          batchId,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[knowledge/upload] openai pdf ingest failed:', msg);
        return Response.json({
          error: '已保存 PDF 到 Storage，但送入 OpenAI 向量庫失敗（請確認 OPENAI_API_KEY 權限與檔案大小限制）',
          storagePath: objectPath,
          bucket: KNOWLEDGE_FILES_BUCKET,
        }, { status: 500 });
      }
    } else if (file.type.startsWith('image/')) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);
      const mimeType = file.type; // e.g. image/png

      // Store the original image for history/review.
      const safeName = sanitizeFilename(file.name || 'image');
      const baseName = safeName.replace(/\.[^.]+$/, '') || 'image';
      const ext = extensionFromMime(mimeType);
      const objectPath = `${userId}/${crypto.randomUUID()}-${baseName}.${ext}`;
      uploadedObjectPath = objectPath;

      const { error: imgUploadError } = await supabase.storage
        .from(KNOWLEDGE_FILES_BUCKET)
        .upload(objectPath, new Uint8Array(arrayBuffer), {
          contentType: mimeType || 'application/octet-stream',
          upsert: false,
        });

      if (imgUploadError) {
        console.error('[knowledge/upload] image storage upload failed:', imgUploadError);
        const hint = String(imgUploadError.message || '').toLowerCase().includes('bucket')
          ? ` (請確認 Supabase Storage 已建立 bucket: ${KNOWLEDGE_FILES_BUCKET})`
          : '';
        return Response.json({ error: `圖片保存失敗${hint}` }, { status: 500 });
      }

      // Use GPT-4o to extract info from image
      const { text } = await generateText({
        model: aiOpenAI('gpt-4o'),
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: '請詳細讀取這張圖片的內容。如果是文件或截圖，請將文字完整提取出來；如果是圖表或照片，請詳細描述其細節與數據。這些內容將存入知識庫供 AI 銷售顧問使用。' },
              { type: 'image', image: `data:${mimeType};base64,${base64}` },
            ],
          },
        ],
      });
      const headerParts: string[] = [];
      if (sourceFilePath) {
        const n = sourceFileName || 'source.pdf';
        const p = sourcePage ? ` page=${sourcePage}` : '';
        headerParts.push(`[SOURCE_FILE] name="${n}" path="${sourceFilePath}"${p}`);
      }
      content = `${headerParts.join('\n')}${headerParts.length ? '\n' : ''}${text}`;
    } else {
      return Response.json({ error: '不支援的檔案格式 (僅支援 PDF 與圖片)' }, { status: 400 });
    }

    content = content.trim();
    if (!content) {
      return Response.json({ error: '無法從檔案中提取文字' }, { status: 400 });
    }

    // Add OCR'd / extracted text into vector store as a .txt file
    const safeBase = sanitizeFilename(file.name || 'image');
    const txtFile = new File([content], `${safeBase || 'image'}.txt`, { type: 'text/plain' });

    const { openaiFileId, batchId } = await addFileToVectorStore({
      openai,
      vectorStoreId,
      file: txtFile,
    });

    // Save to DB for the dashboard list (embedding is optional now)
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

    // Best-effort record for dashboard "上傳檔案/訓練狀態".
    try {
      await supabase.from('agent_knowledge_files').insert({
        user_id: userId,
        kind: 'image',
        original_name: file.name,
        storage_bucket: KNOWLEDGE_FILES_BUCKET,
        storage_path: uploadedObjectPath,
        openai_file_id: openaiFileId,
        openai_batch_id: batchId,
        knowledge_id: inserted?.id ?? null,
      });
    } catch {
      // ignore
    }

    return Response.json({
      success: true,
      vectorStoreId,
      openaiFileId,
      batchId,
      storagePath: uploadedObjectPath || undefined,
      bucket: uploadedObjectPath ? KNOWLEDGE_FILES_BUCKET : undefined,
      extractedText: content.slice(0, 100) + '...',
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Upload error:', msg);
    return Response.json({ error: msg || 'Upload failed' }, { status: 500 });
  }
}
