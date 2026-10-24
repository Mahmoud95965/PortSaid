'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PlannerStudio } from '@/components/SmartPlanner/PlannerStudio';
import { SiteGuideModal } from '@/components/SiteGuideModal';

function AIPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get('q');
  const initialPlanData = searchParams.get('plan');

  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

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
      router.push('/chat');
      return;
    }
    if (view === 'ai' || view === 'planner') {
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
        onOpenGuide={() => setShowGuideModal(true)}
      />

      {/* Main Dedicated AI Planner Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-4 sm:py-6 flex-1 w-full relative z-10">
        <PlannerStudio
          initialPrompt={initialPrompt}
          initialPlanData={initialPlanData}
          onViewPlaceDetails={handleViewPlaceDetails}
          onBackToHome={() => router.push('/')}
        />
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
