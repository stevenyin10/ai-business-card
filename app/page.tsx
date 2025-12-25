import Link from 'next/link';
import { BusinessCardView } from '@/app/components/BusinessCardView';
import { DEFAULT_BUSINESS_CARD } from '@/lib/businessCard';

export default function HomePage() {
  const demoCard = {
    ...DEFAULT_BUSINESS_CARD,
    template: 'impact' as const,
    company: 'AI 名片 / 業務自動化',
    location: '線上服務',
  };

  return (
    <div className="min-h-[100svh] bg-white">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="font-semibold tracking-tight text-gray-900">AI 名片</div>
          <div className="flex items-center gap-2">
            <Link
              href="/import"
              className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
            >
              匯入名片
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
            >
              業務登入
            </Link>
            <Link
              href="/chat"
              className="text-sm font-medium px-3 py-1.5 rounded-full bg-gray-950 text-white hover:bg-gray-900 active:bg-gray-900"
            >
              開始體驗
            </Link>
          </div>
        </div>
      </div>

      <main>
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 sm:pt-16 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600">
                AI 自動回覆 · 名單收集 · 後台管理
              </div>
              <h1 className="mt-4 text-gray-950 font-semibold tracking-tight text-4xl sm:text-6xl leading-[1.05]">
                讓每一次詢問，
                <br />
                都變成可追蹤的名單
              </h1>
              <p className="mt-5 text-gray-600 text-base sm:text-lg leading-relaxed max-w-2xl">
                以極簡的對話體驗承接客戶，AI 自動回答常見問題、需要時引導留聯絡方式；業務端用後台看完整對話與名單。
              </p>

              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/chat"
                  className="inline-flex items-center justify-center rounded-full bg-gray-950 text-white px-6 py-3 text-sm font-medium hover:bg-gray-900"
                >
                  立即試用對話
                </Link>
                <Link
                  href="/dashboard/leads"
                  className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 px-6 py-3 text-sm font-medium hover:bg-gray-50"
                >
                  進入業務後台
                </Link>
              </div>

              <div className="mt-3 text-xs text-gray-500">
                不需要安裝 App。可直接部署到 Cloudflare Pages。
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-xs text-gray-600 mb-3">預覽：你的 AI 名片</div>
                <BusinessCardView
                  card={demoCard}
                  cta={
                    <Link
                      href="/chat"
                      className="block text-center w-full bg-gray-950 text-white rounded-full py-2.5 font-medium hover:bg-gray-900"
                    >
                      立即開始對話
                    </Link>
                  }
                />
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-gray-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-3xl border border-gray-200 bg-white p-6">
                <div className="text-gray-950 font-semibold tracking-tight">AI 自動回覆</div>
                <div className="mt-2 text-sm text-gray-600 leading-relaxed">
                  以你設定的銷售情境 prompt 搭配知識庫，處理常見問題、配備比較與活動資訊。
                </div>
              </div>
              <div className="rounded-3xl border border-gray-200 bg-white p-6">
                <div className="text-gray-950 font-semibold tracking-tight">名單收集</div>
                <div className="mt-2 text-sm text-gray-600 leading-relaxed">
                  當客人需要報價、試乘或後續聯繫，AI 會引導填表，資料自動進入後台名單。
                </div>
              </div>
              <div className="rounded-3xl border border-gray-200 bg-white p-6">
                <div className="text-gray-950 font-semibold tracking-tight">業務後台</div>
                <div className="mt-2 text-sm text-gray-600 leading-relaxed">
                  看訪客 session、聊天紀錄、問卷與名單；需要時可手動介入對話，掌握成交節奏。
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-gray-200 bg-gray-950">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <div className="text-white font-semibold tracking-tight text-2xl">把流量變成交付</div>
                <div className="mt-2 text-white/70 text-sm">先讓 AI 承接，再由業務在對的時機接手。</div>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/chat"
                  className="inline-flex items-center justify-center rounded-full bg-white text-gray-950 px-6 py-3 text-sm font-medium hover:bg-gray-100"
                >
                  開始聊天
                </Link>
                <Link
                  href="/import"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 bg-transparent text-white px-6 py-3 text-sm font-medium hover:bg-white/10"
                >
                  設定名片
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-gray-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-sm text-gray-600">© {new Date().getFullYear()} AI 名片</div>
              <div className="flex items-center gap-3 text-sm">
                <Link href="/chat" className="text-gray-600 hover:text-gray-900">
                  對話
                </Link>
                <Link href="/dashboard/leads" className="text-gray-600 hover:text-gray-900">
                  後台
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

/*

import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';
import { Send } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BusinessCardView } from '@/app/components/BusinessCardView';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import {
  BUSINESS_CARD_STORAGE_KEY,
  DEFAULT_BUSINESS_CARD,
  safeParseBusinessCard,
  type BusinessCard,
} from '@/lib/businessCard';

export default function Chat() {
  const [mode, setMode] = useState<'chat' | 'survey' | 'card'>('chat');

  const [sessionId] = useState<string>(() => {
    const key = 'ai-chat-session:v1';
    try {
      const existing = localStorage.getItem(key);
      if (existing && existing.trim()) return existing;
      const raw = localStorage.getItem(BUSINESS_CARD_STORAGE_KEY);
import Link from 'next/link';
import { BusinessCardView } from '@/app/components/BusinessCardView';
import { DEFAULT_BUSINESS_CARD } from '@/lib/businessCard';

export default function HomePage() {
  const demoCard = {
    ...DEFAULT_BUSINESS_CARD,
    template: 'impact' as const,
    company: 'AI 名片 / 業務自動化',
    location: '線上服務',
  };

  return (
    <div className="min-h-[100svh] bg-white">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="font-semibold tracking-tight text-gray-900">AI 名片</div>
          <div className="flex items-center gap-2">
            <Link
              href="/import"
              className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
            >
              匯入名片
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
            >
              業務登入
            </Link>
            <Link
              href="/chat"
              className="text-sm font-medium px-3 py-1.5 rounded-full bg-gray-950 text-white hover:bg-gray-900 active:bg-gray-900"
            >
              開始體驗
            </Link>
          </div>
        </div>
      </div>

      <main>
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 sm:pt-16 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600">
                AI 自動回覆 · 名單收集 · 後台管理
              </div>
              <h1 className="mt-4 text-gray-950 font-semibold tracking-tight text-4xl sm:text-6xl leading-[1.05]">
                讓每一次詢問，
                <br />
                都變成可追蹤的名單
              </h1>
              <p className="mt-5 text-gray-600 text-base sm:text-lg leading-relaxed max-w-2xl">
                以極簡的對話體驗承接客戶，AI 自動回答常見問題、需要時引導留聯絡方式；業務端用後台看完整對話與名單。
              </p>

              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/chat"
                  className="inline-flex items-center justify-center rounded-full bg-gray-950 text-white px-6 py-3 text-sm font-medium hover:bg-gray-900"
                >
                  立即試用對話
                </Link>
                <Link
                  href="/dashboard/leads"
                  className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 px-6 py-3 text-sm font-medium hover:bg-gray-50"
                >
                  進入業務後台
                </Link>
              </div>

              <div className="mt-3 text-xs text-gray-500">
                不需要安裝 App。可直接部署到 Cloudflare Pages。
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-xs text-gray-600 mb-3">預覽：你的 AI 名片</div>
                <BusinessCardView
                  card={demoCard}
                  cta={
                    <Link
                      href="/chat"
                      className="block text-center w-full bg-gray-950 text-white rounded-full py-2.5 font-medium hover:bg-gray-900"
                    >
                      立即開始對話
                    </Link>
                  }
                />
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-gray-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-3xl border border-gray-200 bg-white p-6">
                <div className="text-gray-950 font-semibold tracking-tight">AI 自動回覆</div>
                <div className="mt-2 text-sm text-gray-600 leading-relaxed">
                  以你設定的銷售情境 prompt 搭配知識庫，處理常見問題、配備比較與活動資訊。
                </div>
              </div>
              <div className="rounded-3xl border border-gray-200 bg-white p-6">
                <div className="text-gray-950 font-semibold tracking-tight">名單收集</div>
                <div className="mt-2 text-sm text-gray-600 leading-relaxed">
                  當客人需要報價、試乘或後續聯繫，AI 會引導填表，資料自動進入後台名單。
                </div>
              </div>
              <div className="rounded-3xl border border-gray-200 bg-white p-6">
                <div className="text-gray-950 font-semibold tracking-tight">業務後台</div>
                <div className="mt-2 text-sm text-gray-600 leading-relaxed">
                  看訪客 session、聊天紀錄、問卷與名單；需要時可手動介入對話，掌握成交節奏。
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-gray-200 bg-gray-950">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <div className="text-white font-semibold tracking-tight text-2xl">把流量變成交付</div>
                <div className="mt-2 text-white/70 text-sm">
                  先讓 AI 承接，再由業務在對的時機接手。
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/chat"
                  className="inline-flex items-center justify-center rounded-full bg-white text-gray-950 px-6 py-3 text-sm font-medium hover:bg-gray-100"
                >
                  開始聊天
                </Link>
                <Link
                  href="/import"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 bg-transparent text-white px-6 py-3 text-sm font-medium hover:bg-white/10"
                >
                  設定名片
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-gray-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-sm text-gray-600">© {new Date().getFullYear()} AI 名片</div>
              <div className="flex items-center gap-3 text-sm">
                <Link href="/chat" className="text-gray-600 hover:text-gray-900">
                  對話
                </Link>
                <Link href="/dashboard/leads" className="text-gray-600 hover:text-gray-900">
                  後台
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
      if (!raw) return;
      const parsed = safeParseBusinessCard(JSON.parse(raw));
      if (parsed) setBusinessCard(parsed);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    if (didLogVisitRef.current) return;
    didLogVisitRef.current = true;

    fetch('/api/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, path: '/' }),
    }).catch(() => {
      // ignore
    });
  }, [sessionId]);

  useEffect(() => {
    // Optional: if business user is logged in, attach their JWT so backend can
    // write rows with the correct user_id (RLS select will then work).
    let supabase: ReturnType<typeof createSupabaseBrowserClient> | null = null;
    try {
      supabase = createSupabaseBrowserClient();
    import Link from 'next/link';
    import { BusinessCardView } from '@/app/components/BusinessCardView';
    import { DEFAULT_BUSINESS_CARD } from '@/lib/businessCard';

    export default function HomePage() {
      const demoCard = {
        ...DEFAULT_BUSINESS_CARD,
        template: 'impact' as const,
        company: 'AI 名片 / 業務自動化',
        location: '線上服務',
      };

      return (
        <div className="min-h-[100svh] bg-white">
          <div className="sticky top-0 z-10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
              <div className="font-semibold tracking-tight text-gray-900">
                AI 名片
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/import"
                  className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
                >
                  匯入名片
                </Link>
                <Link
                  href="/login"
                  className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
                >
                  業務登入
                </Link>
                <Link
                  href="/chat"
                  className="text-sm font-medium px-3 py-1.5 rounded-full bg-gray-950 text-white hover:bg-gray-900 active:bg-gray-900"
                >
                  開始體驗
                </Link>
              </div>
            </div>
          </div>

          <main>
            <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 sm:pt-16 pb-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                <div className="lg:col-span-7">
                  <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600">
                    AI 自動回覆 · 名單收集 · 後台管理
                  </div>
                  <h1 className="mt-4 text-gray-950 font-semibold tracking-tight text-4xl sm:text-6xl leading-[1.05]">
                    讓每一次詢問，
                    <br />
                    都變成可追蹤的名單
                  </h1>
                  <p className="mt-5 text-gray-600 text-base sm:text-lg leading-relaxed max-w-2xl">
                    以極簡的對話體驗承接客戶，AI 自動回答常見問題、需要時引導留聯絡方式；業務端用後台看完整對話與名單。
                  </p>

                  <div className="mt-7 flex flex-col sm:flex-row gap-3">
                    <Link
                      href="/chat"
                      className="inline-flex items-center justify-center rounded-full bg-gray-950 text-white px-6 py-3 text-sm font-medium hover:bg-gray-900"
                    >
                      立即試用對話
                    </Link>
                    <Link
                      href="/dashboard/leads"
                      className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 px-6 py-3 text-sm font-medium hover:bg-gray-50"
                    >
                      進入業務後台
                    </Link>
                  </div>

                  <div className="mt-3 text-xs text-gray-500">
                    不需要安裝 App。可直接部署到 Cloudflare Pages。
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
                    <div className="text-xs text-gray-600 mb-3">預覽：你的 AI 名片</div>
                    <BusinessCardView
                      card={demoCard}
                      cta={
                        <Link
                          href="/chat"
                          className="block text-center w-full bg-gray-950 text-white rounded-full py-2.5 font-medium hover:bg-gray-900"
                        >
                          立即開始對話
                        </Link>
                      }
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="border-t border-gray-200 bg-white">
              <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="rounded-3xl border border-gray-200 bg-white p-6">
                    <div className="text-gray-950 font-semibold tracking-tight">AI 自動回覆</div>
                    <div className="mt-2 text-sm text-gray-600 leading-relaxed">
                      以你設定的銷售情境 prompt 搭配知識庫，處理常見問題、配備比較與活動資訊。
                    </div>
                  </div>
                  <div className="rounded-3xl border border-gray-200 bg-white p-6">
                    <div className="text-gray-950 font-semibold tracking-tight">名單收集</div>
                    <div className="mt-2 text-sm text-gray-600 leading-relaxed">
                      當客人需要報價、試乘或後續聯繫，AI 會引導填表，資料自動進入後台名單。
                    </div>
                  </div>
                  <div className="rounded-3xl border border-gray-200 bg-white p-6">
                    <div className="text-gray-950 font-semibold tracking-tight">業務後台</div>
                    <div className="mt-2 text-sm text-gray-600 leading-relaxed">
                      看訪客 session、聊天紀錄、問卷與名單；需要時可手動介入對話，掌握成交節奏。
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="border-t border-gray-200 bg-gray-950">
              <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div>
                    <div className="text-white font-semibold tracking-tight text-2xl">把流量變成交付</div>
                    <div className="mt-2 text-white/70 text-sm">
                      先讓 AI 承接，再由業務在對的時機接手。
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href="/chat"
                      className="inline-flex items-center justify-center rounded-full bg-white text-gray-950 px-6 py-3 text-sm font-medium hover:bg-gray-100"
                    >
                      開始聊天
                    </Link>
                    <Link
                      href="/import"
                      className="inline-flex items-center justify-center rounded-full border border-white/20 bg-transparent text-white px-6 py-3 text-sm font-medium hover:bg-white/10"
                    >
                      設定名片
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <footer className="border-t border-gray-200 bg-white">
              <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="text-sm text-gray-600">© {new Date().getFullYear()} AI 名片</div>
                  <div className="flex items-center gap-3 text-sm">
                    <Link href="/chat" className="text-gray-600 hover:text-gray-900">
                      對話
                    </Link>
                    <Link href="/dashboard/leads" className="text-gray-600 hover:text-gray-900">
                      後台
                    </Link>
                  </div>
                </div>
              </div>
            </footer>
          </main>
        </div>
      );
    }
*/