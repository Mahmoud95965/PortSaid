'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  PlanResult,
  PlanStop,
  parseTripQuery,
} from '@/lib/plannerUtils';
import {
  isPointInPortSaid,
  identifyPortSaidDistrict,
  calculateDistanceKm,
} from '@/lib/geoUtils';
import { PlannerMap } from './PlannerMap';
import { SavedTripsModal } from './SavedTripsModal';
import {
  Compass,
  Sparkles,
  Bot,
  Send,
  MapPin,
  Clock,
  DollarSign,
  Share2,
  Bookmark,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Car,
  Footprints,
  Check,
  AlertCircle,
  Tag,
  Maximize2,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SuggestedPlace {
  id: string;
  n: string;
  cat: string;
  a: string;
  lat: number;
  lon: number;
  disc?: number;
}

interface ChatMessage {
  id: string;
  role: 'bot' | 'me';
  text: string;
  timestamp: string;
  isPlanUpdate?: boolean;
  planSummary?: {
    title: string;
    totalCost: number;
    budgetEgp: number;
    stopsCount: number;
  };
  suggestedPlaces?: SuggestedPlace[];
}

interface UnifiedAiStudioProps {
  initialPrompt?: string | null;
  initialPlanData?: string | null;
  onViewPlaceDetails?: (placeId: string) => void;
  onBackToHome?: () => void;
}

const CHAT_STORAGE_KEY = 'portsaid_unified_ai_chat_v1';
const SAVED_TRIPS_STORAGE = 'portsaid_hub_saved_itineraries_v1';

const QUICK_PROMPTS = [
  {
    label: 'خروجة لشخصين 500 ج.م',
    text: 'خطط لي خروجة لشخصين لمدة 5 ساعات بميزانية 500 جنيه تشمل كافيه ومطعم سمك ومعالم',
    icon: '🧭',
  },
  {
    label: 'أقرب سمك وكافيه لموقعي',
    text: '📍 رشح لي أقرب مطعم سمك وكافيه لموقعي الحالي وفيه خصومات بالكوبونات',
    icon: '🐟',
  },
  {
    label: 'يوم اقتصادي للطلبة',
    text: 'خطط لي يوم ترفيهي اقتصادي لـ 3 أفراد بميزانية 300 جنيه في حي الشرق وبورفؤاد',
    icon: '🎓',
  },
  {
    label: 'فسحة وجبال الملح',
    text: 'عايز برنامج زيارة للمعدية وجبال الملح في بورفؤاد مع مكان حلويات كاساتا',
    icon: '🚢',
  },
  {
    label: 'مواصلات كليات الجامعة',
    text: 'إزاي أروح كليات الطب والهندسة بالمينى باص من السكن والمعدية؟',
    icon: '🚌',
  },
];

export const UnifiedAiStudio: React.FC<UnifiedAiStudioProps> = ({
  initialPrompt,
  initialPlanData,
  onViewPlaceDetails,
  onBackToHome,
}) => {
  const { user } = useAuth();

  // 1. حالة المخطط والخطة الحالية
  const [currentPlan, setCurrentPlan] = useState<PlanResult | null>(null);
  const [activeStopIndex, setActiveStopIndex] = useState<number | null>(null);
  const [savedTrips, setSavedTrips] = useState<PlanResult[]>([]);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // إعدادات التخطيط المتقدمة
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [budgetEgp, setBudgetEgp] = useState<number>(500);
  const [durationHours, setDurationHours] = useState<number>(5);
  const [partySize, setPartySize] = useState<number>(2);
  const [transportMode, setTransportMode] = useState<'driving' | 'walking'>('driving');
  const [startPoint, setStartPoint] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [isRoundTrip, setIsRoundTrip] = useState(true);
  const [pickingPointFor, setPickingPointFor] = useState<'start' | 'end' | null>(null);

  // 2. حالة الشات والمحادثة المدمجة
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'bot',
      text:
        'أهلاً بيك يا غالي في مركز الذكاء الاصطناعي الموحد لـ Port Said Hub! 🌊\n\n' +
        'أنا مساعدك ومخطط رحلاتك البورسعيدي الذكي في مكان واحد:\n' +
        '• اطلب أي خروجة بميزانيتك ووقتك ➔ هتظهر لك المحطات ومسار الشوارع الحقيقي على الخريطة المجاورة فوراً 🧭\n' +
        '• تقدر تعدّل الخطة بالكلام في أي وقت (مثلاً: "شيل المطعم"، "زود كافيه"، "غير الميزانية لـ 700") 💬\n' +
        '• اسألني عن أي مطعم أو مكان أو خطوط المواصلات ➔ هجاوبك وأعرضه لك على الخريطة 🗺️\n' +
        'اضغط على "📍 موقعي" أو جرب المقترحات السريعة بالأسفل 👇',
      timestamp: 'الآن',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; district?: string } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  // 3. التبويب في الشاشات الصغيرة (الموبايل)
  const [mobileView, setMobileView] = useState<'chat' | 'canvas'>('chat');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // التمرير التلقائي لأسفل في الشات
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // تحميل الرحلات المحفوظة وسجل الشات
  useEffect(() => {
    try {
      const storedTrips = localStorage.getItem(SAVED_TRIPS_STORAGE);
      if (storedTrips) setSavedTrips(JSON.parse(storedTrips));

      const storedChat = localStorage.getItem(CHAT_STORAGE_KEY);
      if (storedChat) {
        const parsed = JSON.parse(storedChat);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (e) {}
  }, []);

  // حفظ سجل الشات تلقائياً
  useEffect(() => {
    try {
      if (messages.length > 1) {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-25)));
      }
    } catch (e) {}
  }, [messages]);

  // فك شفرة الخطة المشتركة أو البدء بطلب أولي
  useEffect(() => {
    if (initialPlanData) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(initialPlanData))));
        if (decoded && decoded.stops) {
          setCurrentPlan(decoded);
          setBudgetEgp(decoded.budgetEgp || 500);
          setPartySize(decoded.partySize || 2);
          setDurationHours(decoded.totalDurationHours || 5);
          // إضافة رسالة في الشات
          const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
          setMessages((prev) => [
            ...prev,
            {
              id: 'shared-' + Date.now(),
              role: 'bot',
              text: `تم فتح خطة الرحلة المشتركة بنجاح: "${decoded.title}". تفاصيل المحطات ومسار الشوارع معروضة مباشرة في الخريطة على يسارك 🧭`,
              timestamp: now,
              isPlanUpdate: true,
              planSummary: {
                title: decoded.title,
                totalCost: decoded.totalCost,
                budgetEgp: decoded.budgetEgp,
                stopsCount: decoded.stops.length,
              },
            },
          ]);
        }
      } catch (e) {}
    } else if (initialPrompt) {
      handleProcessUserMessage(initialPrompt);
    }
  }, [initialPlanData, initialPrompt]);

  // تحديد الموقع الجغرافي بالـ GPS
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      setLocationNotice('تحديد الموقع غير مدعوم في متصفحك.');
      return;
    }
    setLocatingUser(true);
    setLocationNotice(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if (isPointInPortSaid(lat, lng)) {
          const district = identifyPortSaidDistrict(lat, lng);
          setUserLocation({ lat, lng, district });
          setStartPoint({ name: `موقعي الحالي (${district})`, lat, lon: lng });
          if (isRoundTrip) setEndPoint({ name: `موقعي الحالي (${district})`, lat, lon: lng });
          setLocationNotice(`تم تحديد موقعك في: ${district}`);

          // إضافة رسالة تأكيد في الشات
          const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
          setMessages((prev) => [
            ...prev,
            {
              id: 'loc-' + Date.now(),
              role: 'bot',
              text: `📍 تم تحديد موقعك الحالي بنجاح في ${district}! يمكنك الآن طلب خروجة تنطلق من مكانك مباشرة أو السؤال عن أقرب الأماكن إليك.`,
              timestamp: now,
            },
          ]);
        } else {
          setLocationNotice('موقعك خارج النطاق الإداري لمحافظة بورسعيد.');
        }
      },
      () => {
        setLocatingUser(false);
        setLocationNotice('يرجى السماح بصلاحية الـ GPS لتحديد موقعك.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // إرسال ومعالجة الرسالة في المكان الموحد
  const handleProcessUserMessage = async (rawText?: string) => {
    const textToSend = (rawText || input).trim();
    if (!textToSend || loading) return;

    setInput('');
    const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    // إضافة رسالة المستخدم
    const userMsg: ChatMessage = {
      id: 'usr-' + Date.now(),
      role: 'me',
      text: textToSend,
      timestamp: now,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const lower = textToSend.toLowerCase();

      // فحص نوع النية: هل هو تعديل لخطة حالية؟
      const isRefineRequest =
        Boolean(currentPlan) &&
        (lower.includes('شيل') ||
          lower.includes('احذف') ||
          lower.includes('غير') ||
          lower.includes('بدل') ||
          lower.includes('استبدل') ||
          lower.includes('زود') ||
          lower.includes('ضيف') ||
          lower.includes('ميزانية') ||
          lower.includes('كافيه') ||
          lower.includes('مكان') ||
          lower.includes('ترتيب'));

      // فحص هل هو طلب تخطيط رحلة جديدة؟
      const isPlanningRequest =
        lower.includes('خطط') ||
        lower.includes('خروجة') ||
        lower.includes('رحلة') ||
        lower.includes('فسحة') ||
        lower.includes('برنامج') ||
        lower.includes('مخطط') ||
        lower.includes('يوم سياحي') ||
        lower.includes('ساعات') ||
        lower.includes('جنيه') ||
        lower.includes('ميزانية');

      if (isRefineRequest && currentPlan) {
        // 1. تعديل الخطة الحالية عبر الـ Planner API
        const res = await fetch('/api/planner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'refine',
            refineInstruction: textToSend,
            currentPlan,
          }),
        });

        const data = await res.json();
        if (data.ok && data.plan) {
          setCurrentPlan(data.plan);
          setActiveStopIndex(0);
          confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });

          setMessages((prev) => [
            ...prev,
            {
              id: 'bot-' + Date.now(),
              role: 'bot',
              text: `تمام يا غالي! عدلت لك الخطة حسب طلبك: "${textToSend}". تم تحديث مسار الشوارع والتكلفة الإجمالية أصبحت (${data.plan.totalCost} ج.م من أصل ${data.plan.budgetEgp} ج.م) والجدول والخريطة اتحدثوا على يسارك مباشرة 🧭`,
              timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
              isPlanUpdate: true,
              planSummary: {
                title: data.plan.title,
                totalCost: data.plan.totalCost,
                budgetEgp: data.plan.budgetEgp,
                stopsCount: data.plan.stops.length,
              },
            },
          ]);
        } else {
          throw new Error(data.error || 'تعذر تعديل الخطة');
        }
      } else if (isPlanningRequest) {
        // 2. تخطيط رحلة جديدة بالذكاء الاصطناعي
        const res = await fetch('/api/planner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate',
            prompt: textToSend,
            startPoint: startPoint || undefined,
            endPoint: isRoundTrip ? (startPoint || undefined) : (endPoint || undefined),
            budgetEgp,
            durationHours,
            partySize,
            transportMode,
          }),
        });

        const data = await res.json();
        if (data.ok && data.plan) {
          setCurrentPlan(data.plan);
          setActiveStopIndex(0);
          if (data.intent) {
            if (data.intent.budgetEgp) setBudgetEgp(data.intent.budgetEgp);
            if (data.intent.durationHours) setDurationHours(data.intent.durationHours);
            if (data.intent.partySize) setPartySize(data.intent.partySize);
          }
          confetti({ particleCount: 50, spread: 80, origin: { y: 0.7 } });

          const stopsNames = data.plan.stops.map((s: PlanStop) => s.name).join(' ➔ ');

          setMessages((prev) => [
            ...prev,
            {
              id: 'bot-' + Date.now(),
              role: 'bot',
              text:
                `صممت لك خطة خروجة بورسعيدية مميزة! 🧭\n\n` +
                `📌 الخطة: ${data.plan.title}\n` +
                `💰 التكلفة المقدرة: ${data.plan.totalCost} ج.م (الميزانية المحددة: ${data.plan.budgetEgp} ج.م)\n` +
                `⏳ المدة: ${data.plan.totalDurationHours} ساعات • ${data.plan.partySize} أفراد • المسافة: ${data.plan.totalDistanceKm} كم\n` +
                `🛣️ خط السير: ${stopsNames}\n\n` +
                `الخريطة ومسار الشوارع المعتمد وجدول المواعيد جاهزين على يسارك. تقدر تسألني عن أي تفاصيل أو تقولي أعدل أي محطة! 👇`,
              timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
              isPlanUpdate: true,
              planSummary: {
                title: data.plan.title,
                totalCost: data.plan.totalCost,
                budgetEgp: data.plan.budgetEgp,
                stopsCount: data.plan.stops.length,
              },
            },
          ]);

          // في شاشات الموبايل، تحويل العرض تلقائياً إلى الخريطة بعد إنشاء الخطة
          if (window.innerWidth < 1024) {
            setMobileView('canvas');
          }
        } else {
          throw new Error(data.error || 'تعذر بناء الخطة');
        }
      } else {
        // 3. محادثة معرفية عامة مع المساعد الذكي
        const historyTurns = messages.slice(-6).map((m) => ({
          role: m.role,
          text: m.text,
        }));

        const res = await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: textToSend,
            history: historyTurns,
            userLocation: userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null,
          }),
        });

        const data = await res.json();
        if (data.ok) {
          setMessages((prev) => [
            ...prev,
            {
              id: 'bot-' + Date.now(),
              role: 'bot',
              text: data.reply,
              timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
              suggestedPlaces: data.suggestedPlaces || [],
            },
          ]);
        } else {
          throw new Error(data.error || 'تعذر معالجة الرسالة');
        }
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'bot',
          text: `عذراً يا غالي، حدث خطأ بسيط: ${err.message || 'يرجى المحاولة مرة أخرى'}. جرب تسألني بصيغة مختلفة وسأكون معك فوراً!`,
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // حذف محطة من الخطة وتحديث الشات والخريطة
  const handleRemoveStop = (order: number) => {
    if (!currentPlan) return;
    const removedStop = currentPlan.stops.find((s) => s.order === order);
    const remaining = currentPlan.stops
      .filter((s) => s.order !== order)
      .map((s, idx) => ({ ...s, order: idx + 1 }));

    if (remaining.length === 0) {
      setCurrentPlan(null);
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-' + Date.now(),
          role: 'bot',
          text: 'تم مسح الخطة بالكامل. يمكنك طلب خروجة جديدة في أي وقت وسأصممها لك فوراً 🧭',
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      return;
    }

    const newTotalCost = remaining.reduce((sum, s) => sum + s.totalCost, 0);
    setCurrentPlan({
      ...currentPlan,
      stops: remaining,
      totalCost: newTotalCost,
      budgetStatus: newTotalCost <= currentPlan.budgetEgp ? 'within' : 'exceeded',
    });

    setMessages((prev) => [
      ...prev,
      {
        id: 'bot-' + Date.now(),
        role: 'bot',
        text: `تم حذف محطة "${removedStop?.name || order}" وتحديث المسار. التكلفة أصبحت ${newTotalCost} ج.م من أصل ${currentPlan.budgetEgp} ج.م.`,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // إعادة ترتيب محطة
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

  // حفظ الخطة الحالية
  const handleSavePlan = () => {
    if (!currentPlan) return;
    const filtered = savedTrips.filter((t) => t.id !== currentPlan.id);
    const updated = [currentPlan, ...filtered];
    setSavedTrips(updated);
    try {
      localStorage.setItem(SAVED_TRIPS_STORAGE, JSON.stringify(updated));
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-' + Date.now(),
          role: 'bot',
          text: `⭐ تم حفظ خطة "${currentPlan.title}" في رحلاتك المحفوظة بنجاح! يمكنك استرجاعها في أي وقت.`,
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (e) {}
  };

  // مشاركة الخطة
  const handleSharePlan = () => {
    if (!currentPlan) return;
    try {
      const summaryText =
        `🌊 خطة خروجة بورسعيد (${currentPlan.title}):\n` +
        currentPlan.stops
          .map((s, i) => `${i + 1}. ${s.name} (${s.arrivalTime}) - ${s.totalCost > 0 ? s.totalCost + ' ج.م' : 'مجانًا'}`)
          .join('\n') +
        `\n\nالميزانية: ${currentPlan.totalCost} ج.م من أصل ${currentPlan.budgetEgp} ج.م.\n` +
        `المسافة: ${currentPlan.totalDistanceKm} كم.\n` +
        `تم التخطيط عبر Port Said Hub ⚓\n` +
        window.location.href;

      navigator.clipboard.writeText(summaryText);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } catch (e) {}
  };

  // مسح المحادثة وبدء جلسة جديدة
  const handleResetChatAndPlan = () => {
    setCurrentPlan(null);
    setMessages([
      {
        id: 'welcome-reset-' + Date.now(),
        role: 'bot',
        text: 'بدأنا جلسة جديدة نظيفة! 🌊 اسألني عن أي مكان في بورسعيد أو اطلب خروجة جديدة بالميزانية والوقت اللي يناسبك.',
        timestamp: 'الآن',
      },
    ]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  const isCurrentSaved = currentPlan ? savedTrips.some((t) => t.id === currentPlan.id) : false;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* 1. Unified Studio Top Action Header */}
      <header className="p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-[#0c1622] border border-sand-300 dark:border-[#1d2d3e] shadow-lg flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto text-right">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 text-white grid place-items-center shrink-0 shadow-md">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-sand-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-ocean-950 dark:text-white leading-tight">
                استوديو بورسعيد الذكي • الشات والمخطط المدمج
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal2-500/15 text-teal2-700 dark:text-teal2-300 border border-teal2-400/30">
                All-in-One ✦
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-ocean-700/80 dark:text-white/70 font-medium mt-0.5">
              تحدث مع المساعد الذكي وتابع الخريطة الحية ومسار الرحلة والميزانية في نفس الشاشة
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end flex-wrap">
          <button
            onClick={handleLocateUser}
            disabled={locatingUser}
            type="button"
            className="px-3 py-1.5 rounded-xl bg-sand-100 dark:bg-[#152332] text-ocean-900 dark:text-white hover:bg-sand-200 text-xs font-bold transition flex items-center gap-1.5 border border-sand-200 dark:border-[#1d2d3e]"
            title="تحديد موقعك الحالي بالـ GPS"
          >
            <MapPin className={`w-3.5 h-3.5 text-rose-500 ${locatingUser ? 'animate-bounce' : ''}`} />
            <span>{locatingUser ? 'جارٍ التحديد...' : userLocation ? userLocation.district || 'موقعي محدد' : 'موقعي GPS'}</span>
          </button>

          <button
            onClick={() => setShowSavedModal(true)}
            type="button"
            className="px-3 py-1.5 rounded-xl bg-sand-100 dark:bg-[#152332] text-ocean-900 dark:text-white hover:bg-sand-200 text-xs font-bold transition flex items-center gap-1.5 border border-sand-200 dark:border-[#1d2d3e]"
          >
            <Bookmark className="w-3.5 h-3.5 text-teal2-600" />
            <span>رحلاتي ({savedTrips.length})</span>
          </button>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            type="button"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              showAdvanced
                ? 'bg-ocean-900 text-sand-300 border-ocean-800'
                : 'bg-sand-100 dark:bg-[#152332] text-ocean-900 dark:text-white hover:bg-sand-200 border-sand-200 dark:border-[#1d2d3e]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>خيارات التخطيط</span>
          </button>

          <button
            onClick={handleResetChatAndPlan}
            type="button"
            className="px-3 py-1.5 rounded-xl bg-sand-100 dark:bg-[#152332] text-ocean-700 dark:text-white/70 hover:bg-sand-200 text-xs font-bold transition flex items-center gap-1"
            title="جلسة جديدة"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">جلسة جديدة</span>
          </button>
        </div>
      </header>

      {/* Advanced Planning Options (Collapsible) */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden p-4 rounded-3xl bg-white dark:bg-[#0c1622] border border-sand-300 dark:border-[#1d2d3e] shadow-md space-y-3"
          >
            <div className="flex items-center justify-between text-xs font-black text-ocean-950 dark:text-white">
              <span>تخصيص معايير الخطة التلقائية:</span>
              <span className="text-[11px] text-ocean-700/70 dark:text-white/60">
                (يمكنك تعديل هذه القيم بالكلام مباشرة في الشات أيضاً)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Budget */}
              <div className="p-3 rounded-2xl bg-sand-50 dark:bg-[#121f2f] border border-sand-200 dark:border-[#1d2d3e] space-y-1">
                <div className="flex justify-between font-bold">
                  <span>الميزانية:</span>
                  <span className="text-teal2-700 dark:text-teal2-300 font-black">{budgetEgp} ج.م</span>
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
              </div>

              {/* Duration */}
              <div className="p-3 rounded-2xl bg-sand-50 dark:bg-[#121f2f] border border-sand-200 dark:border-[#1d2d3e] space-y-1">
                <div className="flex justify-between font-bold">
                  <span>المدة:</span>
                  <span className="text-indigo-600 dark:text-indigo-300 font-black">{durationHours} ساعات</span>
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
              </div>

              {/* Party Size */}
              <div className="p-3 rounded-2xl bg-sand-50 dark:bg-[#121f2f] border border-sand-200 dark:border-[#1d2d3e] space-y-1">
                <div className="flex justify-between font-bold">
                  <span>عدد الأفراد:</span>
                  <span className="font-black text-ocean-950 dark:text-white">{partySize}</span>
                </div>
                <div className="flex gap-1.5 pt-0.5">
                  {[1, 2, 3, 4, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPartySize(num)}
                      className={`flex-1 py-1 rounded-lg font-bold text-xs transition ${
                        partySize === num
                          ? 'bg-ocean-900 text-white dark:bg-teal2-600'
                          : 'bg-white dark:bg-[#162738] text-ocean-800 dark:text-white/70'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transport Mode */}
              <div className="p-3 rounded-2xl bg-sand-50 dark:bg-[#121f2f] border border-sand-200 dark:border-[#1d2d3e] space-y-1">
                <div className="flex justify-between font-bold">
                  <span>وسيلة الانتقال:</span>
                  <span className="font-black text-ocean-950 dark:text-white">{transportMode === 'driving' ? 'سيارة' : 'مشياً'}</span>
                </div>
                <div className="flex gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setTransportMode('driving')}
                    className={`flex-1 py-1 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition ${
                      transportMode === 'driving'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-[#162738] text-ocean-800 dark:text-white/70'
                    }`}
                  >
                    <Car className="w-3 h-3" />
                    <span>سيارة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransportMode('walking')}
                    className={`flex-1 py-1 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition ${
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

      {/* 2. Mobile Responsive Tab Switcher (< 1024px) */}
      <div className="flex lg:hidden rounded-2xl bg-sand-200/90 dark:bg-[#0c1622] p-1 border border-sand-300 dark:border-[#1d2d3e]">
        <button
          onClick={() => setMobileView('chat')}
          type="button"
          className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            mobileView === 'chat'
              ? 'bg-white dark:bg-[#162738] text-ocean-950 dark:text-white shadow-sm'
              : 'text-ocean-700 dark:text-white/60'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-blue-500" />
          <span>الشات والمحادثة ({messages.length})</span>
        </button>

        <button
          onClick={() => setMobileView('canvas')}
          type="button"
          className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            mobileView === 'canvas'
              ? 'bg-white dark:bg-[#162738] text-ocean-950 dark:text-white shadow-sm'
              : 'text-ocean-700 dark:text-white/60'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-teal2-600" />
          <span>
            الخريطة والجدول {currentPlan ? `(${currentPlan.stops.length} محطات • ${currentPlan.totalCost} ج.م)` : '🗺️'}
          </span>
        </button>
      </div>

      {/* 3. The Unified Split Workspace (Desktop: Side-by-Side 5:7) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-h-[680px]">
        {/* Right Column: Conversational AI Co-Pilot (Desktop: 5 cols) */}
        <div
          className={`lg:col-span-5 flex flex-col h-[650px] sm:h-[720px] rounded-3xl bg-white dark:bg-[#0c1622] border border-sand-300 dark:border-[#1d2d3e] shadow-xl overflow-hidden relative ${
            mobileView === 'chat' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Chat Header */}
          <div className="p-3.5 px-4 bg-sand-50 dark:bg-[#101e2e] border-b border-sand-200 dark:border-[#1d2d3e] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5">
                <div className="w-full h-full rounded-xl bg-white dark:bg-[#071322] flex items-center justify-center p-1">
                  <img src="/assets/logo/icon-192.png" alt="" className="w-full h-full object-contain" />
                </div>
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-ocean-950 dark:text-white">
                  شات المساعد ومخطط الرحلات
                </h3>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  متصل بالخريطة والمسارات مباشرة
                </span>
              </div>
            </div>

            {/* Quick Switch to Map button on mobile */}
            {currentPlan && (
              <button
                onClick={() => setMobileView('canvas')}
                type="button"
                className="lg:hidden px-2.5 py-1 rounded-xl bg-teal2-500/20 text-teal2-700 dark:text-teal2-300 text-[11px] font-black border border-teal2-400/30 flex items-center gap-1"
              >
                <span>الخريطة 🗺️</span>
              </button>
            )}
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 scrollbar-thin">
            {messages.map((m) => {
              const isBot = m.role === 'bot';
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 ${isBot ? 'self-start' : 'self-end flex-row-reverse'}`}
                >
                  {/* Avatar */}
                  {isBot ? (
                    <div className="w-7 h-7 rounded-xl bg-ocean-900 text-sand-300 grid place-items-center shrink-0 mt-0.5 shadow-sm text-xs font-black">
                      ⚓
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-xl bg-teal2-600 text-white grid place-items-center shrink-0 mt-0.5 shadow-sm text-xs font-black">
                      {user?.name?.[0] || 'أنت'}
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    className={`p-3.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed max-w-[88%] shadow-sm ${
                      isBot
                        ? 'bg-sand-50 dark:bg-[#121f2f] text-ocean-950 dark:text-white rounded-tr-sm border border-sand-200 dark:border-[#1d2d3e]'
                        : 'bg-gradient-to-r from-ocean-900 to-teal2-700 text-white rounded-tl-sm'
                    }`}
                  >
                    <div className="whitespace-pre-line font-medium">{m.text}</div>

                    {/* Plan Summary Badge if Message Created/Refined a Plan */}
                    {m.isPlanUpdate && m.planSummary && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-white dark:bg-[#0c1622] border border-sand-300 dark:border-teal2-500/30 text-ocean-900 dark:text-white flex items-center justify-between gap-2 shadow-sm">
                        <div className="min-w-0">
                          <p className="font-black text-xs truncate">{m.planSummary.title}</p>
                          <p className="text-[10px] text-teal2-700 dark:text-teal2-300 font-bold">
                            {m.planSummary.totalCost} ج.م • {m.planSummary.stopsCount} محطات
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (window.innerWidth < 1024) setMobileView('canvas');
                          }}
                          type="button"
                          className="px-2.5 py-1 rounded-lg bg-teal2-600 text-white text-[10px] font-black shrink-0 hover:bg-teal2-500 transition"
                        >
                          معاينة الخريطة 🗺️
                        </button>
                      </div>
                    )}

                    {/* Suggested Places Chips */}
                    {isBot && m.suggestedPlaces && m.suggestedPlaces.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-sand-200 dark:border-white/10 space-y-1.5">
                        <span className="text-[10px] font-black text-teal2-700 dark:text-teal2-300 block">
                          أماكن مقترحة على الخريطة:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {m.suggestedPlaces.map((pl) => (
                            <button
                              key={pl.id}
                              onClick={() => {
                                if (onViewPlaceDetails) onViewPlaceDetails(pl.id);
                              }}
                              type="button"
                              className="px-2 py-1 rounded-lg bg-white dark:bg-[#152332] border border-sand-300 dark:border-[#22354a] text-[11px] font-bold text-ocean-900 dark:text-white hover:border-teal2-500 transition flex items-center gap-1 shadow-xs"
                            >
                              <MapPin className="w-3 h-3 text-rose-500" />
                              <span>{pl.n}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <span className="text-[9px] opacity-60 block mt-1.5 text-left" dir="ltr">
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-sand-50 dark:bg-[#121f2f] text-ocean-800 dark:text-white/80 text-xs font-bold w-fit border border-sand-200 dark:border-[#1d2d3e]">
                <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                <span>مساعد بورسعيد بيفكر ويجهز المسار</span>
                <span className="inline-flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal2-500 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-teal2-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-teal2-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts Carousel */}
          <div className="px-3 py-2 bg-sand-50/80 dark:bg-[#101e2e]/90 border-t border-sand-200 dark:border-[#1d2d3e] flex gap-1.5 overflow-x-auto scrollbar-none">
            {QUICK_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleProcessUserMessage(p.text)}
                type="button"
                className="shrink-0 px-2.5 py-1 rounded-full bg-white dark:bg-[#162536] text-[11px] font-bold text-ocean-900 dark:text-white border border-sand-200 dark:border-[#22354a] hover:border-teal2-400 hover:bg-teal2-50 dark:hover:bg-teal2-900/30 transition shadow-xs flex items-center gap-1"
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleProcessUserMessage();
            }}
            className="p-3 bg-white dark:bg-[#0c1622] border-t border-sand-200 dark:border-[#1d2d3e] flex items-center gap-2"
          >
            <button
              type="button"
              onClick={handleLocateUser}
              title="تحديد موقعي الجغرافي"
              className="p-2.5 rounded-2xl bg-sand-100 dark:bg-[#162738] text-ocean-800 dark:text-sand-300 hover:bg-sand-200 transition shrink-0"
            >
              <MapPin className={`w-4 h-4 ${locatingUser ? 'animate-bounce text-rose-500' : ''}`} />
            </button>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                currentPlan
                  ? 'اطلب تعديل الخطة (مثلاً: احذف المطعم، زود كافيه)...'
                  : 'اطلب خروجة بميزانيتك ووقتك، أو اسأل عن أي مكان...'
              }
              className="flex-1 px-3.5 py-2.5 rounded-2xl bg-sand-50 dark:bg-[#121f2f] text-ocean-950 dark:text-white border border-sand-300 dark:border-[#1d2d3e] focus:border-teal2-500 outline-none text-xs sm:text-sm font-semibold transition"
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-2xl bg-gradient-to-r from-ocean-900 to-teal2-700 text-white disabled:opacity-40 hover:opacity-90 transition shrink-0 shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Left Column: Live Planner Canvas & Map (Desktop: 7 cols) */}
        <div
          className={`lg:col-span-7 flex flex-col space-y-4 ${
            mobileView === 'canvas' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Canvas Top Bar: Active Plan Metrics or Live Guidance */}
          <div className="p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-[#0c1622] border border-sand-300 dark:border-[#1d2d3e] shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {currentPlan ? (
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-black text-sm sm:text-base text-ocean-950 dark:text-white leading-tight">
                    {currentPlan.title}
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                      currentPlan.budgetStatus === 'within'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/30'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/30'
                    }`}
                  >
                    {currentPlan.totalCost} ج.م من {currentPlan.budgetEgp} ج.م • ضمن الميزانية ✓
                  </span>
                </div>
                <p className="text-[11px] text-ocean-700/80 dark:text-white/70 font-semibold flex items-center gap-2 flex-wrap">
                  <span>⏱️ {currentPlan.totalDurationHours} ساعات</span>
                  <span>•</span>
                  <span>👥 {currentPlan.partySize} أفراد</span>
                  <span>•</span>
                  <span>🛣️ {currentPlan.totalDistanceKm} كم مسار</span>
                  <span>•</span>
                  <span>📍 {currentPlan.stops.length} محطات</span>
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                <h2 className="font-black text-sm sm:text-base text-ocean-950 dark:text-white flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-teal2-600" />
                  <span>الخريطة الحية ومسار الرحلة</span>
                </h2>
                <p className="text-[11px] text-ocean-700/70 dark:text-white/60 font-medium">
                  اطلب أي خروجة في الشات وهتظهر لك أرقام المحطات ومسار الشوارع المعتمد هنا فوراً
                </p>
              </div>
            )}

            {/* Plan Action Buttons */}
            {currentPlan && (
              <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                <button
                  onClick={handleSavePlan}
                  type="button"
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 border ${
                    isCurrentSaved
                      ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-400/40'
                      : 'bg-sand-100 dark:bg-[#162738] text-ocean-900 dark:text-white hover:bg-sand-200 border-sand-300 dark:border-[#22354a]'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>{isCurrentSaved ? 'محفوظة' : 'حفظ الخطة'}</span>
                </button>

                <button
                  onClick={handleSharePlan}
                  type="button"
                  className="px-3 py-1.5 rounded-xl bg-sand-100 dark:bg-[#162738] text-ocean-900 dark:text-white hover:bg-sand-200 text-xs font-bold transition flex items-center gap-1 border border-sand-300 dark:border-[#22354a]"
                >
                  {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5 text-teal2-600" />}
                  <span>{copiedShare ? 'تم النسخ!' : 'مشاركة'}</span>
                </button>

                <button
                  onClick={() => setCurrentPlan(null)}
                  type="button"
                  title="مسح الخطة"
                  className="p-1.5 rounded-xl bg-sand-100 dark:bg-[#162738] text-ocean-600 dark:text-white/60 hover:text-rose-500 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Interactive MapLibre Container (Strict Port Said Bounds + Sequential Pins + OSRM Route) */}
          <div className="h-[360px] sm:h-[420px] rounded-3xl overflow-hidden border border-sand-300 dark:border-[#1d2d3e] shadow-xl relative">
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

          {/* Live Itinerary Timeline & Stops List */}
          {currentPlan ? (
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0c1622] border border-sand-300 dark:border-[#1d2d3e] shadow-lg space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-sand-200 dark:border-[#1d2d3e]">
                <h3 className="font-black text-xs sm:text-sm text-ocean-950 dark:text-white flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-teal2-600" />
                  <span>جدول المحطات الزمني ({currentPlan.stops.length} محطات)</span>
                </h3>
                <span className="text-[11px] text-ocean-700/70 dark:text-white/60 font-medium">
                  اضغط على أي محطة لتحديدها على الخريطة
                </span>
              </div>

              <div className="space-y-2.5">
                {currentPlan.stops.map((stop, idx) => {
                  const isSelected = activeStopIndex === idx;
                  return (
                    <motion.div
                      key={stop.placeId || idx}
                      layout
                      onClick={() => setActiveStopIndex(idx)}
                      className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-sand-50 dark:bg-[#152336] border-teal2-500 shadow-md ring-1 ring-teal2-500/30'
                          : 'bg-white dark:bg-[#0f1b2b] border-sand-200 dark:border-[#1d2d3e] hover:border-sand-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          {/* Number Pin Badge */}
                          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-ocean-900 to-teal2-700 text-white font-black text-xs grid place-items-center shrink-0 shadow-sm">
                            {stop.order}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-black text-xs sm:text-sm text-ocean-950 dark:text-white truncate">
                                {stop.name}
                              </h4>
                              {stop.discountPercent && stop.discountPercent > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-400/30">
                                  خصم {stop.discountPercent}%
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-ocean-700/70 dark:text-white/60 font-semibold mt-0.5">
                              {stop.categoryLabel} • {stop.area} • التواجد: {stop.arrivalTime} - {stop.departureTime}
                            </p>

                            <p className="text-[11px] text-teal2-700 dark:text-teal2-300 font-bold mt-1">
                              سبب الاختيار: {stop.reason}
                            </p>
                          </div>
                        </div>

                        {/* Stop Cost & Controls */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="font-black text-xs text-ocean-900 dark:text-white">
                            {stop.totalCost > 0 ? `${stop.totalCost} ج.م` : 'مجانًا'}
                          </span>

                          <div className="flex items-center gap-1">
                            {idx > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveStop(idx, idx - 1);
                                }}
                                type="button"
                                title="تقديم المحطة"
                                className="p-1 rounded-lg bg-sand-100 dark:bg-[#162738] hover:bg-sand-200 text-ocean-700 dark:text-white/70"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                            )}

                            {idx < currentPlan.stops.length - 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveStop(idx, idx + 1);
                                }}
                                type="button"
                                title="تأخير المحطة"
                                className="p-1 rounded-lg bg-sand-100 dark:bg-[#162738] hover:bg-sand-200 text-ocean-700 dark:text-white/70"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveStop(stop.order);
                              }}
                              type="button"
                              title="حذف المحطة"
                              className="p-1 rounded-lg bg-sand-100 dark:bg-[#162738] hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 transition"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Inspiration Guide Cards when no plan is active */
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0c1622] border border-sand-300 dark:border-[#1d2d3e] shadow-lg space-y-3">
              <span className="text-xs font-black text-ocean-950 dark:text-white block">
                نماذج خروجات جاهزة بضغطة زر:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    title: 'خروجة سمك وكافيه (500 ج.م)',
                    desc: 'مطعم كاستن + ممشى ديليسبس + كافيه بينوس',
                    query: 'خطط لي خروجة لشخصين لمدة 5 ساعات بميزانية 500 جنيه تشمل كافيه ومطعم سمك',
                    icon: '🐟',
                  },
                  {
                    title: 'فسحة وجبال الملح (350 ج.م)',
                    desc: 'المعدية + بورفؤاد + جبال الملح + كاساتا سيلفر',
                    query: 'عايز رحلة 4 ساعات تشمل المعدية وجبال الملح وبورفؤاد وحلويات سيلفر',
                    icon: '🚢',
                  },
                  {
                    title: 'يوم سياحي متكامل (600 ج.م)',
                    desc: 'الفنار + الممشى + سوق السمك الحضاري + حديقة فريال',
                    query: 'رتب لي يوم سياحي متكامل 6 ساعات لـ 3 أفراد بميزانية 600 جنيه',
                    icon: '🏛️',
                  },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleProcessUserMessage(item.query)}
                    type="button"
                    className="p-3 rounded-2xl bg-sand-50 dark:bg-[#101e2e] border border-sand-200 dark:border-[#1d2d3e] hover:border-teal2-500 text-right transition flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-xl block mb-1">{item.icon}</span>
                      <h4 className="font-black text-xs text-ocean-950 dark:text-white">{item.title}</h4>
                      <p className="text-[11px] text-ocean-700/70 dark:text-white/60 mt-0.5 line-clamp-2">
                        {item.desc}
                      </p>
                    </div>
                    <span className="mt-2 text-[10px] font-black text-teal2-700 dark:text-teal2-300">
                      ابدأ التخطيط ➔
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Saved Trips Modal */}
      <SavedTripsModal
        isOpen={showSavedModal}
        onClose={() => setShowSavedModal(false)}
        savedTrips={savedTrips}
        onLoadTrip={(trip: PlanResult) => {
          setCurrentPlan(trip);
          setActiveStopIndex(0);
          setShowSavedModal(false);
          const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
          setMessages((prev) => [
            ...prev,
            {
              id: 'restored-' + Date.now(),
              role: 'bot',
              text: `تم استرجاع رحلة "${trip.title}" بنجاح! الخريطة ومسار الشوارع معروضة الآن على يسارك 🧭`,
              timestamp: now,
            },
          ]);
        }}
        onDeleteTrip={(id) => {
          const updated = savedTrips.filter((t) => t.id !== id);
          setSavedTrips(updated);
          try {
            localStorage.setItem(SAVED_TRIPS_STORAGE, JSON.stringify(updated));
          } catch (e) {}
        }}
      />
    </div>
  );
};
