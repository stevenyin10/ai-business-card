'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Zap, Shield, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="bg-black text-white min-h-screen selection:bg-blue-500/30">
      {/* 導覽列 - Apple 風格極簡 */}
      <nav className="fixed top-0 w-full z-[100] backdrop-blur-xl border-b border-white/5 bg-black/20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="text-xl font-bold tracking-tighter uppercase">AI.Card Elite</div>
          <div className="hidden md:flex gap-8 text-sm font-light text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">
              功能
            </a>
            <a href="#physical" className="hover:text-white transition-colors">
              實體名片
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              定價
            </a>
          </div>
          <Link
            href="/login"
            className="bg-white text-black px-5 py-2 rounded-full text-sm font-medium hover:scale-105 transition-transform"
          >
            開始使用
          </Link>
        </div>
      </nav>

      {/* Hero 區塊 */}
      <section className="relative pt-44 pb-32 px-6 overflow-hidden">
        {/* 背景光暈 */}
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-[20%] right-0 w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-6xl md:text-[11rem] font-bold leading-[0.85] tracking-tighter mb-12">
              ELITE <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-200 via-gray-400 to-gray-700">
                IDENTITY.
              </span>
            </h1>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
              <p className="text-xl md:text-2xl text-gray-400 max-w-xl font-light leading-relaxed">
                超越名片，定義您的數位權威。結合 AI 禮賓系統與頂級工藝，專為 1% 的業務領袖量身打造。
              </p>
              <div className="flex gap-4">
                <button className="group flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-blue-500 transition-colors shadow-lg">
                  預訂專屬名片
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Bento Grid 展示區 */}
      <section id="features" className="py-24 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[300px] md:auto-rows-[350px]">
            {/* AI 助手模塊 */}
            <div className="md:col-span-8 relative bg-neutral-950 border border-white/5 rounded-3xl p-10 overflow-hidden group">
              <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <Sparkles className="text-blue-500 mb-6" size={32} />
              <h3 className="text-4xl font-medium mb-4">24/7 AI 數位特助</h3>
              <p className="text-gray-400 max-w-md text-lg font-light">
                不僅是展示，更是您的數位分身。自動過濾詢問、篩選高品質 Leads，讓您在休息時仍在運作。
              </p>
              <div className="absolute bottom-10 right-10 w-48 h-20 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-xs text-gray-400">
                「已為您安排下午與張先生的賞車預約。」
              </div>
            </div>

            {/* 實體卡片模塊 */}
            <div
              id="physical"
              className="md:col-span-4 bg-neutral-900 border border-white/5 rounded-3xl p-8 flex flex-col justify-between group overflow-hidden"
            >
              <div>
                <Crown className="text-amber-500 mb-4" size={28} />
                <h3 className="text-2xl font-medium">極致工藝實體版</h3>
              </div>
              <div className="relative h-40 transform group-hover:rotate-6 transition-transform duration-700">
                <div className="w-full h-full bg-gradient-to-tr from-gray-800 to-gray-900 rounded-2xl border border-white/10 shadow-2xl flex items-center justify-center">
                  <span className="text-[10px] tracking-[0.3em] text-gray-500 uppercase">
                    Matte Black Metal
                  </span>
                </div>
              </div>
            </div>

            {/* 隱私安全模塊 */}
            <div className="md:col-span-4 bg-white rounded-3xl p-8 flex flex-col justify-between">
              <Shield className="text-black mb-4" size={28} />
              <div>
                <h3 className="text-2xl text-black font-semibold mb-2">隱私主權</h3>
                <p className="text-gray-600 text-sm">金融級數據加密隔離，只有您授權的人，才能看見核心資訊。</p>
              </div>
            </div>

            {/* 數據追蹤模塊 */}
            <div id="pricing" className="md:col-span-8 bg-blue-600 rounded-3xl p-10 relative overflow-hidden group">
              <Zap className="text-white mb-6" size={28} />
              <h3 className="text-4xl text-white font-medium mb-4">精準洞察</h3>
              <p className="text-blue-100 text-lg opacity-80 max-w-sm">實時追蹤訪客互動路徑，在最合適的時機發動聯繫。</p>
              <div className="absolute bottom-[-40px] right-[-40px] w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
            </div>
          </div>
        </div>
      </section>

      {/* 底部行動呼籲 */}
      <footer className="py-20 border-t border-white/5 text-center">
        <p className="text-sm tracking-widest text-gray-600 uppercase mb-4">專為精英設計</p>
        <h2 className="text-4xl md:text-6xl mb-10">加入頂尖業務行列</h2>
        <Link
          href="/login"
          className="inline-block border border-white/20 px-12 py-4 rounded-full hover:bg-white hover:text-black transition-colors"
        >
          立即預約諮詢
        </Link>
      </footer>
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