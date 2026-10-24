'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Place, Review } from '@/types';
import { CATS, AREA_STOP, HOME_STOP, planRoute } from '@/lib/constants';
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
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PlaceDetailProps {
  place: Place;
  onBack: () => void;
  onRequestCoupon: (place: Place) => void;
}

export const PlaceDetail: React.FC<PlaceDetailProps> = ({ place, onBack, onRequestCoupon }) => {
  const { user, recordVisit } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fromStop, setFromStop] = useState(HOME_STOP);
  const [visited, setVisited] = useState(!!place.visited);
  const [checkinMsg, setCheckinMsg] = useState('');
  const [checkinLoading, setCheckinLoading] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([
    {
      id: '1',
      n: 'محمود السيد',
      r: 5,
      c: 'مكان رائع جداً وخدمة ممتازة، أنصح بزيارته!',
      d: '2026-10-15',
      mine: false,
      v: true,
    },
    {
      id: '2',
      n: 'سارة إبراهيم',
      r: 4,
      c: 'الأكل طازة والفيو يجنن على القناة.',
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

  // Calculate route instructions
  const normArea = place.a.replace(/^\s*حي\s+/, '').trim();
  const targetStop = AREA_STOP[normArea] || 'حي العرب';
  const routePlan = planRoute(fromStop, targetStop);

  // Distance calculator
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
      className="space-y-5 max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Back button */}
      <motion.button
        onClick={onBack}
        type="button"
        className="inline-flex items-center gap-2 font-bold text-ocean-700 dark:text-teal2-400 hover:text-teal2-600 transition group"
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.95 }}
      >
        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        <span>رجوع للقائمة</span>
      </motion.button>

      {/* Main Place Card */}
      <motion.div
        className="bg-white dark:bg-[#0f1a28] rounded-3xl shadow-xl p-5 sm:p-8 border border-sand-200/80 dark:border-[#1d2d3e] relative overflow-hidden"
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {/* Glow corner */}
        <div
          className="absolute -top-24 -left-24 w-52 h-52 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: cat.border }}
        />

        <div className="flex items-center justify-between gap-3 mb-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black shadow-sm"
            style={{ backgroundColor: cat.bgSoft, color: cat.border }}
          >
            <span>{cat.t}</span>
          </span>

          {avgRating && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sand-100 dark:bg-[#1a293b] text-xs font-black text-ocean-900 dark:text-sand-300 border border-sand-200 dark:border-[#22364c]">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{avgRating}</span>
              <span className="text-[10px] text-ocean-700/60 dark:text-white/50">({reviews.length})</span>
            </span>
          )}
        </div>

        <h2 className="mt-2 text-2xl sm:text-3xl font-black text-ocean-900 dark:text-white leading-tight">
          {place.n}
        </h2>

        <p className="text-ocean-700/80 dark:text-ocean-100/70 text-xs sm:text-sm mt-1 font-semibold flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-coral-500 shrink-0" />
          <span>بورسعيد · {place.a}</span>
        </p>

        {place.ds && (
          <p className="mt-4 text-sm sm:text-base text-ocean-800 dark:text-white/90 leading-relaxed font-medium">
            {place.ds}
          </p>
        )}

        {/* Action Buttons: Maps & Route */}
        <div className="mt-6 grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
          <motion.a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.n + ' بورسعيد')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl bg-gradient-to-b from-[#ffd27a] to-[#ffb938] text-ocean-900 font-black text-center py-3.5 hover:shadow-lg transition flex items-center justify-center gap-2 text-sm shadow-md shadow-amber-500/20"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <MapPin className="w-4 h-4 text-ocean-900" />
            <span>اعرض على الخريطة</span>
          </motion.a>
          <motion.button
            onClick={() => {
              const el = document.getElementById('route-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            type="button"
            className="rounded-2xl border-2 border-ocean-900 dark:border-teal2-400 text-ocean-900 dark:text-teal2-400 font-black text-center py-3.5 hover:bg-ocean-900 hover:text-white dark:hover:bg-teal2-400 dark:hover:text-ocean-900 transition flex items-center justify-center gap-2 text-sm"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Navigation className="w-4 h-4" />
            <span>أروح إزاي بالمواصلات؟</span>
          </motion.button>
        </div>

        {/* Google Maps Photos Link for Food/Cafe */}
        {(place.cat === 'food' || place.cat === 'cafe' || place.cat === 'sweets') && (
          <motion.a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.n + ' بورسعيد')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-sand-50 dark:bg-[#152335] border border-sand-200 dark:border-[#22364c] text-ocean-900 dark:text-white font-bold py-2.5 text-xs hover:bg-sand-100 dark:hover:bg-[#1a2d44] transition"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <ExternalLink className="w-4 h-4 text-teal2-600 dark:text-teal2-400" />
            <span>صور وآراء الزوار على خرائط جوجل</span>
          </motion.a>
        )}

        {/* Checkin / Visit Section (Fun Category) */}
        {place.cat === 'fun' && (
          <motion.div
            className="mt-6 rounded-2xl border border-sand-200 dark:border-[#1d2d3e] bg-sand-50/80 dark:bg-[#121e2d] p-4 sm:p-5"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <p className="font-black text-base text-ocean-900 dark:text-white">
                زيارة المكان ونقاط المكافآت
              </p>
            </div>
            <p className="text-xs text-ocean-700/80 dark:text-white/70 mb-3 leading-relaxed">
              صوّر لقطة من المكان، والنقاط ({place.p || 20} نقطة) بتتحسب فوراً لما نتأكد من موقعك بـ GPS.
            </p>
            <motion.button
              onClick={handleCameraCheckin}
              disabled={visited || checkinLoading}
              type="button"
              className="w-full rounded-2xl bg-gradient-to-b from-[#ffd27a] to-[#ffb938] hover:from-[#ffe3a8] text-ocean-900 font-black py-3 text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              whileHover={!visited ? { scale: 1.02, y: -2 } : {}}
              whileTap={!visited ? { scale: 0.98 } : {}}
            >
              {checkinLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-ocean-900" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              <span>
                {visited
                  ? 'تم تسجيل زيارتك بنجاح ✓'
                  : checkinLoading
                  ? 'جارٍ التحقق من موقعك...'
                  : `صوّر وسجّل زيارتك (+${place.p || 20} نقطة)`}
              </span>
            </motion.button>
            {checkinMsg && (
              <motion.p
                className="text-xs font-bold text-teal2-600 dark:text-teal2-400 mt-2 text-center"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {checkinMsg}
              </motion.p>
            )}
          </motion.div>
        )}

        {/* Coupon Section (Non-Housing) */}
        {place.cat !== 'housing' && place.disc > 0 && (
          <motion.div
            className="mt-6 rounded-2xl border border-teal2-400/50 bg-gradient-to-br from-teal2-50/80 via-teal2-50/40 to-white dark:from-teal2-950/40 dark:to-[#0f1a28] p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
          >
            <div>
              <span className="inline-block rounded-full bg-teal2-600 text-white text-[10px] font-bold px-2 py-0.5 mb-1">
                عرض خاص
              </span>
              <p className="font-black text-base text-teal2-800 dark:text-teal2-300">
                خصم {place.disc}% متاح لعملاء Port Said Hub
              </p>
              <p className="text-xs text-ocean-700/80 dark:text-white/70 mt-0.5">
                استبدل {place.cost || 50} نقطة بكود خصم QR صالح للاستخدام فوراً.
              </p>
            </div>
            <motion.button
              onClick={() => onRequestCoupon(place)}
              type="button"
              className="px-5 py-3 rounded-2xl bg-teal2-600 hover:bg-teal2-500 text-white font-black text-sm shadow-lg shadow-teal2-600/30 transition flex items-center gap-2"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <QrCode className="w-4 h-4" />
              <span>اطلب كوبون</span>
            </motion.button>
          </motion.div>
        )}

        {/* Transit Route Section */}
        <div
          id="route-section"
          className="mt-6 rounded-2xl border border-sand-200 dark:border-[#1d2d3e] bg-sand-50/80 dark:bg-[#121e2d] p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Navigation className="w-4 h-4 text-teal2-600 dark:text-teal2-400" />
            <p className="font-black text-teal2-700 dark:text-teal2-400 text-base">
              أروح إزاي بالمواصلات؟
            </p>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-bold text-ocean-700 dark:text-white/80 mb-1.5">
              نقطة الانطلاق:
            </label>
            <select
              value={fromStop}
              onChange={(e) => setFromStop(e.target.value)}
              className="w-full rounded-2xl border border-sand-200 dark:border-[#203042] bg-white dark:bg-[#0f1a28] px-3.5 py-2.5 text-sm font-bold text-ocean-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal2-500"
            >
              <option value="المعدية / السكن الجامعي">المعدية / السكن الجامعي</option>
              <option value="قصر الثقافة">قصر الثقافة</option>
              <option value="حي العرب">حي العرب</option>
              <option value="كلية الطب والعلاج الطبيعي">كلية الطب والعلاج الطبيعي</option>
            </select>
          </div>

          {routePlan && routePlan.length > 0 ? (
            <ol className="space-y-3 relative">
              {routePlan.map((step, idx) => (
                <li key={idx} className="flex gap-3 text-sm">
                  <span className="w-7 h-7 shrink-0 rounded-xl bg-teal2-600 text-white grid place-items-center font-black text-xs shadow-sm">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-black text-ocean-900 dark:text-white">
                      اركب خط{' '}
                      <span className="bg-ocean-900 text-sand-300 px-2 py-0.5 rounded-lg text-xs font-black">
                        {step.l}
                      </span>
                    </p>
                    <p className="text-xs text-ocean-700/80 dark:text-white/70 mt-0.5 font-medium">
                      من <span className="font-bold">{step.f}</span> وانزل عند{' '}
                      <span className="font-bold text-teal2-600 dark:text-teal2-400">{step.t}</span>
                    </p>
                  </div>
                </li>
              ))}
              <p className="text-xs text-ocean-700/70 dark:text-white/60 pt-2 font-medium">
                وبعد النزول عند «{targetStop}» كمّل مشي أو تاكسي لحد المكان.
              </p>
            </ol>
          ) : (
            <p className="text-xs text-ocean-700/80 dark:text-white/70">
              المكان قريب منك أو يمكنك ركوب تاكسي مباشر.
            </p>
          )}
        </div>

        {/* Reviews Section */}
        <div className="mt-8 border-t border-sand-200 dark:border-[#1d2d3e] pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-ocean-900 dark:text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-sand-400 fill-sand-400" />
              <span>التقييمات والآراء</span>
            </h3>
            {avgRating && (
              <span className="text-sm font-black text-teal2-600 dark:text-teal2-400">
                {avgRating} من 5 ({reviews.length} تقييم)
              </span>
            )}
          </div>

          {/* Add Review Box */}
          <form
            onSubmit={handleAddReview}
            className="rounded-2xl border border-sand-200 dark:border-[#1d2d3e] bg-sand-50/70 dark:bg-[#121e2d] p-4 sm:p-5 mb-5"
          >
            <p className="text-sm font-black text-ocean-900 dark:text-white mb-2">
              شاركنا رأيك وتجربتك
            </p>

            {/* Interactive Animated Stars */}
            <div className="flex gap-1.5 text-2xl mb-3" dir="ltr">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  onClick={() => setUserRating(star)}
                  className="transition-colors cursor-pointer"
                  whileHover={{ scale: 1.25, rotate: 10 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= (hoverRating ?? userRating)
                        ? 'text-sand-400 fill-sand-400'
                        : 'text-sand-200 dark:text-[#253548]'
                    }`}
                  />
                </motion.button>
              ))}
            </div>

            <textarea
              rows={2}
              maxLength={300}
              placeholder="اكتب تعليقك وتجربتك هنا (اختياري)..."
              value={userComment}
              onChange={(e) => setUserComment(e.target.value)}
              className="w-full rounded-2xl border border-sand-200 dark:border-[#203042] bg-white dark:bg-[#0f1a28] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal2-500 font-medium"
            />
            {reviewMsg && (
              <motion.p
                className="text-xs font-bold text-teal2-600 dark:text-teal2-400 mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {reviewMsg}
              </motion.p>
            )}
            <motion.button
              type="submit"
              disabled={reviewSubmitting}
              className="mt-3 w-full py-3 rounded-2xl bg-teal2-600 hover:bg-teal2-500 text-white font-black text-sm shadow-md transition flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Send className="w-4 h-4" />
              <span>نشر التقييم</span>
            </motion.button>
          </form>

          {/* Reviews List */}
          <div className="space-y-3">
            <AnimatePresence>
              {reviews.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl bg-white dark:bg-[#121c29] border border-sand-200/80 dark:border-[#1d2d3e] p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-extrabold text-sm flex items-center gap-1.5 text-ocean-900 dark:text-white">
                      <span>{r.n}</span>
                      {r.v && <CheckCircle className="w-3.5 h-3.5 text-sky-500 fill-sky-500" />}
                      {r.mine && (
                        <span className="text-[10px] rounded-full bg-teal2-100 dark:bg-teal2-900/40 text-teal2-600 dark:text-teal2-400 px-2 py-0.5 font-bold">
                          تقييمك
                        </span>
                      )}
                    </p>
                    <div className="flex gap-0.5 text-xs text-sand-400">
                      {Array.from({ length: r.r }).map((_, si) => (
                        <Star key={si} className="w-3 h-3 fill-sand-400 text-sand-400" />
                      ))}
                    </div>
                  </div>
                  {r.c && (
                    <p className="mt-2 text-xs sm:text-sm text-ocean-800 dark:text-white/85 leading-relaxed font-medium">
                      {r.c}
                    </p>
                  )}
                  <p className="mt-1.5 text-[10px] text-ocean-700/60 dark:text-white/40 font-semibold">
                    {r.d}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
