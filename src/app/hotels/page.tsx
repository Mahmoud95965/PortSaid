'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { HotelsView } from '@/components/HotelsView';
import { PlaceDetail } from '@/components/PlaceDetail';
import { QRModal } from '@/components/QRModal';
import { Place } from '@/types';
import { INITIAL_PLACES } from '@/lib/constants';

export default function HotelsPage() {
  const router = useRouter();
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [activeCouponPlace, setActiveCouponPlace] = useState<Place | null>(null);

  const selectedPlace = selectedPlaceId
    ? INITIAL_PLACES.find((p) => p.id === selectedPlaceId) || null
    : null;

  const handleNavigate = (view: string, arg?: string | null) => {
    if (view === 'home') {
      router.push('/');
      return;
    }
    if (view === 'map') {
      if (arg) router.push(`/map?place=${arg}`);
      else router.push('/map');
      return;
    }
    if (view === 'ai') {
      router.push('/ai');
      return;
    }
    if (view === 'hotels') {
      setSelectedPlaceId(null);
      return;
    }
    router.push(`/${view}`);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-sand-50 dark:bg-[#071322] text-slate-900 dark:text-white transition-colors">
      <Header
        onNavigate={handleNavigate}
        onOpenFeedback={() => router.push('/')}
        onOpenPoints={() => router.push('/')}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-4">
        {selectedPlace ? (
          <PlaceDetail
            place={selectedPlace}
            onBack={() => setSelectedPlaceId(null)}
            onRequestCoupon={(place) => setActiveCouponPlace(place)}
          />
        ) : (
          <HotelsView
            places={INITIAL_PLACES}
            onSelectPlace={(id) => setSelectedPlaceId(id)}
            onBack={() => router.push('/')}
            onNavigate={handleNavigate}
            onRequestCoupon={(place) => setActiveCouponPlace(place)}
          />
        )}
      </main>

      <Footer />

      {activeCouponPlace && (
        <QRModal
          place={activeCouponPlace}
          onClose={() => setActiveCouponPlace(null)}
        />
      )}
    </div>
  );
}
