'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PlannerStudio } from '@/components/SmartPlanner/PlannerStudio';
import { GeminiChatView } from '@/components/GeminiChatView';
import { SiteGuideModal } from '@/components/SiteGuideModal';
import { Compass, Sparkles, MessageSquare, Bot, MapPin, Zap } from 'lucide-react';

type AITab = 'planner' | 'chat';

function AIPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab');
  const initialQuery = searchParams.get('q');
  const initialPlanData = searchParams.get('plan');

  const [activeTab, setActiveTab] = useState<AITab>(
    tabParam === 'chat' ? 'chat' : 'planner'
  );
  const [plannerPrompt, setPlannerPrompt] = useState<string | null>(
    tabParam !== 'chat' ? initialQuery : null
  );
  const [chatPrompt, setChatPrompt] = useState<string | null>(
    tabParam === 'chat' ? initialQuery : null
  );
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  // تحديث التبويب إذا تغيّر رابط الـ URL
  useEffect(() => {
    if (tabParam === 'chat') {
      setActiveTab('chat');
      if (initialQuery) setChatPrompt(initialQuery);
    } else if (tabParam === 'planner') {
      setActiveTab('planner');
      if (initialQuery) setPlannerPrompt(initialQuery);
    }
  }, [tabParam, initialQuery]);

  const handleNavigate = (view: string, arg?: string | null) => {
    if (view === 'home') {
      router.push('/');
      return;
    }
    if (view === 'map') {
      if (arg) {
        router.push(`/map?place=${arg}`);
      } else {
        router.push('/map');
      }
      return;
    }
    if (view === 'chat') {
      setActiveTab('chat');
      if (arg) setChatPrompt(arg);
      return;
    }
    if (view === 'planner') {
      setActiveTab('planner');
      if (arg) setPlannerPrompt(arg);
      return;
    }
    if (view === 'ai') {
      if (arg?.includes('chat')) {
        setActiveTab('chat');
      } else {
        setActiveTab('planner');
      }
      return;
    }
    router.push('/');
  };

  const handleViewPlaceDetails = (placeId: string) => {
    router.push(`/map?place=${placeId}`);
  };

  const handleSelectTab = (tab: AITab) => {
    setActiveTab(tab);
    // تحديث الرابط دون إعادة تحميل الصفحة بالكامل
    const params = new URLSearchParams();
    params.set('tab', tab);
    const newUrl = `/ai?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-x-hidden bg-sand-50 dark:bg-[#071322] text-ocean-900 dark:text-white">
      {/* Header */}
      <Header
        onNavigate={handleNavigate}
        onOpenFeedback={() => router.push('/')}
        onOpenPoints={() => router.push('/')}
        onOpenGuide={() => setShowGuideModal(true)}
      />

      {/* Main Unified AI Hub Workspace */}
      <main className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-3 sm:py-5 flex-1 w-full relative z-10 space-y-4 sm:space-y-5">
        {/* Unified AI Top Navigation & Mode Switcher */}
        <section className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-[#0c1622] border border-sand-300 dark:border-[#1d2d3e] shadow-lg flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 text-right w-full md:w-auto">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 text-white grid place-items-center shrink-0 shadow-md">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-sand-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg lg:text-xl font-black text-ocean-950 dark:text-white leading-tight">
                  مركز الذكاء الاصطناعي — Port Said Hub
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal2-500/15 text-teal2-700 dark:text-teal2-300 border border-teal2-400/30">
                  AI Suite ✦
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-ocean-700/80 dark:text-white/70 font-medium mt-0.5">
                مخطط الخروجات التفاعلي بالخريطة والميزانية + مساعد دردشة Gemini الفوري
              </p>
            </div>
          </div>

          {/* Segmented Mode Selector Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-sand-100 dark:bg-[#142334] border border-sand-200 dark:border-[#1d2d3e] w-full md:w-auto justify-center">
            {/* Tab 1: Trip Planner */}
            <button
              onClick={() => handleSelectTab('planner')}
              type="button"
              className={`relative flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${
                activeTab === 'planner'
                  ? 'bg-gradient-to-r from-ocean-900 to-teal2-700 text-white shadow-md'
                  : 'text-ocean-800 dark:text-white/70 hover:text-ocean-950 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5'
              }`}
            >
              <Compass className="w-4 h-4 text-sand-300" />
              <span>مخطط الرحلات والخروجات</span>
              <span className="hidden sm:inline-block text-[10px] font-normal opacity-80">(الخريطة والميزانية)</span>
            </button>

            {/* Tab 2: Gemini Chat Assistant */}
            <button
              onClick={() => handleSelectTab('chat')}
              type="button"
              className={`relative flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-ocean-900 to-teal2-700 text-white shadow-md'
                  : 'text-ocean-800 dark:text-white/70 hover:text-ocean-950 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5'
              }`}
            >
              <Bot className="w-4 h-4 text-sand-300" />
              <span>مساعد بورسعيد (Gemini)</span>
              <span className="hidden sm:inline-block text-[10px] font-normal opacity-80">(محادثة فورية)</span>
            </button>
          </div>
        </section>

        {/* Dynamic AI View Switcher with Smooth AnimatePresence */}
        <AnimatePresence mode="wait">
          {activeTab === 'planner' && (
            <motion.div
              key="planner-tab"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <PlannerStudio
                initialPrompt={plannerPrompt}
                initialPlanData={initialPlanData}
                onViewPlaceDetails={handleViewPlaceDetails}
                onBackToHome={() => router.push('/')}
              />
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div
              key="chat-tab"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <GeminiChatView
                initialPrompt={chatPrompt}
                onNavigate={handleNavigate}
                onOpenPoints={() => router.push('/')}
                onBack={() => handleSelectTab('planner')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Site Guide Modal */}
      <SiteGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        onNavigateToView={(view) => {
          handleNavigate(view);
          setShowGuideModal(false);
        }}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default function AIPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-sand-50 dark:bg-[#071322] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-teal2-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <AIPageContent />
    </Suspense>
  );
}
