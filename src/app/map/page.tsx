'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MapView } from '@/components/MapView';
import { PlaceDetail } from '@/components/PlaceDetail';
import { QRModal } from '@/components/QRModal';
import { AssistantChat } from '@/components/AssistantChat';
import { SiteGuideModal } from '@/components/SiteGuideModal';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Place } from '@/types';
import { INITIAL_PLACES } from '@/lib/constants';
import { useRouter } from 'next/navigation';

export default function MapPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [places, setPlaces] = useState<Place[]>(INITIAL_PLACES);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [activeCouponPlace, setActiveCouponPlace] = useState<Place | null>(null);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  // تحميل الأماكن الحقيقية من Supabase
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
      setSelectedPlaceId(null);
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
        onOpenGuide={() => setShowGuideModal(true)}
      />

      {/* Main Map Container */}
      <main className="max-w-6xl mx-auto px-3 sm:px-5 lg:px-8 py-4 sm:py-6 flex-1 w-full relative z-10">
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
                onRequestCoupon={(place) => setActiveCouponPlace(place)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="map-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <MapView
                places={places}
                onSelectPlace={(id) => setSelectedPlaceId(id)}
                onBack={() => router.push('/')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Dynamic QR Code Modal */}
      {activeCouponPlace && (
        <QRModal place={activeCouponPlace} onClose={() => setActiveCouponPlace(null)} />
      )}

      {/* Interactive Site Guide Modal */}
      <SiteGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        onNavigateToView={(view) => {
          handleNavigate(view);
          setShowGuideModal(false);
        }}
      />

      {/* Assistant AI Chatbot */}
      <AssistantChat
        onOpenPoints={() => router.push('/')}
        onNavigate={handleNavigate}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
