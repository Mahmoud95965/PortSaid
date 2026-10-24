'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlanResult, PlanStop } from '@/lib/plannerUtils';
import {
  Clock,
  MapPin,
  Compass,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Share2,
  Bookmark,
  Check,
  Send,
  ExternalLink,
  DollarSign,
  AlertCircle,
  Car,
  Footprints,
  Bus,
  Tag,
} from 'lucide-react';

interface ItineraryTimelineProps {
  plan: PlanResult;
  onRemoveStop: (order: number) => void;
  onMoveStop: (fromIndex: number, toIndex: number) => void;
  onSelectStopOnMap: (order: number) => void;
  onRefinePlan: (instruction: string) => void;
  onSavePlan: () => void;
  isSaved?: boolean;
  onViewPlaceDetails?: (placeId: string) => void;
  loadingRefine?: boolean;
}

export const ItineraryTimeline: React.FC<ItineraryTimelineProps> = ({
  plan,
  onRemoveStop,
  onMoveStop,
  onSelectStopOnMap,
  onRefinePlan,
  onSavePlan,
  isSaved,
  onViewPlaceDetails,
  loadingRefine,
}) => {
  const [refineInput, setRefineInput] = useState('');
  const [copiedShare, setCopiedShare] = useState(false);

  const handleShare = () => {
    try {
      const summaryText =
        `🌊 خطة خروجة في بورسعيد (${plan.title}):\n` +
        plan.stops
          .map(
            (s, i) =>
              `${i + 1}. ${s.name} (${s.arrivalTime}) - ${s.totalCost > 0 ? s.totalCost + ' ج.م' : 'مجانًا'}`
          )
          .join('\n') +
        `\n\nالميزانية المقدرة: ${plan.totalCost} ج.م من أصل ${plan.budgetEgp} ج.م.\n` +
        `المسافة الإجمالية: ${plan.totalDistanceKm} كم.\n` +
        `تم التخطيط عبر Port Said Hub ⚓\n` +
        window.location.href;

      navigator.clipboard.writeText(summaryText);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } catch (e) {}
  };

  const handleSendRefine = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!refineInput.trim() || loadingRefine) return;
    onRefinePlan(refineInput.trim());
    setRefineInput('');
  };

  const budgetRatio = Math.min(100, Math.round((plan.totalCost / plan.budgetEgp) * 100));

  return (
    <div className="space-y-4">
      {/* 1. Trip Header Summary Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-ocean-950 via-ocean-900 to-teal2-800 text-white shadow-xl border border-white/10 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-teal2-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {plan.totalDurationHours} ساعات معتمدة
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-sand-200">
                {plan.partySize} {plan.partySize === 1 ? 'فرد' : 'أفراد'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                {plan.stops.length} محطات
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white mt-1.5 leading-snug">
              {plan.title}
            </h2>
          </div>

          {/* Action Buttons: Save & Share */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              onClick={onSavePlan}
              type="button"
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm ${
                isSaved
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white/15 hover:bg-white/25 text-white'
              }`}
            >
              {isSaved ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              <span>{isSaved ? 'تم الحفظ' : 'حفظ الخطة'}</span>
            </button>

            <button
              onClick={handleShare}
              type="button"
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-ocean-950 font-black text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
              title="مشاركة الخطة"
            >
              {copiedShare ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedShare ? 'تم النسخ!' : 'مشاركة'}</span>
            </button>
          </div>
        </div>

        {/* AI Friendly Summary */}
        <p className="text-xs text-sand-100/90 font-medium mt-3 leading-relaxed border-t border-white/10 pt-2.5">
          {plan.summary}
        </p>

        {/* Statistics Bar: Budget, Travel Time, Distance */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10 text-center">
          <div className="p-2 rounded-2xl bg-white/10">
            <span className="text-[10px] text-sand-300 font-bold block">التكلفة الإجمالية</span>
            <span className="text-sm font-black text-amber-300">
              {plan.totalCost} ج.م
            </span>
            <span className="text-[9px] text-white/60 block">من {plan.budgetEgp} ج.م</span>
          </div>

          <div className="p-2 rounded-2xl bg-white/10">
            <span className="text-[10px] text-sand-300 font-bold block">المسافة الفعلية</span>
            <span className="text-sm font-black text-white">
              {plan.totalDistanceKm} كم
            </span>
            <span className="text-[9px] text-emerald-300 block">
              {plan.isRealStreetRoute ? 'طرق وشوارع حقيقية' : 'خط مباشر'}
            </span>
          </div>

          <div className="p-2 rounded-2xl bg-white/10">
            <span className="text-[10px] text-sand-300 font-bold block">وقت الانتقال</span>
            <span className="text-sm font-black text-white">
              ~{plan.totalTravelMinutes} دقيقة
            </span>
            <span className="text-[9px] text-white/60 block">
              {plan.transportMode === 'walking' ? 'مشياً على الأقدام' : 'بالسيارة / تاكسي'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Timeline of Stops */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black text-ocean-900 dark:text-white flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-teal2-600" />
            <span>محطات الرحلة بالترتيب الزمني:</span>
          </span>
          <span className="text-[11px] font-bold text-ocean-700/70 dark:text-white/60">
            من {plan.startTime} إلى {plan.endTime}
          </span>
        </div>

        <div className="space-y-2.5">
          {plan.stops.map((stop, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === plan.stops.length - 1;

            const categoryBg =
              stop.category === 'food'
                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                : stop.category === 'cafe'
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                : stop.category === 'sweets'
                ? 'bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/30'
                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';

            return (
              <div key={stop.order} className="relative">
                {/* Connecting Transit Leg Banner from previous stop */}
                {stop.travelFromPrevious && (
                  <div className="my-1.5 mr-6 pr-4 border-r-2 border-dashed border-teal2-400 dark:border-teal2-600 flex items-center gap-2 text-[10px] font-bold text-ocean-700/80 dark:text-white/60">
                    <span className="p-1 rounded-lg bg-sand-200 dark:bg-[#142334] text-teal2-700 dark:text-teal2-400">
                      {plan.transportMode === 'walking' ? (
                        <Footprints className="w-3 h-3" />
                      ) : (
                        <Car className="w-3 h-3" />
                      )}
                    </span>
                    <span>
                      انتقال: {stop.travelFromPrevious.durationMinutes} دقيقة •{' '}
                      {stop.travelFromPrevious.distanceKm} كم بالشوارع
                    </span>
                  </div>
                )}

                {/* Stop Card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-[#0c1622] border border-sand-300 dark:border-[#1d2d3e] shadow-md hover:border-teal2-500/40 transition space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      {/* Step Number Circle */}
                      <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-2xl bg-ocean-900 text-sand-300 font-black text-xs sm:text-sm grid place-items-center shrink-0 shadow-sm mt-0.5">
                        {stop.order}
                      </span>

                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${categoryBg}`}
                          >
                            {stop.categoryLabel}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sand-100 dark:bg-[#152332] text-ocean-800 dark:text-white/70">
                            {stop.area}
                          </span>
                          {stop.hasDiscount && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-ocean-950 flex items-center gap-1">
                              <Tag className="w-2.5 h-2.5" />
                              <span>خصم {stop.discountPercent}%</span>
                            </span>
                          )}
                        </div>

                        <h3 className="font-black text-sm sm:text-base text-ocean-950 dark:text-white mt-1">
                          {stop.name}
                        </h3>
                      </div>
                    </div>

                    {/* Quick Move / Remove Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {!isFirst && (
                        <button
                          onClick={() => onMoveStop(idx, idx - 1)}
                          type="button"
                          title="تقديم الترتيب"
                          className="w-7 h-7 rounded-xl bg-sand-100 dark:bg-[#162738] hover:bg-sand-200 text-ocean-800 dark:text-white grid place-items-center transition text-xs"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!isLast && (
                        <button
                          onClick={() => onMoveStop(idx, idx + 1)}
                          type="button"
                          title="تأخير الترتيب"
                          className="w-7 h-7 rounded-xl bg-sand-100 dark:bg-[#162738] hover:bg-sand-200 text-ocean-800 dark:text-white grid place-items-center transition text-xs"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onRemoveStop(stop.order)}
                        type="button"
                        title="حذف هذه المحطة من الخطة"
                        className="w-7 h-7 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 grid place-items-center transition text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Arrival, Duration, Cost Info */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-2xl bg-sand-50/80 dark:bg-[#121f2f] text-[11px] font-semibold text-ocean-850 dark:text-white/80">
                    <div>
                      <span className="text-ocean-700/60 dark:text-white/50 block text-[10px]">
                        وقت التواجد:
                      </span>
                      <span>
                        {stop.arrivalTime} - {stop.departureTime}
                      </span>
                    </div>

                    <div>
                      <span className="text-ocean-700/60 dark:text-white/50 block text-[10px]">
                        مدة الزيارة:
                      </span>
                      <span>{stop.stayDurationMinutes} دقيقة</span>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-ocean-700/60 dark:text-white/50 block text-[10px]">
                        التكلفة التقديرية:
                      </span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">
                        {stop.totalCost > 0
                          ? `${stop.totalCost} ج.م (${stop.estimatedCostPerPerson} ج.م/فرد)`
                          : 'مجاني 100%'}
                      </span>
                    </div>
                  </div>

                  {/* Why this place was chosen */}
                  <div className="text-xs text-ocean-700/80 dark:text-white/70 font-normal leading-relaxed">
                    <strong className="text-ocean-950 dark:text-white font-bold">
                      لماذا هذا المكان؟{' '}
                    </strong>
                    {stop.reason}
                  </div>

                  {/* Card Bottom Links */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      onClick={() => onSelectStopOnMap(idx)}
                      type="button"
                      className="inline-flex items-center gap-1 text-teal2-700 dark:text-teal2-400 hover:underline font-bold text-[11px]"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>معاينة وتكبير على الخريطة 🗺️</span>
                    </button>

                    {onViewPlaceDetails && stop.placeId && (
                      <button
                        onClick={() => onViewPlaceDetails(stop.placeId)}
                        type="button"
                        className="inline-flex items-center gap-1 text-ocean-700 dark:text-sand-300 hover:underline font-semibold text-[11px]"
                      >
                        <span>تفاصيل المكان</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Conversational Refinement Chat Bar */}
      <div className="p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-[#0c1622] border border-sand-300 dark:border-[#1d2d3e] shadow-md space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-black text-ocean-900 dark:text-white">
          <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
          <span>تعديل الخطة بالمحادثة الذكية:</span>
        </div>

        <p className="text-[11px] text-ocean-700/70 dark:text-white/60">
          يمكنك كتابة طلب تعديل مثل: «احذف الكافيه»، «بدل كاستن بسوق السمك»، «عايز أزود كاساتا سيلفر»، «خلي الميزانية 800 ج.م».
        </p>

        <form onSubmit={handleSendRefine} className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={refineInput}
            onChange={(e) => setRefineInput(e.target.value)}
            placeholder="اكتب تعديلك على الخطة هنا..."
            className="flex-1 rounded-2xl border border-sand-300 dark:border-[#22354a] bg-sand-50/80 dark:bg-[#132030] px-4 py-2.5 text-xs sm:text-sm text-ocean-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />

          <button
            disabled={!refineInput.trim() || loadingRefine}
            type="submit"
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 text-white font-black text-xs shadow hover:opacity-95 transition disabled:opacity-50 flex items-center gap-1.5 shrink-0"
          >
            {loadingRefine ? (
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>تعديل</span>
          </button>
        </form>
      </div>
    </div>
  );
};
