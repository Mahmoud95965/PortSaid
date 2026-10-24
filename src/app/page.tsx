'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { WelcomeModal } from '@/components/WelcomeModal';
import { AuthModal } from '@/components/AuthModal';
import { HeroBanner } from '@/components/HeroBanner';
import { CategoryGrid } from '@/components/CategoryGrid';
import { PortSaidGallery } from '@/components/PortSaidGallery';
import { PlaceList } from '@/components/PlaceList';
import { PlaceDetail } from '@/components/PlaceDetail';
import { TransportView } from '@/components/TransportView';
import { HousingView } from '@/components/HousingView';
import { ExploreView } from '@/components/ExploreView';
import { FeedbackView } from '@/components/FeedbackView';
import { PartnerView } from '@/components/PartnerView';
import { AccountView } from '@/components/AccountView';
import { PointsDetailsView } from '@/components/PointsDetailsView';
import { QRModal } from '@/components/QRModal';
import { AssistantChat } from '@/components/AssistantChat';
import { SiteGuideModal } from '@/components/SiteGuideModal';
import { FeatureExplainerCards } from '@/components/FeatureExplainerCards';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Place } from '@/types';
import { INITIAL_PLACES } from '@/lib/constants';
import { Share2, MessageSquare, Store, Sparkles, ChevronLeft } from 'lucide-react';
import confetti from 'canvas-confetti';

const pageVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.25, ease: 'easeIn' } },
};

