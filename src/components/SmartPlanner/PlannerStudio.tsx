'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlanResult, PlanStop } from '@/lib/plannerUtils';
import { INITIAL_PLACES } from '@/lib/constants';
import { isPointInPortSaid, identifyPortSaidDistrict } from '@/lib/geoUtils';
import { PlannerMap } from './PlannerMap';
import { ItineraryTimeline } from './ItineraryTimeline';
import { SavedTripsModal } from './SavedTripsModal';
import {
  Sparkles,
  Compass,
  Navigation,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Car,
  Footprints,
  Bus,
  Bookmark,
  Share2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sliders,
  Send,
  Info,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface PlannerStudioProps {
  initialPrompt?: string | null;
  initialPlanData?: string | null;
  onViewPlaceDetails?: (placeId: string) => void;
  onBackToHome?: () => void;
}

const SAVED_TRIPS_STORAGE = 'portsaid_hub_saved_trips_v1';

const INSPIRATION_CHIPS = [
  'خروجة لشخصين لمدة 5 ساعات بميزانية 500 جنيه، تشمل أماكن للزيارة وكافيه ومطعم',
  'أرخص خروجة سمك وفسحة للطلبة بميزانية 300 جنيه لـ 3 أفراد',
  'يوم سياحي كامل لـ 4 أفراد يشمل فنار بورسعيد وممشى ديليسبس ومطعم كاستن وكاساتا سيلفر',
  'خروجة هادئة بعد الظهر تشمل كافيه على قناة السويس وتحلية بميزانية 200 جنيه',
];

export const PlannerStudio: React.FC<PlannerStudioProps> = ({
  initialPrompt,
  initialPlanData,
  onViewPlaceDetails,
  onBackToHome,
}) => {
  // الحقول الأساسية للتخطيط
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [budgetEgp, setBudgetEgp] = useState<number>(500);
  const [durationHours, setDurationHours] = useState<number>(5);
  const [partySize, setPartySize] = useState<number>(2);
  const [transportMode, setTransportMode] = useState<'driving' | 'walking' | 'bus'>('driving');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'fun',
    'food',
    'cafe',
    'sweets',
  ]);

  // نقاط البداية والنهاية
  const [startPoint, setStartPoint] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [isRoundTrip, setIsRoundTrip] = useState(true);
  const [pickingPointFor, setPickingPointFor] = useState<'start' | 'end' | null>(null);

  // حالة الخطة الحالية
  const [currentPlan, setCurrentPlan] = useState<PlanResult | null>(null);
  const [activeStopIndex, setActiveStopIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingRefine, setLoadingRefine] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // الرحلات المحفوظة
  const [savedTrips, setSavedTrips] = useState<PlanResult[]>([]);
  const [showSavedModal, setShowSavedModal] = useState(false);

  // العرض النشط على الموبايل (جدول vs خريطة)
  const [mobileTab, setMobileTab] = useState<'itinerary' | 'map'>('itinerary');

  // 1. تحميل الرحلات المحفوظة من localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SAVED_TRIPS_STORAGE);
      if (stored) {
        setSavedTrips(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  // 2. تحميل خطة مشتركة عبر رابط مشفر (Base64) إن وجدت
  useEffect(() => {
    if (initialPlanData) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(initialPlanData))));
        if (decoded && decoded.stops) {
          setCurrentPlan(decoded);
          setPrompt(decoded.title || '');
          setBudgetEgp(decoded.budgetEgp || 500);
          setPartySize(decoded.partySize || 2);
          setDurationHours(decoded.totalDurationHours || 5);
        }
      } catch (e) {
        console.warn('Could not decode shared plan data:', e);
      }
    } else if (initialPrompt) {
      handleGeneratePlan(initialPrompt);
    }
  }, [initialPlanData, initialPrompt]);

  // حفظ الخطة الحالية
  const handleSaveCurrentPlan = () => {
    if (!currentPlan) return;
    try {
      const existing = savedTrips.filter((t) => t.id !== currentPlan.id);
      const updated = [currentPlan, ...existing];
      setSavedTrips(updated);
      localStorage.setItem(SAVED_TRIPS_STORAGE, JSON.stringify(updated));
    } catch (e) {}
  };

  const isCurrentPlanSaved = currentPlan
    ? savedTrips.some((t) => t.id === currentPlan.id)
    : false;

  // حذف رحلة محفوظة
  const handleDeleteSavedTrip = (tripId: string) => {
    const updated = savedTrips.filter((t) => t.id !== tripId);
    setSavedTrips(updated);
    try {
      localStorage.setItem(SAVED_TRIPS_STORAGE, JSON.stringify(updated));
    } catch (e) {}
  };

  // تحديد الموقع الحالي بالـ GPS كنقطة بداية
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('تحديد الموقع غير مدعوم في متصفحك.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        if (isPointInPortSaid(lat, lon)) {
          const district = identifyPortSaidDistrict(lat, lon);
          const pt = { name: `موقعي الحالي (${district})`, lat, lon };
          setStartPoint(pt);
          if (isRoundTrip) setEndPoint(pt);
          setErrorMsg(null);
        } else {
          setErrorMsg('موقعك الحالي يقع خارج حدود محافظة بورسعيد.');
        }
      },
      () => setErrorMsg('يرجى السماح بصلاحية الـ GPS لتحديد موقعك الحالي.')
    );
  };

  // طلب تخطيط رحلة جديدة من الـ API
  const handleGeneratePlan = async (queryText?: string) => {
    const textToSend = queryText || prompt.trim();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          startPoint: startPoint || undefined,
          endPoint: isRoundTrip ? (startPoint || undefined) : (endPoint || undefined),
          budgetEgp,
          durationHours,
          partySize,
          selectedCategories,
          transportMode,
          action: 'generate',
        }),
      });

      const data = await res.json();
      if (data.ok && data.plan) {
        setCurrentPlan(data.plan);
        setActiveStopIndex(0);
        // مزامنة عناصر النموذج مع النوايا المستخرجة
        if (data.intent) {
          if (data.intent.budgetEgp) setBudgetEgp(data.intent.budgetEgp);
          if (data.intent.durationHours) setDurationHours(data.intent.durationHours);
          if (data.intent.partySize) setPartySize(data.intent.partySize);
        }
      } else {
        throw new Error(data.error || 'تعذر بناء خطة الرحلة');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء التخطيط. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  // طلب تعديل الخطة بالمحادثة
  const handleRefinePlan = async (instruction: string) => {
    if (!currentPlan) return;
    setLoadingRefine(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refine',
          refineInstruction: instruction,
          currentPlan,
        }),
      });

      const data = await res.json();
      if (data.ok && data.plan) {
        setCurrentPlan(data.plan);
      } else {
        throw new Error(data.error || 'تعذر تعديل الخطة');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'تعذر تعديل الخطة بالمحادثة.');
    } finally {
      setLoadingRefine(false);
    }
  };

  // حذف محطة من الخطة الحالية
  const handleRemoveStop = (order: number) => {
    if (!currentPlan) return;
    const remainingStops = currentPlan.stops
      .filter((s) => s.order !== order)
      .map((s, idx) => ({ ...s, order: idx + 1 }));

    if (remainingStops.length === 0) {
      setCurrentPlan(null);
      return;
    }

    const newTotalCost = remainingStops.reduce((sum, s) => sum + s.totalCost, 0);

    setCurrentPlan({
      ...currentPlan,
      stops: remainingStops,
      totalCost: newTotalCost,
      budgetStatus: newTotalCost <= currentPlan.budgetEgp ? 'within' : 'exceeded',
    });
  };

  // تقديم أو تأخير ترتيب محطة
  const handleMoveStop = (fromIdx: number, toIdx: number) => {
    if (!currentPlan || fromIdx < 0 || toIdx < 0 || toIdx >= currentPlan.stops.length) return;
    const newStops = [...currentPlan.stops];
    const [moved] = newStops.splice(fromIdx, 1);
    newStops.splice(toIdx, 0, moved);
    const reordered = newStops.map((s, idx) => ({ ...s, order: idx + 1 }));

    setCurrentPlan({
      ...currentPlan,
      stops: reordered,
    });
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* 1. Header with Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0c1622] border border-sand-300 dark:border-[#1d2d3e] shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal2-500 via-ocean-800 to-indigo-700 text-white grid place-items-center shrink-0 shadow-md">
            <Compass className="w-6 h-6 text-sand-300 animate-spin" style={{ animationDuration: '20s' }} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-ocean-950 dark:text-white leading-tight">
                مخطط الرحلات والخروجات الذكي
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-blue-500/15 to-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30">
                AI + مسارات حقيقية 🧭
              </span>
            </div>
            <p className="text-xs text-ocean-700/80 dark:text-white/70 font-medium mt-0.5">
              خطط خروجتك خطوة بخطوة بالذكاء الاصطناعي مع حساب الميزانية ومسارات الشوارع المعتمدة في بورسعيد
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button
            onClick={() => setShowSavedModal(true)}
            type="button"
            className="px-3.5 py-2 rounded-2xl bg-sand-100 dark:bg-[#152332] text-ocean-900 dark:text-white hover:bg-sand-200 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Bookmark className="w-3.5 h-3.5 text-teal2-600" />
            <span>رحلاتي المحفوظة ({savedTrips.length})</span>
          </button>

          {currentPlan && (
            <button
              onClick={() => {
                setCurrentPlan(null);
                setPrompt('');
              }}
              type="button"
              className="px-3 py-2 rounded-2xl bg-sand-100 dark:bg-[#152332] text-ocean-700 dark:text-white/70 hover:bg-sand-200 text-xs font-bold transition flex items-center gap-1"
              title="خطة جديدة"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>خطة جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Planning Input Form & Structured Studio Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0c1622] border border-sand-300 dark:border-[#1d2d3e] shadow-lg space-y-3.5">
        {/* Natural Language Prompt Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-black text-ocean-950 dark:text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>اطلب خروجتك باللغة الطبيعية (أو اختر من المقترحات):</span>
          </label>

          <div className="relative flex items-center">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleGeneratePlan();
              }}
              placeholder="مثال: «خطط لي خروجة لشخصين لمدة 5 ساعات بميزانية 500 جنيه، تشمل أماكن للزيارة وكافيه ومطعم»"
              className="w-full pr-4 pl-32 py-3 rounded-2xl border border-sand-300 dark:border-[#22354a] bg-sand-50/80 dark:bg-[#121f2f] text-xs sm:text-sm text-ocean-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal2-500 font-medium shadow-inner"
            />

            <button
              onClick={() => handleGeneratePlan()}
              disabled={loading}
              type="button"
              className="absolute left-2 px-4 py-2 rounded-xl bg-gradient-to-r from-ocean-900 via-ocean-800 to-teal2-700 text-white font-black text-xs shadow-md hover:opacity-95 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-sand-300" />
              )}
              <span>{loading ? 'جارٍ التخطيط...' : 'تخطيط ذكي'}</span>
            </button>
          </div>
        </div>

        {/* Quick Inspiration Prompt Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-bold text-ocean-700/70 dark:text-white/60 shrink-0">
            أفكار جاهزة:
          </span>
          {INSPIRATION_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPrompt(chip);
                handleGeneratePlan(chip);
              }}
              type="button"
              className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-sand-100 dark:bg-[#152332] text-ocean-800 dark:text-white/80 hover:bg-teal2-100 dark:hover:bg-teal2-900/40 border border-sand-200 dark:border-[#22354a] transition whitespace-nowrap"
            >
              {chip.slice(0, 42)}...
            </button>
          ))}
        </div>

        {/* Advanced Filters Toggle */}
        <div className="border-t border-sand-200 dark:border-[#1d2d3e] pt-2">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            type="button"
            className="flex items-center justify-between w-full text-xs font-bold text-ocean-700 dark:text-sand-300 hover:text-ocean-950 transition"
          >
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-teal2-600" />
              <span>
                {showAdvancedFilters ? 'إخفاء خيارات التخصيص الدقيقة' : 'تخصيص نقطة الانطلاق، الميزانية، ووسيلة الانتقال'}
              </span>
            </span>
            {showAdvancedFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Advanced Structured Controls */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-4 pt-2 text-xs"
            >
              {/* Waypoints: Start & End */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-sand-50 dark:bg-[#121f2f] border border-sand-200 dark:border-[#1d2d3e]">
                {/* Start Point */}
                <div className="space-y-1.5">
                  <span className="font-bold text-ocean-900 dark:text-white flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                      <span>نقطة الانطلاق (البداية):</span>
                    </span>
                    <button
                      onClick={handleUseCurrentLocation}
                      type="button"
                      className="text-[10px] text-teal2-700 dark:text-teal2-300 hover:underline flex items-center gap-1"
                    >
                      <Navigation className="w-2.5 h-2.5" />
                      <span>موقعي الحالي 📍</span>
                    </button>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={startPoint ? startPoint.name : 'أقرب نقطة معتمدة لبداية الخروجة'}
                      className="flex-1 px-3 py-2 rounded-xl border border-sand-300 dark:border-[#22354a] bg-white dark:bg-[#0c1622] text-xs font-semibold"
                    />
                    <button
                      onClick={() => setPickingPointFor('start')}
                      type="button"
                      className={`px-3 py-2 rounded-xl font-bold text-xs shrink-0 transition ${
                        pickingPointFor === 'start'
                          ? 'bg-amber-500 text-ocean-950 font-black'
                          : 'bg-sand-200 dark:bg-[#162738] hover:bg-sand-300 text-ocean-900 dark:text-white'
                      }`}
                    >
                      حدد بالخريطة 🗺️
                    </button>
                  </div>
                </div>

                {/* End Point */}
                <div className="space-y-1.5">
                  <span className="font-bold text-ocean-900 dark:text-white flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>نقطة النهاية:</span>
                    </span>
                    <label className="text-[10px] text-ocean-700 dark:text-sand-300 flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isRoundTrip}
                        onChange={(e) => setIsRoundTrip(e.target.checked)}
                        className="rounded"
                      />
                      <span>العودة لنقطة البداية 🔄</span>
                    </label>
                  </span>

                  {!isRoundTrip ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={endPoint ? endPoint.name : 'اختر نقطة النهاية'}
                        className="flex-1 px-3 py-2 rounded-xl border border-sand-300 dark:border-[#22354a] bg-white dark:bg-[#0c1622] text-xs font-semibold"
                      />
                      <button
                        onClick={() => setPickingPointFor('end')}
                        type="button"
                        className={`px-3 py-2 rounded-xl font-bold text-xs shrink-0 transition ${
                          pickingPointFor === 'end'
                            ? 'bg-amber-500 text-ocean-950 font-black'
                            : 'bg-sand-200 dark:bg-[#162738] hover:bg-sand-300 text-ocean-900 dark:text-white'
                        }`}
                      >
                        حدد بالخريطة 🗺️
                      </button>
                    </div>
                  ) : (
                    <div className="p-2 text-center rounded-xl bg-sand-100 dark:bg-[#162738] text-[11px] text-ocean-700 dark:text-white/70 font-semibold">
                      رحلة دائرية مريحة تعود بك إلى نقطة الانطلاق
                    </div>
                  )}
                </div>
              </div>

              {/* Sliders: Budget, Duration, Party Size, Transport */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Budget Slider */}
                <div className="p-3 rounded-2xl bg-sand-50 dark:bg-[#121f2f] border border-sand-200 dark:border-[#1d2d3e] space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span>الميزانية:</span>
                    <span className="text-teal2-700 dark:text-teal2-300 font-black">
                      {budgetEgp} ج.م
                    </span>
                  </div>
                  <input
                    type="range"
                    min="150"
                    max="3000"
                    step="50"
                    value={budgetEgp}
                    onChange={(e) => setBudgetEgp(Number(e.target.value))}
                    className="w-full accent-teal2-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-ocean-700/60 dark:text-white/50">
                    <span>150 ج.م</span>
                    <span>3000 ج.م</span>
                  </div>
                </div>

                {/* Duration Slider */}
                <div className="p-3 rounded-2xl bg-sand-50 dark:bg-[#121f2f] border border-sand-200 dark:border-[#1d2d3e] space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span>المدة الإجمالية:</span>
                    <span className="text-indigo-600 dark:text-indigo-300 font-black">
                      {durationHours} ساعات
                    </span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    step="1"
                    value={durationHours}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-ocean-700/60 dark:text-white/50">
                    <span>ساعتين</span>
                    <span>10 ساعات</span>
                  </div>
                </div>

                {/* Party Size */}
                <div className="p-3 rounded-2xl bg-sand-50 dark:bg-[#121f2f] border border-sand-200 dark:border-[#1d2d3e] space-y-1.5">
                  <div className="flex items-center justify-between font-bold">
                    <span>عدد الأفراد:</span>
                    <span className="text-ocean-950 dark:text-white font-black">{partySize}</span>
                  </div>
                  <div className="flex gap-1 justify-between">
                    {[1, 2, 3, 4, 6].map((num) => (
                      <button
                        key={num}
                        onClick={() => setPartySize(num)}
                        type="button"
                        className={`flex-1 py-1 rounded-lg text-xs font-black transition ${
                          partySize === num
                            ? 'bg-ocean-900 text-sand-300'
                            : 'bg-white dark:bg-[#162738] text-ocean-800 dark:text-white/70 hover:bg-sand-200'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transport Mode */}
                <div className="p-3 rounded-2xl bg-sand-50 dark:bg-[#121f2f] border border-sand-200 dark:border-[#1d2d3e] space-y-1.5">
                  <span className="font-bold block">وسيلة الانتقال:</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setTransportMode('driving')}
                      type="button"
                      className={`flex-1 py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition ${
                        transportMode === 'driving'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white dark:bg-[#162738] text-ocean-800 dark:text-white/70'
                      }`}
                    >
                      <Car className="w-3 h-3" />
                      <span>سيارة/تاكسي</span>
                    </button>
                    <button
                      onClick={() => setTransportMode('walking')}
                      type="button"
                      className={`flex-1 py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition ${
                        transportMode === 'walking'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white dark:bg-[#162738] text-ocean-800 dark:text-white/70'
                      }`}
                    >
                      <Footprints className="w-3 h-3" />
                      <span>مشياً</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Notice */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </span>
            <button onClick={() => setErrorMsg(null)} type="button">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* 3. Mobile Tab Switcher */}
      <div className="flex lg:hidden rounded-2xl bg-sand-200/80 dark:bg-[#0c1622] p-1 border border-sand-300 dark:border-[#1d2d3e]">
        <button
          onClick={() => setMobileTab('itinerary')}
          type="button"
          className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            mobileTab === 'itinerary'
              ? 'bg-white dark:bg-[#162738] text-ocean-950 dark:text-white shadow-sm'
              : 'text-ocean-700 dark:text-white/60'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>جدول الرحلة ({currentPlan ? currentPlan.stops.length : 0})</span>
        </button>

        <button
          onClick={() => setMobileTab('map')}
          type="button"
          className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            mobileTab === 'map'
              ? 'bg-white dark:bg-[#162738] text-ocean-950 dark:text-white shadow-sm'
              : 'text-ocean-700 dark:text-white/60'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>الخريطة والمسار 🗺️</span>
        </button>
      </div>

      {/* 4. Split Studio Workspace (Left: Interactive Map, Right: Itinerary & Refinement) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-h-[580px]">
        {/* Left: Map Area (Desktop: 7 cols, Mobile: toggleable tab) */}
        <div
          className={`lg:col-span-7 h-[540px] sm:h-[640px] lg:h-[720px] sticky top-20 rounded-3xl overflow-hidden ${
            mobileTab === 'map' ? 'block' : 'hidden lg:block'
          }`}
        >
          <PlannerMap
            plan={currentPlan}
            startPoint={startPoint}
            endPoint={isRoundTrip ? startPoint : endPoint}
            activeStopIndex={activeStopIndex}
            onSelectStop={(idx) => setActiveStopIndex(idx)}
            pickingPointFor={pickingPointFor}
            onPointPicked={(pt) => {
              if (pickingPointFor === 'start') {
                setStartPoint(pt);
                if (isRoundTrip) setEndPoint(pt);
              } else {
                setEndPoint(pt);
              }
              setPickingPointFor(null);
            }}
            onCancelPick={() => setPickingPointFor(null)}
            onViewPlaceDetails={onViewPlaceDetails}
          />
        </div>

        {/* Right: Itinerary & Refinement Area (Desktop: 5 cols, Mobile: toggleable tab) */}
        <div
          className={`lg:col-span-5 space-y-4 ${
            mobileTab === 'itinerary' ? 'block' : 'hidden lg:block'
          }`}
        >
          {currentPlan ? (
            <ItineraryTimeline
              plan={currentPlan}
              onRemoveStop={handleRemoveStop}
              onMoveStop={handleMoveStop}
              onSelectStopOnMap={(idx) => {
                setActiveStopIndex(idx);
                setMobileTab('map');
              }}
              onRefinePlan={handleRefinePlan}
              onSavePlan={handleSaveCurrentPlan}
              isSaved={isCurrentPlanSaved}
              onViewPlaceDetails={onViewPlaceDetails}
              loadingRefine={loadingRefine}
            />
          ) : (
            /* Empty State: Inspiration guidelines */
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1622] border border-sand-300 dark:border-[#1d2d3e] text-center space-y-4 shadow-md">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-teal2-500 to-indigo-600 p-0.5 shadow-lg mx-auto">
                <div className="w-full h-full rounded-3xl bg-white dark:bg-[#071322] flex items-center justify-center">
                  <Compass className="w-8 h-8 text-teal2-600" />
                </div>
              </div>

              <div>
                <h3 className="font-black text-base sm:text-lg text-ocean-950 dark:text-white">
                  جاهز لتخطيط أفضل خروجة في بورسعيد؟
                </h3>
                <p className="text-xs text-ocean-700/70 dark:text-white/60 max-w-sm mx-auto mt-1 leading-relaxed">
                  اكتب في الحقل أعلاه ما ترغب به أو اختر من المقترحات، وسيقوم المساعد بحساب الميزانية واقتراح محطات
                  حقيقية مع رسم مسار الشوارع الفعلي.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-sand-50 dark:bg-[#121f2f] text-xs font-semibold text-ocean-800 dark:text-sand-300 text-right space-y-2 border border-sand-200 dark:border-[#1d2d3e]">
                <span className="font-bold block text-ocean-950 dark:text-white">
                  مميزات المخطط الذكي:
                </span>
                <ul className="space-y-1.5 text-[11px] list-disc list-inside text-ocean-700/80 dark:text-white/70">
                  <li>أماكن حقيقية معتمدة فقط دون أي تخمين أو أماكن وهمية.</li>
                  <li>حساب دقيق للميزانية والخصومات المتاحة عبر كود Port Said Hub.</li>
                  <li>مسارات قيادة ومشاة فعلية بشوارع بورسعيد بالتعاون مع OSRM.</li>
                  <li>إمكانية تعديل الخطة بالمحادثة أو حذف واستبدال أي محطة بضغطة زر.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Saved Trips Modal Drawer */}
      <SavedTripsModal
        isOpen={showSavedModal}
        onClose={() => setShowSavedModal(false)}
        savedTrips={savedTrips}
        onLoadTrip={(trip) => {
          setCurrentPlan(trip);
          setActiveStopIndex(0);
        }}
        onDeleteTrip={handleDeleteSavedTrip}
      />
    </div>
  );
};
