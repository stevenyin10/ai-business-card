'use client';

import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Shield, Orbit, Fingerprint, ArrowRight, Sparkles, Lock } from 'lucide-react';
import Link from 'next/link';

export default function GrandVisionLanding() {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div className="bg-black text-white min-h-screen font-sans selection:bg-amber-500/30 overflow-x-hidden">
      {/* 導覽列：極簡主權 */}
      <nav className="fixed top-0 w-full z-[100] border-b border-white/5 bg-black/10 backdrop-blur-3xl">
        <div className="max-w-screen-2xl mx-auto px-6 sm:px-10 h-20 sm:h-24 flex justify-between items-center">
          <div className="text-sm tracking-widest font-light uppercase opacity-60">Aether. Sovereign</div>
          <div className="hidden lg:flex gap-10 xl:gap-16 text-[9px] tracking-widest uppercase font-semibold text-gray-500">
            <a href="#consciousness" className="hover:text-amber-200 transition-colors">
              Digital Steward
            </a>
            <a href="#manifestation" className="hover:text-amber-200 transition-colors">
              Physicality
            </a>
            <a href="#fortress" className="hover:text-amber-200 transition-colors">
              The Vault
            </a>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/login"
              className="text-[10px] tracking-wide uppercase text-gray-400 hover:text-white transition-colors"
            >
              Login
            </Link>
            <Link
              href="/login"
              className="text-[10px] tracking-widest uppercase bg-white text-black px-6 sm:px-10 py-3 sm:py-4 rounded-full font-bold hover:invert transition-all duration-700 shadow-2xl"
            >
              索取通行證
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section：宏大敘事 */}
      <section className="relative min-h-screen flex flex-col justify-center px-6 sm:px-10">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(20,20,50,0.15),transparent)] pointer-events-none" />

        <div className="max-w-screen-2xl mx-auto w-full relative z-10">
          <motion.div style={{ opacity }}>
            <span className="text-amber-500/50 text-[10px] tracking-[0.8em] uppercase mb-12 block">
              Establishing Digital Dominance
            </span>
            <h1 className="text-6xl sm:text-7xl md:text-[12rem] xl:text-[15rem] font-serif font-light leading-[0.75] tracking-tighter mb-20 italic">
              Absolute <br />
              <span className="not-italic font-sans font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-white/5">
                Authority.
              </span>
            </h1>

            <div className="flex flex-col md:flex-row gap-12 lg:gap-20 items-start md:items-end justify-between">
              <p className="text-lg sm:text-xl md:text-3xl text-gray-500 max-w-2xl font-extralight leading-relaxed tracking-wide italic">
                「我們不提供工具，我們構築邊界。」這是一場關於身分、權力與意識延伸的數位革命。
              </p>
              <div className="flex flex-col gap-6 w-full md:w-auto">
                <button className="group flex items-center justify-between border border-white/20 px-8 sm:px-12 py-5 sm:py-6 rounded-full text-[11px] tracking-[0.4em] uppercase hover:bg-white hover:text-black transition-all duration-1000">
                  <span>開啟您的數位遺產</span>
                  <ArrowRight size={16} className="ml-6 group-hover:translate-x-2 transition-transform" />
                </button>
                <button className="text-[9px] tracking-[0.5em] uppercase text-amber-500/60 hover:text-amber-500 text-center transition-colors">
                  諮詢數位執事架構師 —
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 核心佈局：打破網格的 Readymag 風格 */}
      <section className="py-40 sm:py-60 px-6 sm:px-10">
        <div className="max-w-screen-2xl mx-auto">
          {/* 層級一：自主意識延伸 */}
          <div id="consciousness" className="grid lg:grid-cols-12 gap-12 lg:gap-20 mb-40 sm:mb-60 items-center">
            <div className="lg:col-span-6 relative">
              <motion.div
                whileInView={{ opacity: [0, 1], x: [-50, 0] }}
                transition={{ duration: 1 }}
                className="text-[6rem] sm:text-[9rem] md:text-[12rem] font-serif font-black text-white/5 absolute -top-28 sm:-top-40 -left-6 sm:-left-20 pointer-events-none"
              >
                STEWARD
              </motion.div>
              <Orbit className="text-amber-500/20 mb-10" size={80} />
              <h2 className="text-5xl sm:text-6xl font-light mb-10 italic">The Autonomous Steward</h2>
              <div className="space-y-8 text-gray-400 text-lg sm:text-xl font-extralight leading-loose">
                <p>
                  您的名片不應是靜止的符號，而是一個擁有自主神經的「執事」。基於 RAG 技術，它封裝了您的商業哲學，24/7
                  在數位邊際為您進行精準的社交預熱。
                </p>
                <div className="pt-10 flex flex-wrap gap-4">
                  <button className="bg-amber-600/10 border border-amber-600/30 text-amber-500 px-10 py-4 rounded-full text-[10px] tracking-[0.3em] uppercase hover:bg-amber-600 hover:text-white transition-all">
                    注入您的意識
                  </button>
                  <button className="px-10 py-4 rounded-full text-[10px] tracking-[0.3em] uppercase border border-white/10 hover:border-white transition-all">
                    技術白皮書
                  </button>
                </div>
              </div>
            </div>
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full aspect-square bg-neutral-950 rounded-[64px] sm:rounded-[100px] border border-white/5 flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
                <Sparkles
                  size={120}
                  className="text-gray-800 group-hover:text-blue-500/20 transition-colors duration-1000"
                />
              </div>
            </div>
          </div>

          {/* 層級二：物理權威的降臨 */}
          <div id="manifestation" className="grid lg:grid-cols-12 gap-12 lg:gap-20 mb-40 sm:mb-60">
            <div className="lg:col-span-4 order-2 lg:order-1">
              <div className="h-full bg-gradient-to-b from-neutral-900 to-black border border-white/5 rounded-[56px] sm:rounded-[80px] p-10 sm:p-20 flex flex-col justify-between">
                <Fingerprint size={48} className="text-amber-500/40" />
                <div>
                  <h3 className="text-4xl font-light mb-8">
                    Tactile <br />Authority.
                  </h3>
                  <p className="text-gray-500 font-extralight mb-12">
                    金屬的重量、磨砂的冷冽，這是權力在物理世界的投影。內嵌極致加密 NFC 晶片。
                  </p>
                  <button className="w-full bg-white text-black py-6 rounded-full text-[10px] tracking-[0.4em] uppercase font-bold hover:scale-[0.98] transition-transform">
                    定製您的實體權限
                  </button>
                </div>
              </div>
            </div>
            <div className="lg:col-span-8 order-1 lg:order-2">
              <div className="relative group">
                <h2 className="text-[4rem] sm:text-[6rem] md:text-[10rem] font-bold tracking-tighter leading-none opacity-10 group-hover:opacity-20 transition-opacity">
                  MATTE
                  <br />
                  TITANIUM
                </h2>
                <p className="text-xl sm:text-2xl text-gray-500 mt-10 max-w-xl font-extralight italic">
                  「當名片落地時，對話已經結束。」這是一份無需言語的契約。
                </p>
                <div className="mt-12 flex gap-6">
                  <button className="border-b border-amber-500 text-amber-500 pb-2 text-xs tracking-widest uppercase hover:text-white hover:border-white transition-all">
                    探索材質工藝 —
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 層級三：數據主權堡壘 */}
          <div id="fortress" className="bg-white text-black rounded-[64px] sm:rounded-[100px] p-10 sm:p-20 md:p-32 relative overflow-hidden">
            <div className="max-w-4xl relative z-10">
              <Lock size={60} className="mb-12 opacity-20" />
              <h2 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-12">Sovereign Data Fortress.</h2>
              <p className="text-xl sm:text-2xl md:text-3xl font-light leading-relaxed mb-16 text-gray-700">
                我們建立在絕對的孤立之上。您的數據不屬於雲端，它屬於您的個人隔離層。透過 Supabase 的金融級技術，確保每一條社交紀錄都僅為您服務。
              </p>
              <div className="flex flex-wrap gap-6">
                <button className="bg-black text-white px-10 sm:px-12 py-5 sm:py-6 rounded-full text-xs tracking-[0.3em] uppercase font-bold hover:invert transition-all">
                  建立您的數據領地
                </button>
                <button className="border border-black/20 px-10 sm:px-12 py-5 sm:py-6 rounded-full text-xs tracking-[0.3em] uppercase hover:bg-black hover:text-white transition-all">
                  數據安全合規報告
                </button>
              </div>
            </div>
            <div className="absolute right-[-10%] bottom-[-10%] opacity-5">
              <Shield size={600} />
            </div>
          </div>
        </div>
      </section>

      {/* 結尾 CTA 矩陣：數位豪宅的出口與入口 */}
      <footer className="py-40 sm:py-60 px-6 sm:px-10 border-t border-white/5 relative bg-black">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 2 }}>
            <span className="text-amber-500/40 text-[10px] tracking-[1em] uppercase mb-16 block">The Final Threshold</span>
            <h2 className="text-6xl sm:text-7xl md:text-[10rem] xl:text-[12rem] font-serif font-light mb-20 sm:mb-32 tracking-tighter italic leading-none">
              Ascend to <br />
              <span className="not-italic font-sans font-bold text-white">Sovereignty.</span>
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-10 sm:p-12 border border-white/5 rounded-3xl hover:bg-white/5 transition-colors group">
                <h4 className="text-[10px] tracking-[0.4em] uppercase text-gray-500 mb-8">個人專屬方案</h4>
                <p className="text-2xl font-light mb-10">數位執事系統、AI 知識庫注入。</p>
                <Link
                  href="/login"
                  className="block w-full py-5 rounded-full border border-white/10 group-hover:border-amber-500 transition-all text-[10px] tracking-[0.2em] uppercase"
                >
                  立即入駐
                </Link>
              </div>
              <div className="p-10 sm:p-12 border border-amber-500/20 rounded-3xl bg-amber-500/5 shadow-2xl scale-105">
                <h4 className="text-[10px] tracking-[0.4em] uppercase text-amber-500 mb-8">旗艦尊榮方案</h4>
                <p className="text-2xl font-light mb-10">鈦金屬實體名片、7-11 專屬物流、高階 AI 協商模式。</p>
                <Link
                  href="/login"
                  className="block w-full py-5 rounded-full bg-amber-600 text-white text-[10px] tracking-[0.2em] uppercase font-bold"
                >
                  索取優先權
                </Link>
              </div>
              <div className="p-10 sm:p-12 border border-white/5 rounded-3xl hover:bg-white/5 transition-colors group">
                <h4 className="text-[10px] tracking-[0.4em] uppercase text-gray-500 mb-8">企業領袖方案</h4>
                <p className="text-2xl font-light mb-10">多人團隊矩陣、數據分析儀表板。</p>
                <Link
                  href="/login"
                  className="block w-full py-5 rounded-full border border-white/10 group-hover:border-white transition-all text-[10px] tracking-[0.2em] uppercase"
                >
                  聯繫架構師
                </Link>
              </div>
            </div>

            <div className="mt-24 sm:mt-40 opacity-20 text-[10px] tracking-[0.5em] uppercase">
              © 2025 Aether Identity. For the elite, by the elite.
            </div>
          </motion.div>
        </div>
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