export default function HomePage() {
  const { user, loading, hasSeenWelcome, setHasSeenWelcome, claimShareReward } = useAuth();

  const [currentView, setCurrentView] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('fun');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const [places, setPlaces] = useState<Place[]>(INITIAL_PLACES);
  const [activeCouponPlace, setActiveCouponPlace] = useState<Place | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [hasSeenGuide, setHasSeenGuide] = useState<boolean>(true);

  // التحقق التلقائي من ظهور الأسهم والدليل للمستخدم الجديد فقط
  useEffect(() => {
    if (user?.id) {
      const tourKey = `ps_guide_seen_${user.id}`;
      const seen = localStorage.getItem(tourKey) === 'true';
      setHasSeenGuide(seen);

      // إذا كان المستخدم جديداً ولم يشاهد جولة الأسهم من قبل، تظهر له تلقائياً بعد لحظات من تسجيل الدخول
      if (!seen) {
        const timer = setTimeout(() => {
          setShowGuideModal(true);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [user?.id]);

  const handleCloseGuide = () => {
    setShowGuideModal(false);
    if (user?.id) {
      const tourKey = `ps_guide_seen_${user.id}`;
      localStorage.setItem(tourKey, 'true');
      setHasSeenGuide(true);
    }
  };

  // جلب الأماكن الحقيقية من Supabase
  useEffect(() => {
    async function loadSupabasePlaces() {
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
          } else {
            setPlaces(INITIAL_PLACES);
          }
        } catch (e) {
          console.warn('Supabase offline or unreachable, using local places:', e);
          setPlaces(INITIAL_PLACES);
        }
      } else {
        setPlaces(INITIAL_PLACES);
      }
    }
    loadSupabasePlaces();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleNavigate = (view: string, arg?: string | null) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (view === 'list' && arg) {
      setSelectedCategory(arg);
      setCurrentView('list');
      return;
    }
    if (view === 'place' && arg) {
      setSelectedPlaceId(arg);
      setCurrentView('place');
      return;
    }
    setCurrentView(view);
  };

  const handleShareApp = async () => {
    const shareText =
      '🌊 بورسعيد في جيبك!\n\nلقيت موقع Port Said Hub هيفرق معاك جداً:\n' +
      '🚌 مواصلات من السكن للكلية\n' +
      '🍽️ أحسن المطاعم والكافيهات\n' +
      '🏠 سكن وأماكن قريبة منك\n' +
      '⭐ ونقاط ومكافآت على كل زيارة!\n\n' +
      'جرب الموقع من هنا 👇\n' +
      window.location.origin;

    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');

    const res = await claimShareReward();
    showToast(res.message);
    if (res.ok) {
      try {
        confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });
      } catch (e) {}
    }
  };

  const handleRequestCoupon = (place: Place) => {
    setActiveCouponPlace(place);
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center waves-pattern text-white relative overflow-hidden">
        {/* Animated Background Blob */}
        <div className="absolute w-80 h-80 rounded-full bg-sand-400/20 blur-3xl animate-pulse" />

        <motion.div
          className="flex flex-col items-center gap-4 relative z-10"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <motion.div
            className="w-24 h-24 rounded-full bg-gradient-to-b from-[#f8f4ea] to-[#ffe3a8] border-4 border-white/50 shadow-2xl flex items-center justify-center p-3 relative"
            animate={{ y: [-6, 6, -6] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <img src="/assets/logo/icon-192.png" alt="" className="w-full h-full object-contain" />
            <span className="absolute -inset-1 rounded-full border-2 border-sand-400/60 animate-ping opacity-30" />
          </motion.div>
          <div className="w-9 h-9 rounded-full border-4 border-sand-400 border-t-transparent animate-spin" />
          <p className="font-black text-sm text-white/90 tracking-wide">
            جارٍ تجهيز Port Said Hub...
          </p>
        </motion.div>
      </div>
    );
  }

  // 1. First Welcome Splash Screen
  if (!hasSeenWelcome) {
    return <WelcomeModal onStart={() => setHasSeenWelcome(true)} />;
  }

  // 2. Authentication Modal
  if (!user) {
    return <AuthModal onSuccess={() => {}} onBackToWelcome={() => setHasSeenWelcome(false)} />;
  }

  const selectedPlace = places.find((p) => p.id === selectedPlaceId);

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-x-hidden">
      {/* Toast Notification with Spring Motion */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed bottom-6 inset-x-0 mx-auto w-fit max-w-[90%] z-50 rounded-2xl bg-gradient-to-r from-ocean-900 via-ocean-800 to-teal2-700 text-white px-6 py-3.5 font-bold shadow-2xl text-center text-xs sm:text-sm border border-white/20 backdrop-blur-md"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <Header
        onNavigate={handleNavigate}
        onOpenFeedback={() => handleNavigate('feedback')}
        onOpenPoints={() => handleNavigate('points')}
        onOpenGuide={() => setShowGuideModal(true)}
      />

      {/* Main Dynamic View Content with AnimatePresence */}
      <main className="max-w-6xl mx-auto px-3 min-[400px]:px-4 sm:px-5 lg:px-8 py-4 sm:py-6 lg:py-8 flex-1 w-full relative z-10">
        <AnimatePresence mode="wait">
          {currentView === 'home' && (
            <motion.div
              key="home-view"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-4 sm:space-y-6"
            >
              <HeroBanner />
              <CategoryGrid
                onSelectCategory={(key) => {
                  if (key === 'bus' || key === 'housing' || key === 'explore') {
                    handleNavigate(key);
                  } else {
                    handleNavigate('list', key);
                  }
                }}
              />
              <PortSaidGallery />

              {/* Quick Interactive Actions Grid (Mobile & Desktop) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 pt-1">
                {/* Points & Rewards Card */}
                <motion.button
                  onClick={() => handleNavigate('points')}
                  type="button"
                  whileHover={{ y: -6, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="group relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-right bg-gradient-to-br from-[#ffe7b3] via-[#ffb938] to-[#f59e0b] text-ocean-900 shadow-lg shadow-amber-500/15 border border-amber-300/80 flex items-center justify-between gap-3 touch-manipulation"
                >
                  <div className="min-w-0 flex-1 relative z-10">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="rounded-full bg-ocean-900 text-sand-300 px-3 py-0.5 text-[11px] font-black tracking-wide flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-sand-400" />
                        <span>رصيدك: {user.points} نقطة</span>
                      </span>
                    </div>
                    <h4 className="font-black text-sm min-[400px]:text-base sm:text-lg leading-tight text-ocean-900">
                      مكافآتك ونقاطك في بورسعيد
                    </h4>
                    <p className="text-[11px] min-[400px]:text-xs sm:text-sm text-ocean-900/85 font-bold mt-1 line-clamp-1">
                      اضغط لمعرفة كيف تستخدم نقاطك للحصول على خصومات حقيقية وكوبونات
                    </p>
                  </div>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/40 backdrop-blur-md grid place-items-center shrink-0 shadow-inner group-hover:scale-110 transition-transform relative z-10">
                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-ocean-900" />
                  </div>
                </motion.button>

                {/* Feedback & Suggestions Card */}
                <motion.button
                  onClick={() => handleNavigate('feedback')}
                  type="button"
                  whileHover={{ y: -6, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="group relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-right bg-white dark:bg-[#0f1a28] text-ocean-900 dark:text-white shadow-md shadow-ocean-900/5 dark:shadow-black/40 border border-sand-200/80 dark:border-[#1d2d3e] border-b-4 border-b-teal2-500 flex items-center justify-between gap-3 touch-manipulation"
                >
                  <div className="min-w-0 flex-1 relative z-10">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="rounded-full bg-teal2-100 dark:bg-teal2-950/60 text-teal2-700 dark:text-teal2-400 px-3 py-0.5 text-[11px] font-black">
                        رأيك يهمنا
                      </span>
                    </div>
                    <h4 className="font-black text-sm min-[400px]:text-base sm:text-lg leading-tight">
                      شكاوى واقتراحات
                    </h4>
                    <p className="text-[11px] min-[400px]:text-xs sm:text-sm text-ocean-700/70 dark:text-white/60 font-semibold mt-1 line-clamp-1">
                      شاركنا مقترحاتك لتطوير موقع بورسعيد وتحديث الأماكن
                    </p>
                  </div>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-teal2-50 dark:bg-[#162738] text-teal2-600 dark:text-teal2-400 grid place-items-center shrink-0 group-hover:scale-110 transition-transform relative z-10">
                    <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </motion.button>
              </div>

              {/* Interactive Roadmap Cards & Flow Arrows Explaining Every Feature */}
              <FeatureExplainerCards
                onOpenGuideModal={() => setShowGuideModal(true)}
                onNavigate={handleNavigate}
                hasSeenGuide={hasSeenGuide}
              />
            </motion.div>
          )}

          {currentView === 'list' && (
            <motion.div key="list-view" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <PlaceList
                categoryKey={selectedCategory}
                places={places}
                onSelectPlace={(id) => handleNavigate('place', id)}
                onBack={() => handleNavigate('home')}
              />
            </motion.div>
          )}

          {currentView === 'place' && selectedPlace && (
            <motion.div key="place-view" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <PlaceDetail
                place={selectedPlace}
                onBack={() => handleNavigate('list', selectedPlace.cat)}
                onRequestCoupon={handleRequestCoupon}
              />
            </motion.div>
          )}

          {currentView === 'bus' && (
            <motion.div key="bus-view" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <TransportView onBack={() => handleNavigate('home')} />
            </motion.div>
          )}

          {currentView === 'housing' && (
            <motion.div key="housing-view" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <HousingView
                places={places}
                onSelectPlace={(id) => handleNavigate('place', id)}
                onBack={() => handleNavigate('home')}
              />
            </motion.div>
          )}

          {currentView === 'explore' && (
            <motion.div key="explore-view" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <ExploreView onBack={() => handleNavigate('home')} />
            </motion.div>
          )}

          {currentView === 'feedback' && (
            <motion.div key="feedback-view" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <FeedbackView onBack={() => handleNavigate('home')} />
            </motion.div>
          )}

          {currentView === 'partner' && (
            <motion.div key="partner-view" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <PartnerView onBack={() => handleNavigate('home')} />
            </motion.div>
          )}

          {currentView === 'account' && (
            <motion.div key="account-view" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <AccountView onBack={() => handleNavigate('home')} />
            </motion.div>
          )}

          {currentView === 'points' && (
            <motion.div key="points-view" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <PointsDetailsView
                onBack={() => handleNavigate('home')}
                onSelectPlace={(id) => handleNavigate('place', id)}
                onOpenCouponModal={handleRequestCoupon}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Partner Callout Section (on Home) */}
      {currentView === 'home' && user.role !== 'merchant' && (
        <section className="max-w-6xl mx-auto px-3 min-[400px]:px-4 sm:px-5 lg:px-8 pb-8 sm:pb-12 w-full">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl bg-gradient-to-br from-ocean-900 via-ocean-800 to-teal2-700 text-white p-5 sm:p-7 md:p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-5 sm:gap-6 text-center md:text-right border border-white/10 relative overflow-hidden"
          >
            {/* Ambient Animated Blob */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-teal2-400/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-xl">
              <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-full px-3 py-1 text-xs font-bold mb-2.5 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-sand-400" />
                <span>تسجيل فوري — حسابك التجاري جاهز في دقيقة</span>
              </span>
              <h3 className="text-lg sm:text-xl md:text-2xl font-black leading-snug">
                عندك مطعم أو كافيه أو نشاط تجاري في بورسعيد؟
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-white/85 leading-relaxed font-medium">
                انضم لشبكة شركائنا ووصّل مكانك لآلاف الزوار والطلاب، وقدّم كوبونات وعروض حصرية.
              </p>
            </div>
            <motion.button
              onClick={() => handleNavigate('partner')}
              type="button"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="relative z-10 w-full md:w-auto shrink-0 inline-flex items-center justify-center gap-2.5 bg-gradient-to-b from-[#ffd27a] to-[#ffb938] text-ocean-900 font-black px-6 sm:px-8 py-3.5 rounded-2xl shadow-xl hover:shadow-2xl transition text-sm sm:text-base touch-manipulation"
            >
              <Store className="w-5 h-5 text-ocean-900" />
              <span>سجّل متجرك كشريك</span>
            </motion.button>
          </motion.div>
        </section>
      )}

      {/* Dynamic QR Code Modal */}
      {activeCouponPlace && (
        <QRModal place={activeCouponPlace} onClose={() => setActiveCouponPlace(null)} />
      )}

      {/* Interactive Site Guide & Roadmap Modal */}
      <SiteGuideModal
        isOpen={showGuideModal}
        onClose={handleCloseGuide}
        onNavigateToView={(view) => {
          handleNavigate(view);
          handleCloseGuide();
        }}
      />

      {/* Assistant AI Chatbot FAB */}
      <AssistantChat onOpenPoints={() => handleNavigate('points')} />

      {/* Footer */}
      <Footer />
    </div>
  );
}
