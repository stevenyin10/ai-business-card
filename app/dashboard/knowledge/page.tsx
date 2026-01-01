'use client';

import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Plus, Loader2, Upload } from 'lucide-react';

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

function pdfTextItemToString(item: unknown): string {
  if (item && typeof item === 'object' && 'str' in item) {
    const v = (item as { str?: unknown }).str;
    return typeof v === 'string' ? v : '';
  }
  return '';
}

type KnowledgeRow = {
  id: number;
  content: string;
  created_at: string;
};

type KnowledgeFileRow = {
  id: number;
  kind: string;
  original_name: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  openai_batch_id: string | null;
  created_at: string;
};

type VectorStoreStatus =
  | { present: false }
  | {
      present: true;
      vectorStoreId: string;
      vectorStore?: {
        file_counts?: {
          in_progress?: number;
          completed?: number;
          failed?: number;
          total?: number;
        };
      };
    };

export default function KnowledgePage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userEmail, setUserEmail] = useState('');
  const [accessToken, setAccessToken] = useState('');

  const [items, setItems] = useState<KnowledgeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [vectorStore, setVectorStore] = useState<VectorStoreStatus>({ present: false });
  const [loadingVectorStore, setLoadingVectorStore] = useState(false);

  const [files, setFiles] = useState<KnowledgeFileRow[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [batchStatus, setBatchStatus] = useState<Record<string, { status?: string; error?: string }>>({});
  const [refreshingBatchStatus, setRefreshingBatchStatus] = useState(false);

  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [useAiVision, setUseAiVision] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!data.session) {
        router.replace('/login');
        return;
      }
      setUserEmail(data.session.user.email ?? '');
      setAccessToken(data.session.access_token);
    })();
    return () => { mounted = false; };
  }, [router, supabase]);

  const fetchItems = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch('/api/knowledge', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setItems(json.data || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const fetchVectorStore = async (opts?: { ensure?: boolean }) => {
    if (!accessToken) return;
    setLoadingVectorStore(true);
    try {
      const res = await fetch('/api/knowledge/vector-store', {
        method: opts?.ensure ? 'POST' : 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json().catch(() => ({ present: false }));
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setVectorStore(json as VectorStoreStatus);
    } catch {
      setVectorStore({ present: false });
    } finally {
      setLoadingVectorStore(false);
    }
  };

  const fetchFiles = async () => {
    if (!accessToken) return;
    setLoadingFiles(true);
    setFilesError(null);
    try {
      const res = await fetch('/api/knowledge/files', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setFiles((json.data as KnowledgeFileRow[]) ?? []);
    } catch (e: unknown) {
      setFilesError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchItems();
      fetchVectorStore();
      fetchFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ content: newContent }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setNewContent('');
      fetchItems();
    } catch (e: unknown) {
      alert(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const openStoredFile = async (row: KnowledgeFileRow) => {
    if (!row.storage_bucket || !row.storage_path) return;
    try {
      const qs = new URLSearchParams({ bucket: row.storage_bucket, path: row.storage_path });
      const res = await fetch(`/api/knowledge/file-url?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      const url = String(json.url || '').trim();
      if (!url) throw new Error('缺少 signedUrl');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  const refreshTrainingStatus = async () => {
    const ids = Array.from(
      new Set(
        files
          .map((f) => (f.openai_batch_id || '').trim())
          .filter(Boolean),
      ),
    ).slice(0, 20);
    if (ids.length === 0) return;

    setRefreshingBatchStatus(true);
    try {
      const res = await fetch('/api/knowledge/batch-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ batchIds: ids }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      const batches = (json.batches as Record<string, { status?: string; error?: string }>) ?? {};
      setBatchStatus((prev) => ({ ...prev, ...batches }));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshingBatchStatus(false);
    }
  };

  const handleDeleteFile = async (id: number) => {
    if (!confirm('確定要刪除這個檔案（並移除訓練資料）嗎？')) return;
    try {
      const res = await fetch(`/api/knowledge/files?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to delete');
      setFiles((prev) => prev.filter((f) => f.id !== id));
      // If this file is linked to a knowledge row, refresh list for consistency.
      fetchItems();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('檔案大小不能超過 10MB');
      return;
    }

    setUploading(true);
    try {
      // 如果是 PDF
      if (file.type === 'application/pdf') {
        // 先上傳並保存原始 PDF 檔案（用於日後查閱/追溯）
        const pdfForm = new FormData();
        pdfForm.append('file', file);

        const pdfStoreRes = await fetch('/api/knowledge/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: pdfForm,
        });

        const pdfStoreJson = (await pdfStoreRes.json().catch(() => ({}))) as {
          error?: string;
          storagePath?: string;
        };
        if (!pdfStoreRes.ok) {
          throw new Error(pdfStoreJson.error || 'PDF 檔案保存失敗');
        }

        const sourcePath = String(pdfStoreJson.storagePath || '').trim();
        if (!sourcePath) throw new Error('PDF 檔案保存成功但缺少 storagePath');

        // 動態載入 pdfjs-dist 以避免 SSR/Build 錯誤
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        
        if (useAiVision) {
          // 使用 AI 視覺模式：將每一頁轉成圖片，上傳給 GPT-4o Vision 分析
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for better quality
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (!context) continue;

            await page.render({ canvasContext: context, viewport } as unknown as Parameters<typeof page.render>[0]).promise;

            // Convert canvas to blob
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
            if (!blob) continue;

            // Upload as image
            const formData = new FormData();
            formData.append('file', new File([blob], `page-${i}.jpg`, { type: 'image/jpeg' }));
            formData.append('source_file_path', sourcePath);
            formData.append('source_file_name', file.name);
            formData.append('source_page', String(i));

            const res = await fetch('/api/knowledge/upload', {
              method: 'POST',
              headers: { Authorization: `Bearer ${accessToken}` },
              body: formData,
            });

            if (!res.ok) {
              const json = (await res.json().catch(() => ({}))) as { error?: string };
              console.error(`Page ${i} upload failed`, json);
            }
          }
        } else {
          // 一般文字模式
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = (textContent.items as unknown[]).map(pdfTextItemToString).filter(Boolean).join(' ');
            fullText += pageText + '\n';
          }

          if (!fullText.trim()) {
            throw new Error('無法從 PDF 中提取文字，可能是掃描檔。請勾選「使用 AI 視覺辨識」再試一次。');
          }

          const contentWithSource = `[SOURCE_FILE] name="${file.name}" path="${sourcePath}"\n${fullText}`;

          const res = await fetch('/api/knowledge', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ content: contentWithSource }),
          });
          
          if (!res.ok) {
            const json = await res.json();
            throw new Error(json.error || 'Failed to save PDF content');
          }
        }
      } else {
        // 圖片或其他檔案，走原本的 upload API (後端處理)
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/knowledge/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        });
        
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || '上傳失敗');
      }
      
      alert('上傳成功！已提取文字並存入知識庫。');
      fetchItems();
      fetchFiles();
      fetchVectorStore();
    } catch (e: unknown) {
      console.error(e);
      alert(getErrorMessage(e) || '上傳失敗');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('確定要刪除這筆資料嗎？')) return;
    try {
      const res = await fetch(`/api/knowledge?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      setItems((prev) => prev.filter((i) => i.id !== id));
      fetchFiles();
      fetchVectorStore();
    } catch (e: unknown) {
      alert(getErrorMessage(e));
    }
  };

  return (
    <div className="min-h-[100svh] bg-black text-white selection:bg-amber-500/30 overflow-x-hidden">
      <div className="mx-auto max-w-4xl min-h-[100svh] flex flex-col">
        <div className="sticky top-0 z-10 bg-black/30 backdrop-blur-3xl border-b border-white/10">
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
            <div>
              <div className="font-semibold tracking-tight">AI 知識庫管理</div>
              <div className="text-xs text-white/50 mt-0.5">{userEmail}</div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/dashboard/leads"
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 active:bg-white/15"
              >
                回業務後台
              </a>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 sm:px-6 py-6 space-y-6">
          {/* Add New */}
          <div className="rounded-3xl border border-white/10 bg-white/5 shadow-sm p-5">
            <div className="font-semibold tracking-tight mb-1">新增知識</div>
            <div className="text-sm text-white/60 mb-4">
              輸入您希望 AI 學習的銷售話術、常見問題回答、或談判技巧。AI 會在對話時自動參考這些內容。
            </div>
            <form onSubmit={handleSubmit}>
              <textarea
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm min-h-[120px] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/30"
                placeholder="例如：如果客戶覺得價格太高，可以強調我們的售後服務價值..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                disabled={submitting}
              />
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>{uploading ? '處理中...' : '上傳 PDF / 圖片'}</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </label>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-white/40 hidden sm:inline-block">支援 PDF 文件或圖片 (OCR)</span>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={useAiVision} 
                        onChange={(e) => setUseAiVision(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-white/20 bg-black/30 text-amber-500 focus:ring-2 focus:ring-amber-500/30"
                      />
                      <span className="text-xs text-white/50">使用 AI 視覺辨識 (適合商品 DM / 掃描檔)</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !newContent.trim()}
                  className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:invert disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  新增至知識庫
                </button>
              </div>
            </form>
          </div>

          {/* Vector store status */}
          <div className="rounded-3xl border border-white/10 bg-white/5 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold tracking-tight">RAG 訓練狀態</div>
                <div className="text-sm text-white/60 mt-1">
                  顯示目前向量庫的檔案數量與訓練進度。
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchVectorStore()}
                  disabled={loadingVectorStore}
                  className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-medium disabled:opacity-50"
                >
                  {loadingVectorStore ? '更新中…' : '重新整理'}
                </button>
                <button
                  type="button"
                  onClick={() => fetchVectorStore({ ensure: true })}
                  disabled={loadingVectorStore}
                  className="px-3 py-1.5 rounded-full bg-white text-black hover:invert text-sm font-medium disabled:opacity-50"
                >
                  啟用 RAG
                </button>
              </div>
            </div>

            {vectorStore.present ? (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                  <div className="text-xs text-white/50">總檔案</div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    {vectorStore.vectorStore?.file_counts?.total ?? '-'}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                  <div className="text-xs text-white/50">完成</div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    {vectorStore.vectorStore?.file_counts?.completed ?? '-'}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                  <div className="text-xs text-white/50">進行中</div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    {vectorStore.vectorStore?.file_counts?.in_progress ?? '-'}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                  <div className="text-xs text-white/50">失敗</div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    {vectorStore.vectorStore?.file_counts?.failed ?? '-'}
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-4 text-xs text-white/50 mt-1">
                  Vector Store ID：{vectorStore.vectorStoreId}
                </div>
              </div>
            ) : (
              <div className="mt-4 text-sm text-white/60">
                尚未初始化向量庫。可先上傳檔案或點「啟用 RAG」。
              </div>
            )}
          </div>

          {/* Uploaded files */}
          <div className="rounded-3xl border border-white/10 bg-white/5 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold tracking-tight">已上傳檔案</div>
                <div className="text-sm text-white/60 mt-1">
                  檢視過往上傳檔案，並可更新訓練狀態或刪除。
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchFiles}
                  disabled={loadingFiles}
                  className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-medium disabled:opacity-50"
                >
                  {loadingFiles ? '讀取中…' : '重新整理'}
                </button>
                <button
                  type="button"
                  onClick={refreshTrainingStatus}
                  disabled={refreshingBatchStatus || files.length === 0}
                  className="px-3 py-1.5 rounded-full bg-white text-black hover:invert text-sm font-medium disabled:opacity-50"
                >
                  {refreshingBatchStatus ? '更新中…' : '更新訓練狀態'}
                </button>
              </div>
            </div>

            {loadingFiles ? (
              <div className="text-center py-8 text-white/50">讀取中...</div>
            ) : filesError ? (
              <div className="text-center py-8 text-red-200">{filesError}</div>
            ) : files.length === 0 ? (
              <div className="text-center py-8 text-white/50 bg-white/5 rounded-2xl border border-white/10 border-dashed">
                尚無檔案記錄。
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {files.map((f) => {
                  const bid = (f.openai_batch_id || '').trim();
                  const st = bid ? batchStatus[bid]?.status || (batchStatus[bid]?.error ? 'error' : '') : '';
                  return (
                    <div key={f.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {f.original_name || '(未命名)'}
                          </div>
                          <div className="mt-1 text-xs text-white/50">
                            類型：{f.kind}　•　上傳於：{new Date(f.created_at).toLocaleString('zh-TW')}
                            {st ? `　•　訓練：${st}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {f.storage_bucket && f.storage_path ? (
                            <button
                              type="button"
                              onClick={() => openStoredFile(f)}
                              className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-medium"
                            >
                              開啟
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(f.id)}
                            className="px-3 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 hover:bg-red-500/15 text-sm font-medium text-red-200"
                          >
                            刪除
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* List */}
          <div className="space-y-4">
            <div className="font-semibold tracking-tight px-1">已儲存的知識 ({items.length})</div>
            
            {loading ? (
              <div className="text-center py-10 text-white/50">讀取中...</div>
            ) : error ? (
              <div className="text-center py-10 text-red-200">{error}</div>
            ) : items.length === 0 ? (
              <div className="text-center py-10 text-white/50 bg-white/5 rounded-3xl border border-white/10 border-dashed">
                尚無資料，請上方新增。
              </div>
            ) : (
              <div className="grid gap-4">
                {items.map((item) => (
                  <div key={item.id} className="group relative rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="text-sm text-white whitespace-pre-wrap leading-relaxed pr-8">
                      {item.content}
                    </div>
                    <div className="mt-3 text-xs text-white/40">
                      建立於：{new Date(item.created_at).toLocaleString('zh-TW')}
                    </div>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="absolute top-3 right-3 p-2 text-white/40 hover:text-red-200 hover:bg-red-500/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                      title="刪除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
