'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  BUSINESS_CARD_STORAGE_KEY,
  DEFAULT_BUSINESS_CARD,
  safeParseBusinessCard,
  type BusinessCard,
} from '@/lib/businessCard';
import { BusinessCardView } from '@/app/components/BusinessCardView';

type ImportResult = {
  businessCard: BusinessCard;
};

export default function ImportBusinessCardPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [existingTemplate, setExistingTemplate] = useState<BusinessCard['template']>(
    DEFAULT_BUSINESS_CARD.template,
  );
  const [resultCard, setResultCard] = useState<BusinessCard | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BUSINESS_CARD_STORAGE_KEY);
      if (!raw) return;
      const parsed = safeParseBusinessCard(JSON.parse(raw));
      if (parsed) setExistingTemplate(parsed.template);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const canSubmit = useMemo(() => !!file && !loading, [file, loading]);

  const saveToLocalStorage = (card: BusinessCard) => {
    try {
      localStorage.setItem(BUSINESS_CARD_STORAGE_KEY, JSON.stringify(card));
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-[100svh] bg-black text-white selection:bg-amber-500/30 overflow-x-hidden">
      <div className="mx-auto max-w-5xl min-h-[100svh] flex flex-col">
        <div className="sticky top-0 z-10 bg-black/30 backdrop-blur-3xl border-b border-white/10">
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="font-semibold tracking-tight">匯入傳統名片</div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 active:bg-white/15"
              >
                回首頁
              </Link>
              <Link
                href="/dashboard"
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 active:bg-white/15"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 shadow-sm p-5">
            <div className="text-white font-semibold tracking-tight">上傳名片照片</div>
            <div className="mt-1 text-sm text-white/70">
              上傳後會自動解析姓名、職稱、公司、電話、Email 等資訊，並轉成我們的名片格式。
            </div>

            <label className="mt-4 block">
              <div className="text-xs font-medium text-white/70">選擇圖片檔</div>
              <input
                type="file"
                accept="image/*"
                className="mt-1 block w-full text-sm text-white file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-black hover:file:invert"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setError(null);
                  setResultCard(null);
                  setFile(f);
                }}
              />
            </label>

            {previewUrl && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
                <div className="relative w-full aspect-[4/3]">
                  <Image
                    src={previewUrl}
                    alt="名片預覽"
                    fill
                    sizes="100vw"
                    className="object-contain"
                    unoptimized
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                disabled={!canSubmit}
                onClick={async () => {
                  if (!file) return;
                  setLoading(true);
                  setError(null);
                  setResultCard(null);

                  try {
                    const form = new FormData();
                    form.append('file', file);

                    const res = await fetch('/api/card-import', {
                      method: 'POST',
                      body: form,
                    });

                    if (!res.ok) {
                      const text = await res.text().catch(() => '');
                      throw new Error(text || '轉換失敗');
                    }

                    const json = (await res.json()) as ImportResult;
                    const nextCard: BusinessCard = {
                      ...DEFAULT_BUSINESS_CARD,
                      ...json.businessCard,
                      template: existingTemplate,
                      leftImageUrl: '',
                      rightImageUrl: '',
                      contentLeftImageUrl: '',
                      contentRightImageUrl: '',
                      contentBottomImageUrl: '',
                      carouselImageUrls: [],
                    };

                    setResultCard(nextCard);
                    saveToLocalStorage(nextCard);
                  } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : String(e);
                    setError(msg || '轉換失敗');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:invert disabled:opacity-50"
              >
                {loading ? '轉換中…' : '一鍵轉換'}
              </button>

              <Link
                href="/"
                className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm font-medium hover:bg-white/10 active:bg-white/15"
              >
                轉換後去看名片
              </Link>
            </div>

            <div className="mt-3 text-xs text-white/50">
              提醒：解析結果可能需要到 Dashboard 微調。
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 shadow-sm p-5">
            <div className="text-white font-semibold tracking-tight">預覽（轉換後）</div>
            <div className="mt-1 text-sm text-white/70">
              轉換成功後會自動套用你目前的名片模板。
            </div>

            <div className="mt-4">
              <BusinessCardView card={resultCard ?? DEFAULT_BUSINESS_CARD} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
