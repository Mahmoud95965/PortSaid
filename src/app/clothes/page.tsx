'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ClothesView } from '@/components/ClothesView';

export default function ClothesPage() {
  const router = useRouter();

  const handleNavigate = (view: string, arg?: string | null) => {
    if (view === 'home') {
      router.push('/');
    } else if (view === 'hotels') {
      router.push('/hotels');
    } else if (view === 'memories') {
      router.push('/memories');
    } else if (view === 'housing') {
      router.push('/housing');
    } else {
      router.push(`/?view=${view}${arg ? `&arg=${arg}` : ''}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-sand-50 dark:bg-[#060c14] text-ocean-900 dark:text-white transition-colors duration-300">
      <Header
        onNavigate={handleNavigate}
        onOpenFeedback={() => handleNavigate('feedback')}
        onOpenPoints={() => handleNavigate('points')}
      />

      <main className="max-w-6xl mx-auto px-3 min-[400px]:px-4 sm:px-5 lg:px-8 py-6 flex-1 w-full relative z-10">
        <ClothesView
          onNavigate={handleNavigate}
          onBack={() => router.push('/')}
        />
      </main>

      <Footer />
    </div>
  );
}
