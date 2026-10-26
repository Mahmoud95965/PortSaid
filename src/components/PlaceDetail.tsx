'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Place, Review } from '@/types';
import { CATS, AREA_STOP, HOME_STOP, planRoute } from '@/lib/constants';
import { PLACES_METADATA } from '@/lib/plannerUtils';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  ArrowRight,
  MapPin,
  Camera,
  Navigation,
  Star,
  CheckCircle,
  ExternalLink,
  QrCode,
  Sparkles,
  Send,
  Loader2,
  Clock,
  Compass,
  Heart,
  Share2,
  Check,
  Tag,
  DollarSign,
  Map as MapIcon,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PlaceDetailProps {
  place: Place;
  onBack: () => void;
  onRequestCoupon: (place: Place) => void;
}

const FAVORITES_KEY = 'portsaid_favorite_places';

// ربط المعالم والمطاعم والأماكن بالصور الأصلية المتوفرة في المشروع
const PLACE_HERO_PHOTOS: Record<string, string> = {
  // مطعم وكافيه كاستن
  '20000000-0000-0000-0000-000000000001': '/assets/port-said/hero-02.webp',
  // مجمع الجراج
  '20000000-0000-0000-0000-000000000002': '/assets/port-said/gallery/balconies-street.webp',
  // كافيه ومطعم الشاطئ
  '20000000-0000-0000-0000-000000000004': '/assets/port-said/port-said-port-night.webp',
  // مطعم ابن حميدو
  '20000000-0000-0000-0000-000000000005': '/assets/port-said/hero-02.webp',
  // ديليسبس الممشى السياحي
  '20000000-0000-0000-0000-000000000009': '/assets/port-said/hero-01.webp',
  // سوق الأسماك الحضاري
  '20000000-0000-0000-0000-000000000031': '/assets/port-said/gallery/ship.webp',
  // مطعم الجندي
  '20000000-0000-0000-0000-000000000075': '/assets/port-said/hero-03.webp',
  // سوق السمك الحضاري الجديد
  '20000000-0000-0000-0000-000000000084': '/assets/port-said/gallery/ship.webp',
  // قاعدة تمثال ديليسبس
  '20000000-0000-0000-0000-000000000100': '/assets/port-said/hero-01.webp',
  // De Lesseps Bay
  '20000000-0000-0000-0000-000000000128': '/assets/port-said/port-said-port-night.webp',
  // Cap d'Or
  '20000000-0000-0000-0000-000000000138': '/assets/port-said/gallery/balconies-street.webp',
  // مطعم الجندي للأسماك بورفؤاد
  '20000000-0000-0000-0000-000000000191': '/assets/port-said/hero-03.webp',
  // الممشى السياحي
  '20000000-0000-0000-0000-000000000253': '/assets/port-said/hero-01.webp',
  // متحف النصر للفن الحديث
  '20000000-0000-0000-0000-000000000256': '/assets/port-said/gallery/martyrs-square.webp',
};

function getPlaceHeroPhoto(place: Place): string {
  if (PLACE_HERO_PHOTOS[place.id]) {
    return PLACE_HERO_PHOTOS[place.id];
  }
  const name = (place.n || '').toLowerCase();
  const desc = (place.ds || '').toLowerCase();

  if (name.includes('فنار')) return '/assets/port-said/port-said-lighthouse.webp';
  if (name.includes('ديليسبس') || name.includes('ممشى')) return '/assets/port-said/hero-01.webp';
  if (name.includes('سلام') || name.includes('مسجد')) return '/assets/port-said/port-said-mosque.webp';
  if (name.includes('كاستن') || name.includes('سمك') || desc.includes('سمك')) return '/assets/port-said/hero-02.webp';
  if (name.includes('جندي')) return '/assets/port-said/hero-03.webp';
  if (name.includes('بينوس') || name.includes('كافيه') || desc.includes('كافيه')) return '/assets/port-said/port-said-port-night.webp';
  if (name.includes('شهداء') || name.includes('مسلة') || name.includes('نصر')) return '/assets/port-said/gallery/martyrs-square.webp';
  if (name.includes('سيلفر') || name.includes('كاساتا') || name.includes('حلويات')) return '/assets/port-said/gallery/balconies-street.webp';
  if (name.includes('سفينة') || name.includes('قناة')) return '/assets/port-said/gallery/ship.webp';
  return '/assets/port-said/hero-01.webp';
}

