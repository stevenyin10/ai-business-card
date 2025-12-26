'use client';

import { BusinessCardView } from '@/app/components/BusinessCardView';
import {
  BUSINESS_CARD_STORAGE_KEY,
  DEFAULT_BUSINESS_CARD,
  safeParseBusinessCard,
  type BusinessCard,
} from '@/lib/businessCard';
import Link from 'next/link';
import { useMemo, useState } from 'react';

function splitLines(value: string) {
  return value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinLines(value: string[]) {
  return value.join('\n');
}

export default function DashboardPage() {
  const [card, setCard] = useState<BusinessCard>(() => {
    try {
      if (typeof window === 'undefined') return DEFAULT_BUSINESS_CARD;
      const raw = localStorage.getItem(BUSINESS_CARD_STORAGE_KEY);
      if (!raw) return DEFAULT_BUSINESS_CARD;
      const parsed = safeParseBusinessCard(JSON.parse(raw));
      return parsed ?? DEFAULT_BUSINESS_CARD;
    } catch {
      return DEFAULT_BUSINESS_CARD;
    }
  });
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const highlightsText = useMemo(() => joinLines(card.highlights), [card.highlights]);
  const servicesText = useMemo(() => joinLines(card.services), [card.services]);
  const carouselText = useMemo(
    () => joinLines(card.carouselImageUrls),
    [card.carouselImageUrls],
  );

  const save = () => {
    localStorage.setItem(BUSINESS_CARD_STORAGE_KEY, JSON.stringify(card));
    setSavedAt(Date.now());
  };

  const reset = () => {
    localStorage.removeItem(BUSINESS_CARD_STORAGE_KEY);
    setCard(DEFAULT_BUSINESS_CARD);
    setSavedAt(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-gray-900 font-semibold text-2xl tracking-tight">Dashboard</div>
            <div className="mt-1 text-gray-600 text-sm">
              客製化名片內容（儲存在本機瀏覽器 localStorage）。
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href="/dashboard/leads"
              className="px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium"
            >
              業務後台
            </Link>
            <Link
              href="/dashboard/survey"
              className="px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium"
            >
              問卷設定
            </Link>
            <Link
              href="/dashboard/knowledge"
              className="px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium"
            >
              知識庫
            </Link>
            <Link
              href="/"
              className="px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium"
            >
              回首頁
            </Link>
            <button
              type="button"
              onClick={reset}
              className="px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium"
            >
              重置
            </button>
            <button
              type="button"
              onClick={save}
              className="px-3 py-1.5 rounded-full bg-gray-950 hover:bg-gray-900 text-white text-sm font-medium"
            >
              保存
            </button>
          </div>
        </div>

        {savedAt ? (
          <div className="mt-4 text-sm text-gray-600">
            已保存（{new Date(savedAt).toLocaleString('zh-TW')}）
          </div>
        ) : null}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <div className="text-gray-900 font-semibold tracking-tight">名片內容</div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <div className="text-xs font-medium text-gray-600">模板</div>
                <select
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                  value={card.template}
                  onChange={(e) =>
                    setCard({
                      ...card,
                      template: e.target.value as BusinessCard['template'],
                    })
                  }
                >
                  <option value="classic">Classic（純文字極簡）</option>
                  <option value="impact">Impact（半圓＋圖片槽）</option>
                  <option value="gallery">Gallery（輪播主視覺）</option>
                  <option value="split">Split（左右分欄主視覺）</option>
                </select>
              </label>

              <label className="block">
                <div className="text-xs font-medium text-gray-600">姓名</div>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                  value={card.name}
                  onChange={(e) => setCard({ ...card, name: e.target.value })}
                />
              </label>

              <label className="block">
                <div className="text-xs font-medium text-gray-600">職稱</div>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                  value={card.title}
                  onChange={(e) => setCard({ ...card, title: e.target.value })}
                />
              </label>

              <label className="block">
                <div className="text-xs font-medium text-gray-600">品牌／據點</div>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                  value={card.company}
                  onChange={(e) => setCard({ ...card, company: e.target.value })}
                />
              </label>

              <label className="block">
                <div className="text-xs font-medium text-gray-600">地點</div>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                  value={card.location}
                  onChange={(e) => setCard({ ...card, location: e.target.value })}
                />
              </label>

              <label className="block">
                <div className="text-xs font-medium text-gray-600">電話</div>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                  value={card.phone}
                  onChange={(e) => setCard({ ...card, phone: e.target.value })}
                />
              </label>

              <label className="block">
                <div className="text-xs font-medium text-gray-600">LINE</div>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                  value={card.line}
                  onChange={(e) => setCard({ ...card, line: e.target.value })}
                />
              </label>

              <label className="block">
                <div className="text-xs font-medium text-gray-600">Email</div>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                  value={card.email}
                  onChange={(e) => setCard({ ...card, email: e.target.value })}
                />
              </label>

              <label className="block">
                <div className="text-xs font-medium text-gray-600">服務時間</div>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                  value={card.hours}
                  onChange={(e) => setCard({ ...card, hours: e.target.value })}
                />
              </label>
            </div>

            <label className="block mt-4">
              <div className="text-xs font-medium text-gray-600">自介（1–2 句）</div>
              <textarea
                className="mt-1 w-full min-h-[96px] rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                value={card.bio}
                onChange={(e) => setCard({ ...card, bio: e.target.value })}
              />
            </label>

            <div className="mt-4 grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <div className="text-xs font-medium text-gray-600">左側圖片 URL</div>
                  <input
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                    value={card.leftImageUrl}
                    onChange={(e) => setCard({ ...card, leftImageUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </label>

                <label className="block">
                  <div className="text-xs font-medium text-gray-600">右側圖片 URL</div>
                  <input
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                    value={card.rightImageUrl}
                    onChange={(e) => setCard({ ...card, rightImageUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <div className="text-xs font-medium text-gray-600">內容左側圖片 URL</div>
                  <input
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                    value={card.contentLeftImageUrl}
                    onChange={(e) =>
                      setCard({ ...card, contentLeftImageUrl: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </label>

                <label className="block">
                  <div className="text-xs font-medium text-gray-600">內容右側圖片 URL</div>
                  <input
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                    value={card.contentRightImageUrl}
                    onChange={(e) =>
                      setCard({ ...card, contentRightImageUrl: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </label>
              </div>

              <label className="block">
                <div className="text-xs font-medium text-gray-600">內容底部圖片 URL</div>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                  value={card.contentBottomImageUrl}
                  onChange={(e) =>
                    setCard({ ...card, contentBottomImageUrl: e.target.value })
                  }
                  placeholder="https://..."
                />
              </label>

              <label className="block">
                <div className="text-xs font-medium text-gray-600">亮點標籤（每行一個）</div>
                <textarea
                  className="mt-1 w-full min-h-[96px] rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                  value={highlightsText}
                  onChange={(e) =>
                    setCard({ ...card, highlights: splitLines(e.target.value) })
                  }
                />
              </label>

              <label className="block">
                <div className="text-xs font-medium text-gray-600">我可以協助（每行一個）</div>
                <textarea
                  className="mt-1 w-full min-h-[140px] rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                  value={servicesText}
                  onChange={(e) =>
                    setCard({ ...card, services: splitLines(e.target.value) })
                  }
                />
              </label>

              <label className="block">
                <div className="text-xs font-medium text-gray-600">輪播圖片 URL（每行一張）</div>
                <textarea
                  className="mt-1 w-full min-h-[140px] rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
                  value={carouselText}
                  onChange={(e) =>
                    setCard({ ...card, carouselImageUrls: splitLines(e.target.value) })
                  }
                  placeholder="https://..."
                />
              </label>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={save}
                className="flex-1 bg-gray-950 hover:bg-gray-900 text-white rounded-full py-2.5 font-medium"
              >
                保存
              </button>
              <button
                type="button"
                onClick={reset}
                className="flex-1 border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 rounded-full py-2.5 font-medium"
              >
                重置
              </button>
            </div>
          </div>

          <div>
            <div className="text-gray-900 font-semibold tracking-tight mb-3">即時預覽</div>
            <BusinessCardView
              card={card}
              cta={
                <div className="text-sm text-gray-600">
                  這裡是預覽區，首頁名片模式會套用同一份設定。
                </div>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
