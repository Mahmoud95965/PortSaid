'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { UnifiedAiStudio } from '@/components/SmartPlanner/UnifiedAiStudio';

function AIPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPrompt = searchParams.get('q');
  const initialPlanData = searchParams.get('plan');

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
    if (view === 'ai' || view === 'planner' || view === 'chat') {
      if (arg) {
        router.push(`/ai?q=${encodeURIComponent(arg)}`);
      } else {
        router.push('/ai');
      }
      return;
    }
    router.push('/');
  };

  const handleViewPlaceDetails = (placeId: string) => {
    router.push(`/map?place=${placeId}`);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-x-hidden bg-sand-50 dark:bg-[#071322] text-ocean-900 dark:text-white">
      {/* Header */}
      <Header
        onNavigate={handleNavigate}
        onOpenFeedback={() => router.push('/')}
        onOpenPoints={() => router.push('/')}
      />

      {/* Main Unified AI Workspace (Planner + Chat + Map in One Single Screen) */}
      <main className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-3 sm:py-5 flex-1 w-full relative z-10">
        <UnifiedAiStudio
          initialPrompt={initialPrompt}
          initialPlanData={initialPlanData}
          onViewPlaceDetails={handleViewPlaceDetails}
          onBackToHome={() => router.push('/')}
        />
      </main>

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

