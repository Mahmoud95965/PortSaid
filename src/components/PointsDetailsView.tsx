'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowRight,
  Star,
  Sparkles,
  Ticket,
  MapPin,
  Clock,
  History,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Gift,
  Flame,
  Award,
  QrCode,
  Loader2,
} from 'lucide-react';
import { INITIAL_PLACES } from '@/lib/constants';

interface PointsDetailsViewProps {
  onBack: () => void;
  onSelectPlace?: (placeId: string) => void;
  onOpenCouponModal?: (place: any) => void;
}

interface LedgerItem {
  id: number;
  delta: number;
  balance_after: number;
  reason: string;
  ref_type?: string;
  ref_id?: string;
  created_at: string;
}

export const PointsDetailsView: React.FC<PointsDetailsViewProps> = ({
  onBack,
  onSelectPlace,
  onOpenCouponModal,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'how_to_use' | 'how_to_earn' | 'history' | 'faq'>('how_to_use');
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<{ message: string; code: string } | null>(null);

  const points = user?.points || 0;

  // Membership Tier Calculation
  const getTier = (pts: number) => {
    if (pts >= 500) return { name: 'سفير بورسعيد المتميز', icon: '👑', color: 'from-amber-400 to-yellow-500', next: 1000, target: 1000 };
    if (pts >= 250) return { name: 'خبير بورسعيد', icon: '🥇', color: 'from-amber-300 to-amber-500', next: 500, target: 500 };
    if (pts >= 100) return { name: 'مستكشف نشط', icon: '🥈', color: 'from-teal2-400 to-teal2-600', next: 250, target: 250 };
    return { name: 'مستكشف جديد', icon: '🥉', color: 'from-ocean-400 to-ocean-600', next: 100, target: 100 };
  };

  const tier = getTier(points);
  const tierProgress = Math.min(100, Math.round((points / tier.target) * 100));

  // Load actual ledger history
  useEffect(() => {
    async function fetchLedger() {
      setLoadingLedger(true);
      try {
        const res = await fetch('/api/rewards/ledger');
        const data = await res.json();
        if (data.ok && Array.isArray(data.ledger)) {
          setLedger(data.ledger);
        }
      } catch (err) {
        console.warn('Failed to load ledger:', err);
      } finally {
        setLoadingLedger(false);
      }
    }
    fetchLedger();
  }, [points]);

  // Places with coupons available for points redemption
  const couponPlaces = INITIAL_PLACES.filter((p) => p.cost > 0 && p.disc > 0);

  const handleRedeemClick = async (place: any) => {
    if (points < place.cost) {
      alert(`رصيد نقاطك (${points}) لا يكفي لاستبدال هذا الكوبون (${place.cost} نقطة).`);
      return;
    }

    setRedeemingId(place.id);
    try {
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId: place.id,
          pointsCost: place.cost,
          placeName: place.n,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setRedeemSuccess({ message: data.message, code: data.couponCode });
      } else {
        alert(data.message || 'فشل استبدال الكوبون.');
      }
    } catch (e) {
      alert('حدث خطأ في الاتصال بالخادم.');
    } finally {
      setRedeemingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 pop-in">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-[#121c28] p-4 rounded-3xl border border-sand-200/80 dark:border-[#1d2d3e] shadow-sm">
        <button
          onClick={onBack}
          type="button"
          className="flex items-center gap-2 text-ocean-900 dark:text-white font-bold text-xs sm:text-sm hover:text-teal2-600 transition"
        >
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-teal2-600" />
          <span>العودة للرئيسية</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-teal2-500 animate-pulse" />
          <span className="text-xs font-bold text-ocean-700/70 dark:text-white/60">نظام Hubs Rewards المعتمد</span>
        </div>
      </div>

      {/* Main Points Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl waves-pattern border border-white/20"
      >
        <div className="absolute top-0 right-0 w-72 h-72 bg-sand-400/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-sand-300 text-xs font-black">
              <span>{tier.icon}</span>
              <span>{tier.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black">
              رصيدك الحالي: <span className="text-sand-300 font-extrabold">{points}</span> نقطة
            </h1>
            <p className="text-xs sm:text-sm text-white/85 max-w-md">
              النقاط في Port Said Hub هي رصيدك الحقيقي للحصول على خصومات حصرية وكوبونات في أشهر مطاعم وكافيهات ومعالم بورسعيد.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-[#ffe7b3] via-[#ffb938] to-[#f59e0b] text-ocean-900 grid place-items-center shadow-xl shadow-amber-500/30 border-4 border-white/40">
              <Star className="w-10 h-10 sm:w-12 sm:h-12 fill-current" />
            </div>
            <div className="text-center">
              <span className="text-[11px] font-bold text-white/80">المستوى القادم: {tier.target} نقطة</span>
              <div className="w-32 sm:w-40 h-2 bg-white/20 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-gradient-to-r from-sand-300 to-sand-400 transition-all duration-500"
                  style={{ width: `${tierProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Navigation Sub-Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'how_to_use', label: 'إزاي تستخدم نقاطك؟', icon: Ticket },
          { key: 'how_to_earn', label: 'إزاي تكسب نقاط حقيقية؟', icon: Sparkles },
          { key: 'history', label: 'سجل حركات النقاط', icon: History },
          { key: 'faq', label: 'الأسئلة الشائعة والقواعد', icon: HelpCircle },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              type="button"
              className={`px-4 sm:px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition flex items-center gap-2 border ${
                active
                  ? 'bg-ocean-900 dark:bg-teal2-600 text-white border-ocean-900 dark:border-teal2-600 shadow-md'
                  : 'bg-white dark:bg-[#121c28] text-ocean-900 dark:text-white border-sand-200/80 dark:border-[#1d2d3e] hover:bg-sand-50 dark:hover:bg-[#182535]'
              }`}
            >
              <Icon className="w-4 h-4 text-sand-400" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: How to USE Points (استخدام النقاط في الخصومات) */}
      {activeTab === 'how_to_use' && (
        <div className="space-y-6 pop-in">
          {/* Explanation Banner */}
          <div className="rounded-3xl bg-gradient-to-br from-teal2-50 to-sand-50 dark:from-[#0d1e2e] dark:to-[#121c28] p-5 sm:p-6 border border-teal2-200/60 dark:border-teal2-900/40">
            <h3 className="font-black text-base sm:text-lg text-ocean-900 dark:text-white flex items-center gap-2">
              <Ticket className="w-5 h-5 text-teal2-600" />
              <span>استبدل نقاطك بكوبونات خصم فورية بنظام QR Code</span>
            </h3>
            <p className="text-xs sm:text-sm text-ocean-700/80 dark:text-white/70 mt-2 leading-relaxed">
              كل نقطة تجمعها لها قيمة حقيقية في بورسعيد! اختر المكان الذي ترغب في زيارته، واستبدل نقاطك بكود خصم فوري يظهر لك على الشاشة، ثم أظهره للكاشير عند المحاسبة للحصول على الخصم فورًا.
            </p>
          </div>

          {/* Success Coupon Alert Modal */}
          {redeemSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-5 rounded-3xl bg-teal2-500 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-white shrink-0" />
                <div>
                  <h4 className="font-black text-base">مبروك! تم استخراج الكوبون بنجاح</h4>
                  <p className="text-xs text-white/90">{redeemSuccess.message}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/20 px-4 py-2 rounded-2xl border border-white/30">
                <span className="text-xs font-bold">كود الكوبون:</span>
                <span className="font-mono font-black text-sm text-sand-300 tracking-wider">
                  {redeemSuccess.code}
                </span>
              </div>
            </motion.div>
          )}

          {/* Available Places for Redemption */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-sm sm:text-base text-ocean-900 dark:text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-coral-500" />
                <span>أماكن تقبل استبدال النقاط الآن في بورسعيد:</span>
              </h4>
              <span className="text-xs text-ocean-700/70 dark:text-white/60 font-semibold">
                {couponPlaces.length} أماكن متاحة
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {couponPlaces.map((place) => {
                const canAfford = points >= place.cost;
                const isRedeeming = redeemingId === place.id;
                return (
                  <div
                    key={place.id}
                    className="rounded-3xl bg-white dark:bg-[#121c28] p-5 shadow-sm border border-sand-200/80 dark:border-[#1d2d3e] flex flex-col justify-between gap-4 hover:shadow-md transition"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-teal2-100 dark:bg-teal2-950/60 text-teal2-700 dark:text-teal2-400">
                          خصم {place.disc}%
                        </span>
                        <div className="flex items-center gap-1 text-xs font-black text-amber-500">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{place.cost} نقطة</span>
                        </div>
                      </div>

                      <h5 className="font-black text-base text-ocean-900 dark:text-white">{place.n}</h5>
                      <p className="text-xs text-ocean-700/70 dark:text-white/60 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-coral-500" />
                        <span>{place.a}</span>
                      </p>
                      <p className="text-xs text-ocean-800/80 dark:text-white/70 mt-2 line-clamp-2">{place.ds}</p>
                    </div>

                    <div className="pt-2 border-t border-sand-100 dark:border-[#1a2938] flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-ocean-700/60 dark:text-white/50">
                        {canAfford ? 'رصيدك كافٍ للاستبدال ✓' : `تحتاج ${place.cost - points} نقطة إضافية`}
                      </span>

                      <button
                        onClick={() => handleRedeemClick(place)}
                        disabled={!canAfford || isRedeeming}
                        type="button"
                        className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-sm ${
                          canAfford
                            ? 'bg-gradient-to-r from-teal2-600 to-ocean-800 text-white hover:opacity-95'
                            : 'bg-sand-200 dark:bg-[#1a2938] text-ocean-900/40 dark:text-white/30 cursor-not-allowed'
                        }`}
                      >
                        {isRedeeming ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <QrCode className="w-3.5 h-3.5" />
                        )}
                        <span>{isRedeeming ? 'جارٍ الاستبدال...' : 'استبدال الكوبون'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: How to EARN Points (طرق كسب النقاط الحقيقية) */}
      {activeTab === 'how_to_earn' && (
        <div className="space-y-4 pop-in">
          <div className="rounded-3xl bg-white dark:bg-[#121c28] p-6 border border-sand-200/80 dark:border-[#1d2d3e] space-y-4 shadow-sm">
            <h3 className="font-black text-lg text-ocean-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sand-400" />
              <span>كيف تكسب نقاطاً حقيقية وموثوقة؟</span>
            </h3>
            <p className="text-xs sm:text-sm text-ocean-700/80 dark:text-white/70 leading-relaxed">
              تم إلغاء النقاط العشوائية وغير المفيدة تمامًا. النقاط في تطبيقنا تُكتسب حصريًا بالنشاط الفعلي والزيارات الميدانية لمعالم وأماكن بورسعيد لدعم السياحة والأنشطة المحلية.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="rounded-2xl bg-sand-50 dark:bg-[#162433] p-4 border border-sand-200/60 dark:border-[#213347] space-y-2">
                <div className="w-10 h-10 rounded-xl bg-teal2-100 dark:bg-teal2-950/60 text-teal2-600 grid place-items-center font-black">
                  <MapPin className="w-5 h-5" />
                </div>
                <h4 className="font-black text-sm text-ocean-900 dark:text-white">1. تسجيل الزيارة الميدانية</h4>
                <p className="text-xs text-ocean-700/70 dark:text-white/60 leading-relaxed">
                  عند وصولك لأي معلم سياحي أو مطعم أو كافيه في بورسعيد، ادخل على صفحته واضغط "سجّل حضورك الآن" لتحصل على من +20 إلى +50 نقطة فورية بناءً على المكان.
                </p>
                <span className="inline-block text-[10px] font-black text-teal2-600 bg-teal2-50 dark:bg-teal2-950 px-2 py-0.5 rounded-md">
                  مرة واحدة لكل مكان يومياً
                </span>
              </div>

              <div className="rounded-2xl bg-sand-50 dark:bg-[#162433] p-4 border border-sand-200/60 dark:border-[#213347] space-y-2">
                <div className="w-10 h-10 rounded-xl bg-sand-200 dark:bg-sand-900/40 text-ocean-900 dark:text-sand-300 grid place-items-center font-black">
                  <Gift className="w-5 h-5" />
                </div>
                <h4 className="font-black text-sm text-ocean-900 dark:text-white">2. هدية الترحيب بالمدينة</h4>
                <p className="text-xs text-ocean-700/70 dark:text-white/60 leading-relaxed">
                  بمجرد إنشاء وتأكيد حسابك الجديد على Port Said Hub، نمنحك فوراً +20 نقطة ترحيبية مجانية لبدء استكشاف بورسعيد والاستفادة من العروض.
                </p>
                <span className="inline-block text-[10px] font-black text-ocean-800 dark:text-sand-300 bg-sand-200 dark:bg-sand-950 px-2 py-0.5 rounded-md">
                  +20 نقطة فورية بالحساب
                </span>
              </div>

              <div className="rounded-2xl bg-sand-50 dark:bg-[#162433] p-4 border border-sand-200/60 dark:border-[#213347] space-y-2">
                <div className="w-10 h-10 rounded-xl bg-coral-100 dark:bg-coral-950/60 text-coral-600 grid place-items-center font-black">
                  <Award className="w-5 h-5" />
                </div>
                <h4 className="font-black text-sm text-ocean-900 dark:text-white">3. تقييم الأماكن والتجارب</h4>
                <p className="text-xs text-ocean-700/70 dark:text-white/60 leading-relaxed">
                  بعد زيارتك لأي مكان، شارك تقييمك الحقيقي برأيك وعدد النجوم لمساعدة زوار المدينة والطلبة على اختيار أفضل الأماكن.
                </p>
                <span className="inline-block text-[10px] font-black text-coral-600 bg-coral-50 dark:bg-coral-950 px-2 py-0.5 rounded-md">
                  مساعدة مجتمع بورسعيد
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Ledger History (سجل حركات النقاط الحقيقي من قاعدة البيانات) */}
      {activeTab === 'history' && (
        <div className="space-y-4 pop-in">
          <div className="rounded-3xl bg-white dark:bg-[#121c28] p-6 border border-sand-200/80 dark:border-[#1d2d3e] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-base sm:text-lg text-ocean-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-teal2-600" />
                <span>سجل معاملات النقاط الخاص بحسابك</span>
              </h3>
              <span className="text-xs text-ocean-700/70 dark:text-white/60">
                {ledger.length} حركة مسجلة
              </span>
            </div>

            {loadingLedger ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-teal2-600" />
                <span className="text-xs text-ocean-700/70 dark:text-white/60">جارٍ جلب السجل من قاعدة البيانات...</span>
              </div>
            ) : ledger.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-sand-100 dark:bg-[#1a2938] mx-auto grid place-items-center text-ocean-900/40 dark:text-white/40">
                  <History className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-ocean-900 dark:text-white">لا توجد حركات نقاط سابقة حتى الآن</p>
                <p className="text-xs text-ocean-700/70 dark:text-white/60">
                  ابدأ بزيارة المعالم والأماكن في بورسعيد واضغط "سجّل حضورك" لتسجيل أولى نقاطك!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-sand-100 dark:divide-[#1d2d3e] overflow-hidden">
                {ledger.map((item) => {
                  const isPositive = item.delta > 0;
                  return (
                    <div key={item.id} className="py-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-2xl grid place-items-center shrink-0 font-black text-xs ${
                            isPositive
                              ? 'bg-teal2-100 dark:bg-teal2-950/80 text-teal2-700 dark:text-teal2-400'
                              : 'bg-coral-100 dark:bg-coral-950/80 text-coral-700 dark:text-coral-400'
                          }`}
                        >
                          {isPositive ? '+' : '-'}
                        </div>
                        <div>
                          <p className="font-bold text-xs sm:text-sm text-ocean-900 dark:text-white leading-tight">
                            {item.reason}
                          </p>
                          <p className="text-[10px] text-ocean-700/60 dark:text-white/50 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>{item.created_at ? new Date(item.created_at).toLocaleString('ar-EG') : 'الآن'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-left shrink-0">
                        <span
                          className={`font-black text-sm sm:text-base ${
                            isPositive ? 'text-teal2-600 dark:text-teal2-400' : 'text-coral-500'
                          }`}
                        >
                          {isPositive ? `+${item.delta}` : item.delta} نقطة
                        </span>
                        <p className="text-[10px] font-semibold text-ocean-700/60 dark:text-white/50">
                          الرصيد بعد: {item.balance_after}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Rules & FAQ (قواعد النظام والأسئلة الشائعة) */}
      {activeTab === 'faq' && (
        <div className="space-y-4 pop-in">
          <div className="rounded-3xl bg-white dark:bg-[#121c28] p-6 border border-sand-200/80 dark:border-[#1d2d3e] space-y-4 shadow-sm">
            <h3 className="font-black text-lg text-ocean-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal2-600" />
              <span>قواعد وشروط نظام Hubs Rewards</span>
            </h3>

            <div className="space-y-3 text-xs sm:text-sm leading-relaxed text-ocean-800 dark:text-white/80">
              <div className="p-4 rounded-2xl bg-sand-50 dark:bg-[#162433] border border-sand-200/60 dark:border-[#213347] space-y-1">
                <h5 className="font-bold text-ocean-900 dark:text-white">هل يمكن استبدال النقاط بأموال نقدية (كاش)؟</h5>
                <p className="text-ocean-700/80 dark:text-white/70 text-xs">
                  النقاط ليست عملة نقدية ولا يمكن سحبها كاش؛ إنما هي نقاط مكافآت حصرية تُستبدل بكوبونات خصم رسمية بنسبة 10% إلى 20% لدى المطاعم والمحلات الشريكة داخل محافظة بورسعيد.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-sand-50 dark:bg-[#162433] border border-sand-200/60 dark:border-[#213347] space-y-1">
                <h5 className="font-bold text-ocean-900 dark:text-white">كم عدد المرات المسموح بها لتسجيل الزيارة؟</h5>
                <p className="text-ocean-700/80 dark:text-white/70 text-xs">
                  يسمح النظام بتسجيل زيارة واحدة فقط لنفس المكان يوميًا لكل مستخدم، لضمان المصداقية ومنع التكرار الآلي.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-sand-50 dark:bg-[#162433] border border-sand-200/60 dark:border-[#213347] space-y-1">
                <h5 className="font-bold text-ocean-900 dark:text-white">كيف يتحقق الكاشير في المحل من الكوبون؟</h5>
                <p className="text-ocean-700/80 dark:text-white/70 text-xs">
                  عند استبدال الكوبون من صفحة المكان يظهر لك رمز QR وكود فريد (مثل HUB-XXXXX). تقوم بإظهار الشاشة لمسؤول الحسابات أو الكاشير في المحل لتطبيق الخصم فورًا على الفاتورة.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-sand-50 dark:bg-[#162433] border border-sand-200/60 dark:border-[#213347] space-y-1">
                <h5 className="font-bold text-ocean-900 dark:text-white">هل تنتهي صلاحية النقاط؟</h5>
                <p className="text-ocean-700/80 dark:text-white/70 text-xs">
                  النقاط تظل محفوظة بشكل دائم في قاعدة البيانات بحسابك ما دمت مسجلاً وتستخدم التطبيق، بينما الكوبونات المستبدلة تكون صالحة لمدة 30 يومًا من تاريخ استبدالها.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
