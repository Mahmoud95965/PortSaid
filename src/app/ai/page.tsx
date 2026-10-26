'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
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
    <div className="h-[100dvh] flex flex-col justify-between overflow-hidden bg-sand-50 dark:bg-[#071322] text-ocean-900 dark:text-white">
      {/* Header */}
      <Header
        onNavigate={handleNavigate}
        onOpenFeedback={() => router.push('/')}
        onOpenPoints={() => router.push('/')}
      />

      {/* Main Unified AI Workspace (Full-Screen Chat Canvas without Footer) */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-2 sm:px-4 py-2 flex flex-col overflow-hidden relative z-10">
        <UnifiedAiStudio
          initialPrompt={initialPrompt}
          initialPlanData={initialPlanData}
          onViewPlaceDetails={handleViewPlaceDetails}
          onBackToHome={() => router.push('/')}
        />
      </main>
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