export const PlaceDetail: React.FC<PlaceDetailProps> = ({ place, onBack, onRequestCoupon }) => {
  const { user, recordVisit } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fromStop, setFromStop] = useState(HOME_STOP);
  const [visited, setVisited] = useState(!!place.visited);
  const [checkinMsg, setCheckinMsg] = useState('');
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([
    {
      id: '1',
      n: 'محمود السيد',
      r: 5,
      c: 'مكان رائع جداً وإطلالة ممتعة على قناة السويس، يستحق الزيارة والتصوير!',
      d: '2026-10-15',
      mine: false,
      v: true,
    },
    {
      id: '2',
      n: 'سارة إبراهيم',
      r: 4,
      c: 'تجربة ممتازة وقريب من كل معالم حي الشرق، والخدمة سريعة.',
      d: '2026-10-14',
      mine: false,
      v: false,
    },
  ]);
  const [userRating, setUserRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [userComment, setUserComment] = useState('');
  const [reviewMsg, setReviewMsg] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // فحص المفضلة من التخزين المحلي
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr) && arr.includes(place.id)) {
          setIsFavorite(true);
        }
      }
    } catch (e) {}
  }, [place.id]);

  const toggleFavorite = () => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      let arr: string[] = stored ? JSON.parse(stored) : [];
      let nextState = !isFavorite;
      if (nextState) {
        if (!arr.includes(place.id)) arr.push(place.id);
        confetti({ particleCount: 25, spread: 45, origin: { y: 0.8 } });
        showToast('تمت إضافة المكان إلى المفضلة ❤️');
      } else {
        arr = arr.filter((id) => id !== place.id);
        showToast('تمت إزالة المكان من المفضلة');
      }
      setIsFavorite(nextState);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(arr));
    } catch (e) {}
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleSharePlace = async () => {
    const shareData = {
      title: `${place.n} — Port Said Hub`,
      text: `تعال شوف ${place.n} في ${place.a} على Port Said Hub!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {}
    } else {
      try {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        setCopiedShare(true);
        showToast('تم نسخ الرابط بنجاح! 📋');
        setTimeout(() => setCopiedShare(false), 2000);
      } catch (err) {}
    }
  };

  // جلب التقييمات الحقيقية للمكان من Supabase
  useEffect(() => {
    async function loadReviews() {
      if (isSupabaseConfigured() && supabase && place?.id) {
        try {
          const { data } = await supabase
            .from('place_reviews')
            .select('*, users(name, email_verified_at)')
            .eq('place_id', place.id)
            .eq('status', 'visible')
            .order('created_at', { ascending: false });

          if (data && data.length > 0) {
            setReviews(
              data.map((r: any) => ({
                id: r.id,
                n: r.users?.name || 'زائر بورسعيد',
                r: r.rating,
                c: r.comment,
                d: r.created_at ? r.created_at.slice(0, 10) : '',
                mine: user ? r.user_id === user.id : false,
                v: !!r.users?.email_verified_at,
              }))
            );
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
    loadReviews();
  }, [place?.id, user?.id]);

  const cat = CATS[place.cat] || { t: 'مكان', border: '#1559b7', bgSoft: '#1559b71a' };
  const meta = PLACES_METADATA[place.id];
  const photo = getPlaceHeroPhoto(place);

  // مسار المواصلات
  const normArea = place.a.replace(/^\s*حي\s+/, '').trim();
  const targetStop = AREA_STOP[normArea] || 'حي العرب';
  const routePlan = planRoute(fromStop, targetStop);

  // حساب المسافات
  const calcDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  };

  const handleCameraCheckin = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setCheckinLoading(true);
    setCheckinMsg('بنتأكد إنك في المكان عبر GPS...');

    if (!navigator.geolocation) {
      setCheckinLoading(false);
      setCheckinMsg('متصفحك مش بيدعم تحديد الموقع.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const userLat = pos.coords.latitude;
        const userLon = pos.coords.longitude;
        const dist = calcDistanceMeters(userLat, userLon, place.lat, place.lon);

        if (!user) {
          setCheckinLoading(false);
          setCheckinMsg('يرجى تسجيل الدخول أولاً لتسجيل الحضور.');
          return;
        }

        const res = await recordVisit({
          placeId: place.id,
          lat: userLat,
          lon: userLon,
          distanceM: Math.round(dist),
        });

        setCheckinLoading(false);
        setCheckinMsg(res.message);

        if (res.ok) {
          setVisited(true);
          try {
            confetti({
              particleCount: 90,
              spread: 70,
              origin: { y: 0.6 },
            });
          } catch (err) {}
        }
      },
      (err) => {
        setCheckinLoading(false);
        setCheckinMsg('برجاء تفعيل الموقع (Location) في المتصفح للتأكد من تواجدك في المكان.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setReviewMsg('سجّل دخولك الأول عشان تقدر تقيّم.');
      return;
    }

    setReviewSubmitting(true);
    const newRev: Review = {
      id: crypto.randomUUID(),
      n: user.name,
      r: userRating,
      c: userComment.trim() || null,
      d: new Date().toISOString().split('T')[0],
      mine: true,
      v: user.email_verified,
    };

    setReviews([newRev, ...reviews.filter((x) => !x.mine)]);
    const commentText = userComment.trim();
    setUserComment('');
    setReviewMsg('تم نشر تقييمك وحفظه بنجاح!');
    setReviewSubmitting(false);

    try {
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
    } catch (e) {}

    if (isSupabaseConfigured() && supabase && user?.id && place?.id) {
      try {
        await supabase.from('place_reviews').upsert(
          {
            place_id: place.id,
            user_id: user.id,
            rating: userRating,
            comment: commentText || null,
            status: 'visible',
          },
          { onConflict: 'place_id,user_id' }
        );
      } catch (err: any) {
        console.error('Supabase review error:', err);
      }
    }
  };

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.r, 0) / reviews.length).toFixed(1)
      : null;

  return (
    <motion.div
      className="space-y-5 max-w-4xl mx-auto pb-12"
      dir="rtl"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35 }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-ocean-950 text-white px-4 py-2 rounded-2xl shadow-xl text-xs sm:text-sm font-bold border border-white/10"
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar: Back & Quick Actions */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          type="button"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-ocean-900 dark:hover:text-white transition group py-1.5 px-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#121f2f]"
        >
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          <span>رجوع للأماكن</span>
        </button>

        <div className="flex items-center gap-1.5">
          {/* Favorite Button */}
          <button
            type="button"
            onClick={toggleFavorite}
            className={`p-2 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold ${
              isFavorite
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/40'
                : 'bg-white dark:bg-[#0c1622] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-[#1d2d3e] hover:border-slate-300'
            }`}
            title={isFavorite ? 'في المفضلة' : 'إضافة إلى المفضلة'}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span className="hidden sm:inline">{isFavorite ? 'محفوظ' : 'حفظ'}</span>
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleSharePlace}
            className="p-2 rounded-xl bg-white dark:bg-[#0c1622] text-slate-600 dark:text-slate-400 hover:text-ocean-900 dark:hover:text-white border border-slate-200 dark:border-[#1d2d3e] hover:border-slate-300 transition flex items-center gap-1.5 text-xs font-bold"
            title="مشاركة المكان"
          >
            {copiedShare ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{copiedShare ? 'تم النسخ' : 'مشاركة'}</span>
          </button>
        </div>
      </div>

      {/* 1. Hero Photo Card with Details Overlay */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-[#1d2d3e] shadow-sm bg-slate-900 text-white aspect-[16/10] sm:aspect-[21/9] max-h-96">
        <img
          src={photo}
          alt={place.n}
          className="w-full h-full object-cover opacity-85"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ocean-950 via-ocean-950/40 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-sm backdrop-blur-md"
            style={{ backgroundColor: `${cat.border}e6`, color: '#ffffff' }}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{cat.t}</span>
          </span>

          <div className="flex items-center gap-1.5">
            {place.p > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/90 text-ocean-950 text-xs font-black shadow-sm backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                <span>+{place.p} نقطة</span>
              </span>
            )}

            {place.disc > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal2-600/90 text-white text-xs font-black shadow-sm backdrop-blur-md">
                <Tag className="w-3.5 h-3.5" />
                <span>خصم {place.disc}%</span>
              </span>
            )}
          </div>
        </div>

        {/* Bottom Title & Location Overlay */}
        <div className="absolute bottom-4 inset-x-4 sm:bottom-6 sm:inset-x-6 space-y-1.5 text-right">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-sand-300 drop-shadow-sm">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>بورسعيد · {place.a}</span>
            </span>

            {avgRating && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-white text-[11px] font-bold backdrop-blur-xs">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>{avgRating} ({reviews.length} تقييم)</span>
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight drop-shadow-md">
            {place.n}
          </h1>
        </div>
      </div>

      {/* 2. Key Highlights Strip (Duration, Best Time, Cost, Points) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Cost Range */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] text-right space-y-1">
          <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-teal2-600" />
            <span>التكلفة التقديرية</span>
          </span>
          <p className="font-black text-xs sm:text-sm text-ocean-950 dark:text-white truncate">
            {meta?.costRange || (place.cost ? `${place.cost} ج.م` : 'مجاني')}
          </p>
        </div>

        {/* Visit Duration */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] text-right space-y-1">
          <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>المدة المقترحة</span>
          </span>
          <p className="font-black text-xs sm:text-sm text-ocean-950 dark:text-white truncate">
            {meta?.recommendedDurationMinutes ? `${meta.recommendedDurationMinutes} دقيقة` : '45 دقيقة'}
          </p>
        </div>

        {/* Best Time of Day */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] text-right space-y-1">
          <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-amber-500" />
            <span>أفضل توقيت</span>
          </span>
          <p className="font-black text-xs sm:text-sm text-ocean-950 dark:text-white truncate">
            {meta?.bestTimeOfDay === 'morning'
              ? 'صباحاً'
              : meta?.bestTimeOfDay === 'evening'
              ? 'وقت الغروب'
              : meta?.bestTimeOfDay === 'midday'
              ? 'فترة الظهيرة'
              : 'أي وقت'}
          </p>
        </div>

        {/* Points Reward */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] text-right space-y-1">
          <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>نقاط الحضور</span>
          </span>
          <p className="font-black text-xs sm:text-sm text-ocean-950 dark:text-white truncate">
            +{place.p || 20} نقطة مكافأة
          </p>
        </div>
      </div>

      {/* 3. Place Overview & Description Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] shadow-xs text-right space-y-3">
        <h2 className="text-base sm:text-lg font-black text-ocean-950 dark:text-white">
          عن المكان وتفاصيل الزيارة
        </h2>

        {place.ds && (
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
            {place.ds}
          </p>
        )}

        {meta?.tags && meta.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-[#152332]">
            {meta.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#152332] text-[11px] font-bold text-slate-600 dark:text-slate-300"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <a
            href={`/map?place=${place.id}`}
            className="py-2.5 px-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <MapIcon className="w-4 h-4" />
            <span>عرض على الخريطة التفاعلية</span>
          </a>

          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.n + ' بورسعيد')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-3 rounded-2xl bg-slate-100 dark:bg-[#152332] text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#1d2d3e] text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="w-4 h-4 text-slate-500" />
            <span>الاتجاهات عبر Google Maps</span>
          </a>

          <a
            href={`/ai?q=${encodeURIComponent(`عايز أزور ${place.n} في بورسعيد وخطط لي خروجة متكاملة حواليه`)}`}
            className="py-2.5 px-3 rounded-2xl bg-teal2-50 dark:bg-teal2-950/40 text-teal2-700 dark:text-teal2-300 border border-teal2-200/60 dark:border-teal2-800/40 hover:bg-teal2-100 text-xs font-black transition flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-teal2-600" />
            <span>تخطيط خروجة بالـ AI</span>
          </a>
        </div>
      </div>

      {/* 4. Special Offer / Discount Coupon Card */}
      {place.cat !== 'housing' && place.disc > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl border border-teal2-400/40 bg-gradient-to-br from-teal2-50/80 via-white to-blue-50/40 dark:from-teal2-950/30 dark:via-[#0c1622] dark:to-blue-950/20 text-right shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-block rounded-full bg-teal2-600 text-white text-[10px] font-black px-2.5 py-0.5 mb-0.5">
              عرض خاص وحصري
            </span>
            <h3 className="font-black text-base text-teal2-950 dark:text-teal2-200">
              خصم {place.disc}% متاح لرواد Port Said Hub
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              استبدل {place.cost || 50} نقطة من رصيدك للحصول على كود خصم QR صالح للاستخدام فوراً عند الكاشير.
            </p>
          </div>

          <button
            onClick={() => onRequestCoupon(place)}
            type="button"
            className="px-5 py-2.5 rounded-2xl bg-teal2-600 hover:bg-teal2-500 text-white font-black text-xs sm:text-sm shadow-md shadow-teal2-600/25 transition flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-center"
          >
            <QrCode className="w-4 h-4" />
            <span>اطلب الكوبون الآن</span>
          </button>
        </div>
      )}

      {/* 5. GPS Check-in & Points Reward Section */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] shadow-xs text-right space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 grid place-items-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-black text-sm sm:text-base text-ocean-950 dark:text-white">
              تسجيل الحضور وكسب النقاط (+{place.p || 20} نقطة)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              التقط صورة أثناء تواجدك في المكان، وسيتم التحقق من موقعك بـ GPS وإضافة النقاط لمحفظتك فوراً.
            </p>
          </div>
        </div>

        <button
          onClick={handleCameraCheckin}
          disabled={visited || checkinLoading}
          type="button"
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-ocean-950 font-black text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {checkinLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-ocean-950" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
          <span>
            {visited
              ? 'تم تسجيل زيارتك واحتساب النقاط بنجاح ✓'
              : checkinLoading
              ? 'جارٍ التحقق من موقعك الفعلي...'
              : `التقط صورة وسجّل حضورك (+${place.p || 20} نقطة)`}
          </span>
        </button>

        {checkinMsg && (
          <p className="text-xs font-bold text-teal2-600 dark:text-teal2-400 text-center pt-1">
            {checkinMsg}
          </p>
        )}
      </div>

      {/* 6. Transit & Route Guide (أروح إزاي بالمواصلات؟) */}
      <div
        id="route-section"
        className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] shadow-xs text-right space-y-4"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 grid place-items-center shrink-0">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-black text-sm sm:text-base text-ocean-950 dark:text-white">
              أروح إزاي بالمواصلات؟
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              دليل خطوط المينى باص من السكن والجامعات إلى {place.n}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
            اختر نقطة الانطلاق:
          </label>
          <select
            value={fromStop}
            onChange={(e) => setFromStop(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 dark:border-[#203042] bg-slate-50 dark:bg-[#0f1a28] px-3.5 py-2.5 text-xs sm:text-sm font-bold text-ocean-950 dark:text-white outline-none focus:border-blue-600 cursor-pointer"
          >
            <option value="المعدية / السكن الجامعي">المعدية / السكن الجامعي (بورفؤاد)</option>
            <option value="قصر الثقافة">قصر الثقافة (المحافظة والشرق)</option>
            <option value="حي العرب">حي العرب (التجاري والأسواق)</option>
            <option value="كلية الطب والعلاج الطبيعي">كلية الطب والعلاج الطبيعي</option>
          </select>
        </div>

        {routePlan && routePlan.length > 0 ? (
          <ol className="space-y-3 relative pt-1">
            {routePlan.map((step, idx) => (
              <li key={idx} className="flex gap-3 text-xs sm:text-sm">
                <span className="w-6 h-6 shrink-0 rounded-lg bg-ocean-900 text-white grid place-items-center font-black text-xs shadow-xs">
                  {idx + 1}
                </span>
                <div className="space-y-0.5">
                  <p className="font-black text-ocean-950 dark:text-white">
                    اركب خط{' '}
                    <span className="bg-blue-600 text-white px-2 py-0.5 rounded-lg text-xs font-black">
                      {step.l}
                    </span>
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    من <span className="font-bold">{step.f}</span> وانزل عند{' '}
                    <span className="font-bold text-blue-600 dark:text-blue-400">{step.t}</span>
                  </p>
                </div>
              </li>
            ))}
            <p className="text-xs text-slate-500 dark:text-slate-400 pt-2 font-medium border-t border-slate-100 dark:border-[#152332]">
              💡 بعد النزول عند «{targetStop}»، يمكنك السير لدقائق قليلة أو أخذ تاكسي داخلي مباشرة للمكان.
            </p>
          </ol>
        ) : (
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            المكان قريب منك جداً، يمكنك السير على الأقدام أو أخذ تاكسي مباشر.
          </p>
        )}
      </div>

      {/* 7. Community Reviews & Rating Form */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] shadow-xs text-right space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-black text-ocean-950 dark:text-white flex items-center gap-1.5">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span>تقييمات الزوار</span>
            </h3>
            {avgRating && (
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/50">
                {avgRating} من 5
              </span>
            )}
          </div>

          <span className="text-xs text-slate-500 font-bold">
            {reviews.length} تقييم مسجل
          </span>
        </div>

        {/* Add Review Form */}
        <form
          onSubmit={handleAddReview}
          className="rounded-2xl border border-slate-200 dark:border-[#1d2d3e] bg-slate-50 dark:bg-[#121f2f] p-4 space-y-3"
        >
          <p className="text-xs sm:text-sm font-bold text-ocean-950 dark:text-white">
            شاركنا رأيك وتجربتك في هذا المكان:
          </p>

          <div className="flex gap-1.5 text-2xl" dir="ltr">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(null)}
                onClick={() => setUserRating(star)}
                className="transition-transform hover:scale-110 cursor-pointer"
              >
                <Star
                  className={`w-5 h-5 ${
                    star <= (hoverRating ?? userRating)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-300 dark:text-slate-600'
                  }`}
                />
              </button>
            ))}
          </div>

          <textarea
            rows={2}
            maxLength={300}
            placeholder="اكتب تعليقك وتجربتك هنا..."
            value={userComment}
            onChange={(e) => setUserComment(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-[#203042] bg-white dark:bg-[#0c1622] p-2.5 text-xs sm:text-sm font-medium outline-none focus:border-blue-600"
          />

          {reviewMsg && (
            <p className="text-xs font-bold text-teal2-600 dark:text-teal2-400">
              {reviewMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={reviewSubmitting}
            className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>نشر التقييم</span>
          </button>
        </form>

        {/* Reviews List */}
        <div className="space-y-2.5 pt-1">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="p-3 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-[#121f2f]/70 border border-slate-200/80 dark:border-[#1d2d3e] space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-black text-xs sm:text-sm flex items-center gap-1 text-ocean-950 dark:text-white">
                  <span>{r.n}</span>
                  {r.v && <CheckCircle className="w-3.5 h-3.5 text-sky-500 fill-sky-500" />}
                  {r.mine && (
                    <span className="text-[10px] rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-2 py-0.5 font-bold">
                      تقييمك
                    </span>
                  )}
                </p>

                <div className="flex gap-0.5 text-xs">
                  {Array.from({ length: r.r }).map((_, si) => (
                    <Star key={si} className="w-3 h-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>

              {r.c && (
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                  {r.c}
                </p>
              )}

              <p className="text-[10px] text-slate-400 font-semibold">
                {r.d}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
