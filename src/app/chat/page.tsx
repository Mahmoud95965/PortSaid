'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { GeminiChatView } from '@/components/GeminiChatView';
import { SiteGuideModal } from '@/components/SiteGuideModal';

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const promptParam = searchParams.get('q');

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
    router.push('/');
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

      {/* Main Gemini Chat Area */}
      <main className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-6 py-3 sm:py-5 flex-1 w-full relative z-10">
        <GeminiChatView
          initialPrompt={promptParam}
          onNavigate={handleNavigate}
          onOpenPoints={() => router.push('/')}
          onBack={() => router.push('/')}
        />
      </main>

      {/* Interactive Site Guide Modal */}
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
