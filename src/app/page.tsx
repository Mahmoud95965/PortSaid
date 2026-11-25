'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { HotelsView } from '@/components/HotelsView';
import { ClothesView } from '@/components/ClothesView';
import { SportsView } from '@/components/SportsView';
import { ExploreView } from '@/components/ExploreView';
import { MapView } from '@/components/MapView';
import { FeedbackView } from '@/components/FeedbackView';
import { PartnerView } from '@/components/PartnerView';
import { AccountView } from '@/components/AccountView';
import { AssistantChat } from '@/components/AssistantChat';
import { SiteGuideModal } from '@/components/SiteGuideModal';
import { FeatureExplainerCards } from '@/components/FeatureExplainerCards';
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Place } from '@/types';
import { INITIAL_PLACES } from '@/lib/constants';
import {
  Share2,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  Compass,
  MapPin,
  Bus,
  ArrowLeft,
} from 'lucide-react';

const pageVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.25, ease: 'easeIn' } },
};

export default function HomePage() {
  const router = useRouter();
  const { user, loading, hasSeenWelcome, setHasSeenWelcome } = useAuth();

  const [currentView, setCurrentView] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('fun');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [targetMapPlaceId, setTargetMapPlaceId] = useState<string | null>(null);
  const [targetMapCategory, setTargetMapCategory] = useState<string | null>(null);
  const [targetRoute, setTargetRoute] = useState<{ from: string; to: string; nonce: number } | null>(null);
  const [targetChatInitialPrompt, setTargetChatInitialPrompt] = useState<string | null>(null);

  const [places, setPlaces] = useState<Place[]>(INITIAL_PLACES);
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
              rating: item.rating != null ? Number(item.rating) : undefined,
              reviews_count: item.ratings_count ?? undefined,
              maps_url: item.maps_url || undefined,
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
    if (view === 'planner') {
      const q = arg && !arg.includes('=') ? `q=${encodeURIComponent(arg)}` : arg;
      router.push(q ? `/ai?tab=planner&${q}` : '/ai?tab=planner');
      return;
    }
    if (view === 'chat') {
      const q = arg && !arg.includes('=') ? `q=${encodeURIComponent(arg)}` : arg;
      router.push(q ? `/ai?tab=chat&${q}` : '/ai?tab=chat');
      return;
    }
    if (view === 'ai') {
      if (arg?.startsWith('tab=')) {
        router.push(`/ai?${arg}`);
      } else if (arg) {
        router.push(`/ai?q=${encodeURIComponent(arg)}`);
      } else {
        router.push('/ai');
      }
      return;
    }
    if (view === 'map') {
      // arg إما معرّف مكان أو "cat:<تصنيف>" من المساعد الذكي
      if (arg && arg.startsWith('cat:')) {
        setTargetMapCategory(arg.slice(4));
        setTargetMapPlaceId(null);
      } else {
        setTargetMapPlaceId(arg || null);
        setTargetMapCategory(null);
      }
      setCurrentView('map');
      return;
    }
    if (view === 'food') {
      setSelectedCategory('food');
      setCurrentView('list');
      return;
    }
    if (view === 'cafe' || view === 'cafes') {
      setSelectedCategory('cafe');
      setCurrentView('list');
      return;
    }
    if (view === 'sweets' || view === 'sweet') {
      setSelectedCategory('sweets');
      setCurrentView('list');
      return;
    }
    if (view === 'shop' || view === 'shopping') {
      setSelectedCategory('shop');
      setCurrentView('list');
      return;
    }
    if (view === 'transport' || view === 'transit' || view === 'bus') {
      // arg بصيغة "من|إلى" من المساعد الذكي (أسماء محطات)
      if (arg && arg.includes('|')) {
        const [from, to] = arg.split('|');
        if (from && to) setTargetRoute({ from, to, nonce: Date.now() });
      }
      setCurrentView('bus');
      return;
    }
    if (view === 'housing' || view === 'hotels' || view === 'stay') {
      setSelectedCategory('housing');
      setCurrentView('housing');
      return;
    }
    if (view === 'sport' || view === 'sports') {
      setSelectedCategory('sport');
      setCurrentView('sport');
      return;
    }
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
      '🏠 سكن وأماكن قريبة منك\n\n' +
      'جرب الموقع من هنا 👇\n' +
      window.location.origin;

    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
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

              {/* Modern Glass Quick Discovery Bar (Native Optimized Touch Response) */}
              <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto py-1 scrollbar-none">
                <button
                  onClick={() => handleNavigate('ai')}
                  type="button"
                  className="shrink-0 px-3.5 sm:px-4 py-2 rounded-2xl bg-gradient-to-r from-ocean-900 to-teal2-700 text-white text-xs sm:text-sm font-black shadow-md border border-teal2-400/30 flex items-center gap-2 transition-transform active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-sand-300" />
                  <span>خطط خروجتك بالذكاء الاصطناعي ✦</span>
                </button>

                <button
                  onClick={() => handleNavigate('map')}
                  type="button"
                  className="shrink-0 px-3.5 sm:px-4 py-2 rounded-2xl bg-white dark:bg-[#0c1622] text-ocean-900 dark:text-white text-xs sm:text-sm font-black shadow-sm border border-sand-300 dark:border-[#1d2d3e] hover:border-teal2-400 flex items-center gap-2 transition-transform active:scale-95"
                >
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span>خريطة بورسعيد التفاعلية</span>
                </button>

              </div>

              <CategoryGrid
                onSelectCategory={(key) => {
                  if (['bus', 'housing', 'hotels', 'clothes', 'explore', 'map'].includes(key)) {
                    handleNavigate(key);
                  } else {
                    handleNavigate('list', key);
                  }
                }}
              />

              <PortSaidGallery />

              {/* Master 4-Card Service Hub (بوابة خدمات بورسعيد الكبرى - Ultra Smooth Touch) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-1">
                {/* 1. AI Studio & Outing Planner */}
                <button
                  onClick={() => handleNavigate('ai')}
                  type="button"
                  className="group relative overflow-hidden rounded-3xl p-5 text-right bg-gradient-to-br from-[#061a3d] via-[#092754] to-[#044343] text-white shadow-xl shadow-ocean-950/20 border border-teal2-500/30 flex flex-col justify-between gap-4 transition-transform active:scale-[0.98] touch-manipulation"
                >
                  <div className="relative z-10 space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal2-500/25 border border-teal2-400/40 text-[10px] font-black text-sand-300">
                      <Sparkles className="w-3 h-3 text-sand-300 animate-pulse" />
                      <span>AI Suite ✦ مباشر</span>
                    </span>
                    <h4 className="font-black text-base sm:text-lg leading-tight text-white group-hover:text-sand-300 transition-colors">
                      مخطط الرحلات والخروجات
                    </h4>
                    <p className="text-xs text-white/80 font-medium leading-relaxed line-clamp-2">
                      خطة ذكية مع الخريطة الحية ومسارات الشوارع المعتمدة وحساب الميزانية بدقة.
                    </p>
                  </div>
                  <div className="relative z-10 flex items-center justify-between text-xs font-black text-sand-300 pt-1 border-t border-white/10">
                    <span>ابدأ التخطيط الذكي</span>
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1.5 transition-transform" />
                  </div>
                </button>

                {/* 2. Interactive Map */}
                <button
                  onClick={() => handleNavigate('map')}
                  type="button"
                  className="group relative overflow-hidden rounded-3xl p-5 text-right bg-gradient-to-br from-[#072440] via-[#0b3858] to-[#0a4864] text-white shadow-xl shadow-ocean-950/20 border border-cyan-500/30 flex flex-col justify-between gap-4 transition-transform active:scale-[0.98] touch-manipulation"
                >
                  <div className="relative z-10 space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/25 border border-cyan-400/40 text-[10px] font-black text-cyan-200">
                      <MapPin className="w-3 h-3 text-cyan-300" />
                      <span>خريطة حقيقية</span>
                    </span>
                    <h4 className="font-black text-base sm:text-lg leading-tight text-white group-hover:text-cyan-200 transition-colors">
                      خريطة بورسعيد التفاعلية
                    </h4>
                    <p className="text-xs text-white/80 font-medium leading-relaxed line-clamp-2">
                      تصفح مطاعم السمك، الكافيهات، والمعالم، واحسب المسافة لموقعك بالكيلومتر.
                    </p>
                  </div>
                  <div className="relative z-10 flex items-center justify-between text-xs font-black text-cyan-200 pt-1 border-t border-white/10">
                    <span>افتح الخريطة الآن</span>
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1.5 transition-transform" />
                  </div>
                </button>

                {/* 4. Transit & Campus */}
                <button
                  onClick={() => handleNavigate('bus')}
                  type="button"
                  className="group relative overflow-hidden rounded-3xl p-5 text-right bg-gradient-to-br from-[#1a1738] via-[#241a4a] to-[#341d5a] text-white shadow-xl shadow-purple-950/20 border border-purple-500/30 flex flex-col justify-between gap-4 transition-transform active:scale-[0.98] touch-manipulation"
                >
                  <div className="relative z-10 space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/25 border border-purple-400/40 text-[10px] font-black text-purple-200">
                      <Bus className="w-3 h-3 text-purple-300" />
                      <span>دليل الجامعة والمعدية</span>
                    </span>
                    <h4 className="font-black text-base sm:text-lg leading-tight text-white group-hover:text-purple-200 transition-colors">
                      المواصلات وسكن الطلاب
                    </h4>
                    <p className="text-xs text-white/80 font-medium leading-relaxed line-clamp-2">
                      خطوط المينى باص من السكن لكليات الطب والهندسة والتربية والمعدية 24 ساعة.
                    </p>
                  </div>
                  <div className="relative z-10 flex items-center justify-between text-xs font-black text-purple-200 pt-1 border-t border-white/10">
                    <span>تصفح خطوط المواصلات</span>
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1.5 transition-transform" />
                  </div>
                </button>
              </div>

              {/* Community Feedback Strip */}
              <button
                onClick={() => handleNavigate('feedback')}
                type="button"
                className="w-full p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0c1622] border border-sand-300 dark:border-[#1d2d3e] text-ocean-900 dark:text-white flex items-center justify-between gap-3 shadow-sm hover:border-teal2-400 transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-teal2-100 dark:bg-teal2-950/60 text-teal2-700 dark:text-teal2-400 grid place-items-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="text-right min-w-0">
                    <p className="font-black text-xs sm:text-sm truncate">رأيك يهمنا لتطوير بورسعيد</p>
                    <p className="text-[11px] text-ocean-700/70 dark:text-white/60 font-medium truncate">
                      عندك اقتراح أو مكان جديد تحب نضيفه للموقع؟ شاركنا رأيك في ثوانٍ
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-sand-100 dark:bg-[#162738] text-teal2-700 dark:text-teal2-300 text-xs font-black shrink-0 flex items-center gap-1">
                  <span>اكتب مقترحك</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </span>
              </button>

              {/* Interactive Roadmap Cards & Flow Arrows Explaining Every Feature */}
              <FeatureExplainerCards
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
                onNavigate={handleNavigate}
              />
            </motion.div>
          )}

          {currentView === 'place' && selectedPlace && (
            <motion.div key="place-view" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <PlaceDetail
                place={selectedPlace}
                onBack={() => handleNavigate('list', selectedPlace.cat)}
              />
            </motion.div>
          )}

          {(currentView === 'bus' || currentView === 'transport' || currentView === 'transit') && (
            <motion.div key="bus-view" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <TransportView
                places={places}
                routeRequest={targetRoute}
                onNavigate={handleNavigate}
                onBack={() => handleNavigate('home')}
              />
            </motion.div>
          )}

          {(currentView === 'hotels' || currentView === 'hotel' || currentView === 'stay') && (
            <motion.div key="hotels-view" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <HotelsView
                places={places}
                onSelectPlace={(id) => handleNavigate('place', id)}
                onNavigate={handleNavigate}
                onBack={() => handleNavigate('home')}
              />
            </motion.div>
          )}

          {currentView === 'housing' && (
            <motion.div key="housing-view" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <HousingView
                places={places}
                onSelectPlace={(id: string) => handleNavigate('place', id)}
                onNavigate={handleNavigate}
                onBack={() => handleNavigate('home')}
              />
            </motion.div>
          )}

          {currentView === 'clothes' && (
            <motion.div key="clothes-view" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <ClothesView
                places={places}
                onSelectPlace={(id) => handleNavigate('place', id)}
                onNavigate={handleNavigate}
                onBack={() => handleNavigate('home')}
              />
            </motion.div>
          )}

          {(currentView === 'sport' || currentView === 'sports') && (
            <motion.div key="sport-view" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <SportsView
                places={places}
                onSelectPlace={(id) => handleNavigate('place', id)}
                onNavigate={handleNavigate}
                onBack={() => handleNavigate('home')}
              />
            </motion.div>
          )}

          {currentView === 'explore' && (
            <motion.div key="explore-view" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <ExploreView
                places={places}
                onSelectPlace={(id) => handleNavigate('place', id)}
                onSelectCategory={(cat) => handleNavigate('list', cat)}
                onNavigate={handleNavigate}
                onBack={() => handleNavigate('home')}
              />
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

          {currentView === 'map' && (
            <motion.div key="map-view" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <MapView
                places={places}
                initialPlaceId={targetMapPlaceId}
                initialCategory={targetMapCategory}
                onSelectPlace={(id) => handleNavigate('place', id)}
                onBack={() => handleNavigate('home')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

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
      <AssistantChat onNavigate={handleNavigate} />

      {/* PWA App Installation Prompt Banner */}
      <PwaInstallPrompt />

      {/* Footer */}
      <Footer />
    </div>
  );
}
