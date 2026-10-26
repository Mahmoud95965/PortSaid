'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SightsView } from '@/components/SightsView';
import { PlaceDetail } from '@/components/PlaceDetail';
import { QRModal } from '@/components/QRModal';
import { AssistantChat } from '@/components/AssistantChat';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Place } from '@/types';
import { INITIAL_PLACES } from '@/lib/constants';
import { useRouter, useSearchParams } from 'next/navigation';

function SightsPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [places, setPlaces] = useState<Place[]>(INITIAL_PLACES);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [activeCouponPlace, setActiveCouponPlace] = useState<Place | null>(null);

  useEffect(() => {
    const initialPlace = searchParams.get('place');
    if (initialPlace) {
      setSelectedPlaceId(initialPlace);
    }
  }, [searchParams]);

  // تحميل الأماكن الحقيقية من Supabase أو الاعتماد على INITIAL_PLACES
  useEffect(() => {
    async function loadPlaces() {
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data, error } = await supabase
            .from('places')
            .select('*, categories(code)')
            .eq('status', 'active')
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

          if (!error && data && data.length > 0) {
            const mapped: Place[] = data.map((item) => ({
              id: item.id,
              cat: item.categories?.code || 'fun',
              n: item.name_ar,
              a: item.area_ar,
              ds: item.description_ar || '',
              lat: Number(item.latitude),
              lon: Number(item.longitude),
              p: item.visit_points || 20,
              disc: item.discount_percent || 0,
              cost: item.coupon_cost_points || 0,
            }));
            setPlaces(mapped);
          }
        } catch (e) {
          console.warn('Using local places fallback:', e);
        }
      }
    }
    loadPlaces();
  }, []);

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
    if (view === 'place' && arg) {
      setSelectedPlaceId(arg);
      return;
    }
    router.push('/');
  };

  const selectedPlace = places.find((p) => p.id === selectedPlaceId);

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-x-hidden bg-sand-50 dark:bg-[#071322] text-ocean-900 dark:text-white">
      {/* Header with Navigation */}
      <Header
        onNavigate={handleNavigate}
        onOpenFeedback={() => router.push('/')}
        onOpenPoints={() => router.push('/')}
      />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-3 sm:px-5 lg:px-8 py-5 sm:py-8 flex-1 w-full relative z-10">
        <AnimatePresence mode="wait">
          {selectedPlace ? (
            <motion.div
              key="place-detail"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <PlaceDetail
                place={selectedPlace}
                onBack={() => setSelectedPlaceId(null)}
                onRequestCoupon={(p) => setActiveCouponPlace(p)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="sights-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <SightsView
                places={places}
                onSelectPlace={(id) => setSelectedPlaceId(id)}
                onNavigate={handleNavigate}
                onBack={() => router.push('/')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <Footer />

      {/* Coupon Modal */}
      {activeCouponPlace && (
        <QRModal
          place={activeCouponPlace}
          onClose={() => setActiveCouponPlace(null)}
        />
      )}

      {/* Floating Assistant Chat */}
      <AssistantChat
        onOpenPoints={() => router.push('/')}
        onNavigate={handleNavigate}
      />
    </div>
  );
}

export default function SightsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-sand-50 dark:bg-[#071322] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-teal2-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <SightsPageContent />
    </Suspense>
  );
}
