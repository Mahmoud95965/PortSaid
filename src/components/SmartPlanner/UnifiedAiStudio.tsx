'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  PlanResult,
  PlanStop,
  parseTripQuery,
  createStopFromPlace,
  fetchOSRMRoute,
} from '@/lib/plannerUtils';
import {
  isPointInPortSaid,
  identifyPortSaidDistrict,
  calculateDistanceKm,
} from '@/lib/geoUtils';
import { INITIAL_PLACES } from '@/lib/constants';
import { PlannerMap, SuggestedMapPlace } from './PlannerMap';
import { SavedTripsModal } from './SavedTripsModal';
import {
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
  ExternalLink,
  Car,
  Footprints,
  Check,
  Settings,
  Key,
  X,
  Compass,
  Copy,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Layers,
  Map as MapIcon,
  MessageSquare,
} from 'lucide-react';
import confetti from 'canvas-confetti';

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
  suggestedPlaces?: SuggestedMapPlace[];
}

interface UnifiedAiStudioProps {
  initialPrompt?: string | null;
  initialPlanData?: string | null;
  onViewPlaceDetails?: (placeId: string) => void;
  onBackToHome?: () => void;
}

const CHAT_STORAGE_KEY = 'portsaid_unified_ai_chat_v2';
const SAVED_TRIPS_STORAGE = 'portsaid_hub_saved_itineraries_v1';
const OPENROUTER_KEY_STORAGE = 'portsaid_openrouter_key';
const OPENROUTER_MODEL_STORAGE = 'portsaid_openrouter_model';

const POPULAR_MODELS = [
  { id: 'openai/gpt-4.1-nano', name: 'OpenAI GPT-4.1 Nano (فائق السرعة والدقة)', tag: 'Default ⭐' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash (سريع ودقيق)', tag: 'Fast ⚡' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 (ذكاء عالي)', tag: 'Smart 💡' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (مجاني)', tag: 'Free 🦙' },
  { id: 'built-in', name: 'المحرك المحلي الافتراضي (بدون مفتاح)', tag: 'Offline 🏠' },
];

// الاقتراحات الأربعة الأساسية لترحيب البداية (بأسلوب ChatGPT البسيط)
const WELCOME_SUGGESTIONS = [
  {
    title: 'أماكن للخروج',
    desc: 'أهم المعالم والأنشطة السياحية والفسح',
    prompt: 'رشح لي أفضل أماكن للخروج والفسحة في بورسعيد مع تفاصيل كل مكان',
    icon: '🧭',
  },
  {
    title: 'مطاعم وكافيهات',
    desc: 'أكلات بحرية وقعدات رايقة على قناة السويس',
    prompt: 'عايز ترشيحات لأحسن مطاعم سمك وكافيهات هادية قريبة من البحر',
    icon: '☕',
  },
  {
    title: 'خطط يوم كامل',
    desc: 'برنامج خروجة منظم بالمواعيد والميزانية',
    prompt: 'خططلي خروجة يوم كامل في بورسعيد بميزانية 400 جنيه لـ 2 أفراد',
    icon: '📅',
  },
  {
    title: 'أماكن قريبة مني',
    desc: 'اكتشف الأماكن المحيطة بك بحساب المسافات',
    prompt: 'عايز أماكن حلوة قريبة مني',
    icon: '📍',
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

  // إعدادات المسار والنقاط
  const [transportMode, setTransportMode] = useState<'driving' | 'walking'>('driving');
  const [startPoint, setStartPoint] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [isRoundTrip, setIsRoundTrip] = useState(true);
  const [pickingPointFor, setPickingPointFor] = useState<'start' | 'end' | null>(null);

  // التحكم بعرض الخريطة وتوسيعها
  const [showMapPanel, setShowMapPanel] = useState(true);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [mobileTab, setMobileTab] = useState<'chat' | 'map'>('chat');

  // إعدادات الموديل و OpenRouter
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [customKey, setCustomKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('openai/gpt-4.1-nano');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestFeedback, setKeyTestFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  // 2. حالة الشات والمحادثة المدمجة
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; district?: string } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // قائمة الأماكن المقترحة المجمعة من آخر رسائل المساعد لعرضها على الخريطة
  const [activeSuggestedPlaces, setActiveSuggestedPlaces] = useState<SuggestedMapPlace[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // تحميل الإعدادات والرحلات المحفوظة وسجل الشات
  useEffect(() => {
    try {
      const storedTrips = localStorage.getItem(SAVED_TRIPS_STORAGE);
      if (storedTrips) setSavedTrips(JSON.parse(storedTrips));

      const storedKey = localStorage.getItem(OPENROUTER_KEY_STORAGE);
      if (storedKey) setCustomKey(storedKey);

      const storedModel = localStorage.getItem(OPENROUTER_MODEL_STORAGE);
      if (storedModel) setSelectedModel(storedModel);

      const storedChat = localStorage.getItem(CHAT_STORAGE_KEY);
      if (storedChat) {
        const parsed = JSON.parse(storedChat);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          // استخراج الأماكن المقترحة من آخر رسائل
          const latestSuggested: SuggestedMapPlace[] = [];
          parsed.forEach((m: ChatMessage) => {
            if (m.suggestedPlaces && m.suggestedPlaces.length > 0) {
              latestSuggested.push(...m.suggestedPlaces);
            }
          });
          if (latestSuggested.length > 0) {
            setActiveSuggestedPlaces(latestSuggested.slice(-6));
          }
        }
      }
    } catch (e) {}
  }, []);

  // التمرير التلقائي لأسفل في الشات
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // حفظ سجل الشات تلقائياً
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-30)));
      }
    } catch (e) {}
  }, [messages]);

  // فك شفرة الخطة المشتركة أو البدء بطلب أولي من الرابط
  useEffect(() => {
    if (initialPlanData) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(initialPlanData))));
        if (decoded && decoded.stops) {
          setCurrentPlan(decoded);
          const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
          setMessages((prev) => [
            ...prev,
            {
              id: 'shared-' + Date.now(),
              role: 'bot',
              text: `تم فتح خطة الرحلة المشتركة: "${decoded.title}". تفاصيل المحطات ومسار الشوارع معروضة مباشرة في الخريطة التفاعلية 🧭`,
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

  // تحديد الموقع الجغرافي بالـ GPS مع التحقق
  const handleLocateUser = (afterLocatePrompt?: string) => {
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
          const loc = { lat, lng, district };
          setUserLocation(loc);
          setStartPoint({ name: `موقعي الحالي (${district})`, lat, lon: lng });
          if (isRoundTrip) setEndPoint({ name: `موقعي الحالي (${district})`, lat, lon: lng });
          setLocationNotice(`تم تحديد موقعك في: ${district}`);

          const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
          setMessages((prev) => [
            ...prev,
            {
              id: 'loc-' + Date.now(),
              role: 'bot',
              text: `📍 تم تحديد موقعك الحالي بنجاح في **${district}**! يمكنك الآن طلب ترشيحات قريبة أو الانطلاق من مكانك مباشرة على الخريطة.`,
              timestamp: now,
            },
          ]);

          if (afterLocatePrompt) {
            handleProcessUserMessage(afterLocatePrompt, loc);
          }
        } else {
          setLocationNotice('موقعك خارج النطاق الإداري لمحافظة بورسعيد.');
          const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
          setMessages((prev) => [
            ...prev,
            {
              id: 'loc-outside-' + Date.now(),
              role: 'bot',
              text: '📍 موقعك الحالي خارج نطاق بورسعيد. قمت بضبط مركز الانطلاق على وسط بورسعيد لتتمكن من التخطيط بحرية!',
              timestamp: now,
            },
          ]);
          if (afterLocatePrompt) {
            handleProcessUserMessage(afterLocatePrompt);
          }
        }
      },
      () => {
        setLocatingUser(false);
        setLocationNotice('يرجى السماح بصلاحية الـ GPS لحساب المسافات بدقة.');
        const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        setMessages((prev) => [
          ...prev,
          {
            id: 'loc-err-' + Date.now(),
            role: 'bot',
            text: '📍 تعذر الوصول لموقعك عبر الـ GPS. يمكنك النقر على زر **«نقطة البداية»** في الخريطة لتحديد مكانك يدوياً.',
            timestamp: now,
          },
        ]);
        if (afterLocatePrompt) {
          handleProcessUserMessage(afterLocatePrompt);
        }
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 }
    );
  };

  const getAiHeaders = () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const savedKey = typeof window !== 'undefined' ? localStorage.getItem(OPENROUTER_KEY_STORAGE) : null;
    const savedModel = typeof window !== 'undefined' ? localStorage.getItem(OPENROUTER_MODEL_STORAGE) : null;
    if (savedKey && savedKey.trim().length > 5) {
      headers['x-openrouter-key'] = savedKey.trim();
    }
    if (savedModel && savedModel !== 'built-in') {
      headers['x-openrouter-model'] = savedModel.trim();
    } else if (savedKey && savedKey.trim().length > 5) {
      headers['x-openrouter-model'] = 'openai/gpt-4.1-nano';
    }
    return headers;
  };

  const handleCopyMessage = async (msgId: string, text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch (e) {}
  };

  // إرسال ومعالجة الرسالة في المكان الموحد بذكاء وفهم النوايا
  const handleProcessUserMessage = async (rawText?: string, overrideLoc?: any) => {
    const textToSend = (rawText || input).trim();
    if (!textToSend || loading) return;

    setInput('');
    const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

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
      const currentLoc = overrideLoc || userLocation;

      // 1. فحص نية فتح أو عرض الخريطة مباشرة
      if (
        lower === 'وريني الخريطة' ||
        lower === 'افتح الخريطة' ||
        lower === 'عرض الخريطة' ||
        lower.includes('وريني الخريطه') ||
        lower.includes('افتح الخريطه') ||
        lower.includes('مكان الخريطة')
      ) {
        setShowMapPanel(true);
        setMobileTab('map');
        setMessages((prev) => [
          ...prev,
          {
            id: 'bot-' + Date.now(),
            role: 'bot',
            text: 'فتحت لك الخريطة التفاعلية لبورسعيد 🗺️\nيمكنك تحريكها والتكبير، النقر على أي علامة لمعرفة التفاصيل، أو تحديد نقطة بداية ونهاية لمسارك.',
            timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setLoading(false);
        return;
      }

      // 2. فحص نية طلب أماكن قريبة مع عدم توفر الموقع بعد
      const isNearbyQuery =
        lower.includes('قريب مني') ||
        lower.includes('اقرب مني') ||
        lower.includes('حوالي') ||
        lower.includes('جنبي') ||
        lower.includes('موقعي الحالي');

      if (isNearbyQuery && !currentLoc) {
        // تشجيع المستخدم وطلب إذن الموقع
        handleLocateUser(textToSend);
        setLoading(false);
        return;
      }

      // 3. فحص نية تعديل خطة حالية
      const isRefineRequest =
        Boolean(currentPlan) &&
        (lower.includes('شيل') ||
          lower.includes('احذف') ||
          lower.includes('امسح') ||
          lower.includes('غير') ||
          lower.includes('بدل') ||
          lower.includes('استبدل') ||
          lower.includes('زود') ||
          lower.includes('ضيف') ||
          lower.includes('حط') ||
          lower.includes('ترتيب') ||
          lower.includes('المكان التاني') ||
          lower.includes('أقرب للبحر') ||
          lower.includes('اقرب للبحر') ||
          lower.includes('أقرب مكان') ||
          lower.includes('ميزانية'));

      // 4. فحص هل هو طلب تخطيط رحلة جديدة
      const isPlanningRequest =
        lower.includes('خطط') ||
        lower.includes('خروجة') ||
        lower.includes('خروجه') ||
        lower.includes('رحلة') ||
        lower.includes('فسحة') ||
        lower.includes('برنامج') ||
        lower.includes('مخطط') ||
        lower.includes('يوم سياحي') ||
        lower.includes('يوم كامل') ||
        (lower.includes('جنيه') && (lower.includes('ساعات') || lower.includes('أفراد')));

      if (isRefineRequest && currentPlan) {
        // تعديل الخطة الحالية عبر الـ Planner API
        const res = await fetch('/api/planner', {
          method: 'POST',
          headers: getAiHeaders(),
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
              text: `تمام يا غالي! تم تحديث الخطة بناءً على طلبك: "${textToSend}". تم تعديل المحطات ومسار الشوارع الفعلي (${data.plan.totalCost} ج.م من أصل ${data.plan.budgetEgp} ج.م) والجدول والخريطة اتحدثوا فوراً 🧭`,
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
        // تخطيط رحلة جديدة بالذكاء الاصطناعي
        const res = await fetch('/api/planner', {
          method: 'POST',
          headers: getAiHeaders(),
          body: JSON.stringify({
            action: 'generate',
            prompt: textToSend,
            startPoint: startPoint || undefined,
            endPoint: isRoundTrip ? (startPoint || undefined) : (endPoint || undefined),
            transportMode,
          }),
        });

        const data = await res.json();
        if (data.ok && data.plan) {
          setCurrentPlan(data.plan);
          setActiveStopIndex(0);
          confetti({ particleCount: 45, spread: 75, origin: { y: 0.7 } });

          const stopsNames = data.plan.stops.map((s: PlanStop) => s.name).join(' ➔ ');

          setMessages((prev) => [
            ...prev,
            {
              id: 'bot-' + Date.now(),
              role: 'bot',
              text:
                `صممت لك خطة خروجة بورسعيدية متكاملة! 🧭\n\n` +
                `📌 **${data.plan.title}**\n` +
                `💰 التكلفة المقدرة: **${data.plan.totalCost} ج.م** (الميزانية: ${data.plan.budgetEgp} ج.م)\n` +
                `⏳ المدة: **${data.plan.totalDurationHours} ساعات** • **${data.plan.partySize} أفراد** • المسافة: **${data.plan.totalDistanceKm} كم**\n` +
                `🛣️ خط السير: ${stopsNames}\n\n` +
                `الخريطة ومسار الشوارع الفعلي وجدول المواعيد جاهزين. تقدر تطلب تعديل أي محطة بالكلام المباشر! 👇`,
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

          if (window.innerWidth < 1024) {
            setMobileTab('map');
          }
        } else {
          throw new Error(data.error || 'تعذر بناء الخطة');
        }
      } else {
        // محادثة معرفية وترشيحات ذكية مع المساعد
        const historyTurns = messages.slice(-6).map((m) => ({
          role: m.role,
          text: m.text,
        }));

        const res = await fetch('/api/assistant', {
          method: 'POST',
          headers: getAiHeaders(),
          body: JSON.stringify({
            message: textToSend,
            history: historyTurns,
            userLocation: currentLoc ? { lat: currentLoc.lat, lng: currentLoc.lng } : null,
          }),
        });

        const data = await res.json();
        if (data.ok) {
          const suggestedList: SuggestedMapPlace[] = Array.isArray(data.suggestedPlaces)
            ? data.suggestedPlaces
            : [];

          if (suggestedList.length > 0) {
            setActiveSuggestedPlaces(suggestedList);
          }

          setMessages((prev) => [
            ...prev,
            {
              id: 'bot-' + Date.now(),
              role: 'bot',
              text: data.reply,
              timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
              suggestedPlaces: suggestedList,
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

  // تفاعل الخريطة مع الشات: إضافة مكان من الخريطة إلى الخطة
  const handleAddPlaceToPlan = async (place: SuggestedMapPlace) => {
    const rawPlace = INITIAL_PLACES.find((p) => p.id === place.id) || {
      id: place.id,
      n: place.n,
      cat: place.cat,
      a: place.a,
      lat: place.lat,
      lon: place.lon,
      disc: place.disc || 0,
      p: 50,
      ds: '',
      cost: 50,
    };

    if (!currentPlan) {
      // إنشاء خطة أولية تحتوي هذا المكان
      const newStop = createStopFromPlace(rawPlace, 1, 2, 'إضافة المكان المختار إلى مسارك الأول.');
      const initialPlan: PlanResult = {
        id: 'plan-' + Date.now(),
        title: `زيارة ${place.n}`,
        summary: `خطة زيارة مباشرة إلى ${place.n}`,
        startTime: '11:00 ص',
        endTime: '12:00 م',
        totalDurationHours: 2,
        totalTravelMinutes: 15,
        totalDistanceKm: 2,
        totalCost: newStop.totalCost,
        budgetEgp: 300,
        partySize: 2,
        transportMode,
        budgetStatus: 'within',
        stops: [newStop],
        isRealStreetRoute: false,
        practicalTips: ['استمتع بزيارة المكان وتفاصيل معالمه.'],
      };
      setCurrentPlan(initialPlan);
      setActiveStopIndex(0);

      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-' + Date.now(),
          role: 'bot',
          text: `تمت إضافة **"${place.n}"** كأول محطة في خطتك الجديدة على الخريطة 🗺️! يمكنك طلب إضافة أماكن أخرى أو سؤال المساعد عما حوله.`,
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          isPlanUpdate: true,
          planSummary: {
            title: initialPlan.title,
            totalCost: initialPlan.totalCost,
            budgetEgp: initialPlan.budgetEgp,
            stopsCount: 1,
          },
        },
      ]);
      return;
    }

    // إضافة المكان للخطة الحالية وإعادة حساب المسار الحقيقي بـ OSRM
    const newStop = createStopFromPlace(
      rawPlace,
      currentPlan.stops.length + 1,
      currentPlan.partySize,
      'إضافة مباشرة من الخريطة بناءً على اختيارك.'
    );

    const updatedStops = [...currentPlan.stops, newStop];
    const newTotalCost = updatedStops.reduce((sum, s) => sum + s.totalCost, 0);

    let routeGeoJSON = currentPlan.routeGeoJSON;
    let isRealStreetRoute = currentPlan.isRealStreetRoute;
    let totalDistanceKm = currentPlan.totalDistanceKm;

    if (updatedStops.length >= 2) {
      try {
        const waypoints = updatedStops.map((s) => ({ lat: s.lat, lon: s.lon }));
        const osrm = await fetchOSRMRoute(waypoints, transportMode);
        routeGeoJSON = osrm.geometry;
        isRealStreetRoute = osrm.isRealStreetRoute;
        totalDistanceKm = Number((osrm.totalDistanceMeters / 1000).toFixed(2));
      } catch (e) {}
    }

    const updatedPlan: PlanResult = {
      ...currentPlan,
      stops: updatedStops,
      totalCost: newTotalCost,
      totalDistanceKm,
      routeGeoJSON,
      isRealStreetRoute,
      budgetStatus: newTotalCost <= currentPlan.budgetEgp ? 'within' : 'exceeded',
    };

    setCurrentPlan(updatedPlan);
    setActiveStopIndex(updatedStops.length - 1);

    setMessages((prev) => [
      ...prev,
      {
        id: 'bot-' + Date.now(),
        role: 'bot',
        text: `تمت إضافة **"${place.n}"** إلى مسار رحلتك وتحديث مسارات الشوارع على الخريطة مباشرة 🧭 (أصبح لديك ${updatedStops.length} محطات بإجمالي ${newTotalCost} ج.م).`,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        isPlanUpdate: true,
        planSummary: {
          title: updatedPlan.title,
          totalCost: newTotalCost,
          budgetEgp: updatedPlan.budgetEgp,
          stopsCount: updatedStops.length,
        },
      },
    ]);
  };

  // تفاعل الخريطة مع الشات: حذف محطة من الخطة
  const handleRemoveStop = async (order: number) => {
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
          text: `تم حذف "${removedStop?.name || 'المحطة'}" ومسح الخطة. يمكنك في أي وقت طلب خروجة جديدة وسأصممها لك فوراً 🧭`,
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      return;
    }

    const newTotalCost = remaining.reduce((sum, s) => sum + s.totalCost, 0);

    let routeGeoJSON = undefined;
    let isRealStreetRoute = false;
    let totalDistanceKm = 0;

    if (remaining.length >= 2) {
      try {
        const waypoints = remaining.map((s) => ({ lat: s.lat, lon: s.lon }));
        const osrm = await fetchOSRMRoute(waypoints, transportMode);
        routeGeoJSON = osrm.geometry;
        isRealStreetRoute = osrm.isRealStreetRoute;
        totalDistanceKm = Number((osrm.totalDistanceMeters / 1000).toFixed(2));
      } catch (e) {}
    }

    const updatedPlan: PlanResult = {
      ...currentPlan,
      stops: remaining,
      totalCost: newTotalCost,
      routeGeoJSON,
      isRealStreetRoute,
      totalDistanceKm,
      budgetStatus: newTotalCost <= currentPlan.budgetEgp ? 'within' : 'exceeded',
    };

    setCurrentPlan(updatedPlan);

    setMessages((prev) => [
      ...prev,
      {
        id: 'bot-' + Date.now(),
        role: 'bot',
        text: `تم حذف **"${removedStop?.name || 'المحطة'}"** من الخطة، وتحديث مسار الشوارع والتكلفة أصبحت (${newTotalCost} ج.م) 🗺️.`,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        isPlanUpdate: true,
        planSummary: {
          title: updatedPlan.title,
          totalCost: newTotalCost,
          budgetEgp: updatedPlan.budgetEgp,
          stopsCount: remaining.length,
        },
      },
    ]);
  };

  // تفاعل الخريطة مع الشات: تعيين نقطة بداية
  const handleSetStartPoint = (point: { name: string; lat: number; lon: number }) => {
    setStartPoint(point);
    if (isRoundTrip) setEndPoint(point);
    setMessages((prev) => [
      ...prev,
      {
        id: 'bot-' + Date.now(),
        role: 'bot',
        text: `🏁 تم تعيين **"${point.name}"** كنقطة انطلاق لمسار الرحلة على الخريطة!`,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // تغيير ترتيب المحطات (تقديم أو تأخير)
  const handleMoveStop = async (fromIdx: number, toIdx: number) => {
    if (!currentPlan) return;
    const stopsCopy = [...currentPlan.stops];
    const [moved] = stopsCopy.splice(fromIdx, 1);
    stopsCopy.splice(toIdx, 0, moved);
    const reordered = stopsCopy.map((s, idx) => ({ ...s, order: idx + 1 }));

    let routeGeoJSON = currentPlan.routeGeoJSON;
    let isRealStreetRoute = currentPlan.isRealStreetRoute;
    let totalDistanceKm = currentPlan.totalDistanceKm;

    if (reordered.length >= 2) {
      try {
        const waypoints = reordered.map((s) => ({ lat: s.lat, lon: s.lon }));
        const osrm = await fetchOSRMRoute(waypoints, transportMode);
        routeGeoJSON = osrm.geometry;
        isRealStreetRoute = osrm.isRealStreetRoute;
        totalDistanceKm = Number((osrm.totalDistanceMeters / 1000).toFixed(2));
      } catch (e) {}
    }

    setCurrentPlan({
      ...currentPlan,
      stops: reordered,
      routeGeoJSON,
      isRealStreetRoute,
      totalDistanceKm,
    });
    setActiveStopIndex(toIdx);
  };

  // بدء محادثة جديدة نظيفة
  const handleResetChat = () => {
    setMessages([]);
    setCurrentPlan(null);
    setActiveSuggestedPlaces([]);
    setInput('');
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch (e) {}
  };

  // حفظ الخطة الحالية
  const handleSavePlan = () => {
    if (!currentPlan) return;
    const alreadySaved = savedTrips.some((t) => t.id === currentPlan.id);
    if (alreadySaved) return;

    const updated = [currentPlan, ...savedTrips];
    setSavedTrips(updated);
    try {
      localStorage.setItem(SAVED_TRIPS_STORAGE, JSON.stringify(updated));
    } catch (e) {}
    confetti({ particleCount: 30, spread: 60 });
  };

  // مشاركة الخطة كرابط
  const handleSharePlan = () => {
    if (!currentPlan) return;
    try {
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(currentPlan))));
      const shareUrl = `${window.location.origin}/ai?plan=${encoded}`;
      navigator.clipboard.writeText(shareUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } catch (e) {}
  };

  const handleSaveSettings = () => {
    try {
      if (customKey.trim()) {
        localStorage.setItem(OPENROUTER_KEY_STORAGE, customKey.trim());
      } else {
        localStorage.removeItem(OPENROUTER_KEY_STORAGE);
      }
      localStorage.setItem(OPENROUTER_MODEL_STORAGE, selectedModel);
      setShowSettingsModal(false);
      confetti({ particleCount: 20, spread: 40 });
    } catch (e) {}
  };

  const handleTestKey = async () => {
    if (!customKey.trim()) {
      setKeyTestFeedback({ ok: false, message: 'يرجى لصق المفتاح أولاً لاختباره.' });
      return;
    }
    setIsTestingKey(true);
    setKeyTestFeedback(null);
    try {
      const res = await fetch('/api/ai-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: customKey.trim(), model: selectedModel }),
      });
      const data = await res.json();
      if (data.ok) {
        setKeyTestFeedback({ ok: true, message: data.message || 'المفتاح يعمل بنجاح ومستعد للتفكير!' });
      } else {
        setKeyTestFeedback({ ok: false, message: data.error || 'فشل الاتصال بالمفتاح' });
      }
    } catch (err: any) {
      setKeyTestFeedback({ ok: false, message: `تعذر الاتصال بالخادم: ${err.message}` });
    } finally {
      setIsTestingKey(false);
    }
  };

  const isCurrentSaved = currentPlan ? savedTrips.some((t) => t.id === currentPlan.id) : false;
  const activeModelObj = POPULAR_MODELS.find((m) => m.id === selectedModel) || {
    id: selectedModel,
    name: selectedModel,
    tag: 'Custom AI',
  };

  const isChatEmpty = messages.length === 0;

  return (
    <div className="space-y-3 max-w-7xl mx-auto pb-6" dir="rtl">
      {/* 1. Header: Sleek, Minimal, ChatGPT-style */}
      <header className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] shadow-xs flex items-center justify-between gap-3">
        {/* Brand & Assistant Status */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-teal2-600 to-indigo-600 text-white grid place-items-center shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black text-ocean-950 dark:text-white leading-tight">
                مساعد بورسعيد الذكي ومخطط الرحلات
              </h1>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="متصل وجاهز" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              استكشاف وتخطيط معالم بورسعيد • {activeModelObj.name.split(' ')[0]}
            </p>
          </div>
        </div>

        {/* Clean Header Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Mobile Tab Switcher Pill */}
          <div className="flex lg:hidden rounded-xl bg-slate-100 dark:bg-[#152332] p-0.5 border border-slate-200 dark:border-[#22354a]">
            <button
              type="button"
              onClick={() => setMobileTab('chat')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                mobileTab === 'chat'
                  ? 'bg-white dark:bg-[#1d2f44] text-ocean-950 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>المحادثة</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('map')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                mobileTab === 'map'
                  ? 'bg-white dark:bg-[#1d2f44] text-ocean-950 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5 text-teal2-600" />
              <span>الخريطة {currentPlan ? `(${currentPlan.stops.length})` : ''}</span>
            </button>
          </div>

          {/* Desktop Map Toggle */}
          <button
            onClick={() => setShowMapPanel(!showMapPanel)}
            type="button"
            className="hidden lg:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#152332] text-ocean-900 dark:text-white hover:bg-slate-200 text-xs font-bold transition border border-slate-200 dark:border-[#1d2d3e]"
            title="تبديل عرض لوحة الخريطة"
          >
            <MapIcon className="w-3.5 h-3.5 text-teal2-600" />
            <span>{showMapPanel ? 'إخفاء الخريطة' : 'عرض الخريطة 🗺️'}</span>
          </button>

          {/* New Chat Button */}
          <button
            onClick={handleResetChat}
            type="button"
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#152332] text-ocean-700 dark:text-white/80 hover:bg-slate-200 text-xs font-bold transition flex items-center gap-1 border border-slate-200 dark:border-[#1d2d3e]"
            title="بدء محادثة جديدة"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">محادثة جديدة</span>
          </button>

          {/* Saved Trips Button */}
          <button
            onClick={() => setShowSavedModal(true)}
            type="button"
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#152332] text-ocean-700 dark:text-white/80 hover:bg-slate-200 text-xs font-bold transition flex items-center gap-1 border border-slate-200 dark:border-[#1d2d3e]"
            title="الرحلات المحفوظة"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">({savedTrips.length})</span>
          </button>

          {/* Settings / AI Key */}
          <button
            onClick={() => setShowSettingsModal(true)}
            type="button"
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-[#152332] text-slate-600 dark:text-slate-300 hover:bg-slate-200 text-xs transition border border-slate-200 dark:border-[#1d2d3e]"
            title="إعدادات الموديل ومفتاح AI"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. Main Workspace Layout: Conversational Centerpiece + Interactive Map */}
      <div className={`grid gap-3 items-start transition-all duration-300 ${showMapPanel ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1 max-w-4xl mx-auto'}`}>
        {/* Chat Space (Primary Focus) */}
        <div
          className={`flex flex-col h-[680px] sm:h-[730px] rounded-3xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] shadow-md overflow-hidden relative ${
            showMapPanel ? 'lg:col-span-5' : 'w-full'
          } ${mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}
        >
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 scrollbar-thin">
            {/* Empty State / Welcome (When conversation is fresh) */}
            {isChatEmpty ? (
              <div className="h-full flex flex-col justify-center items-center text-center p-4 max-w-md mx-auto space-y-4 my-auto">
                <div className="w-12 h-12 rounded-2xl bg-teal2-500/10 dark:bg-teal2-500/20 text-teal2-600 grid place-items-center shadow-xs">
                  <Sparkles className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-lg font-black text-ocean-950 dark:text-white">
                    عايز تكتشف إيه في بورسعيد؟
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    مرشدك ومخطط رحلاتك الذكي. اسألني عن أي معلم أو مطعم، أو اطلب تخطيط خروجة متكاملة على الخريطة.
                  </p>
                </div>

                {/* 4 Clean Quick Suggestion Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-2">
                  {WELCOME_SUGGESTIONS.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleProcessUserMessage(item.prompt)}
                      type="button"
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-[#121f2f] border border-slate-200 dark:border-[#1d2d3e] hover:border-teal2-500 hover:bg-teal2-50/50 dark:hover:bg-teal2-950/20 text-right transition flex flex-col justify-between group shadow-2xs"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-base">{item.icon}</span>
                        <h3 className="font-bold text-xs text-ocean-950 dark:text-white group-hover:text-teal2-600 transition">
                          {item.title}
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 font-normal">
                        {item.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Message Stream */
              messages.map((m) => {
                const isBot = m.role === 'bot';

                return (
                  <div
                    key={m.id}
                    className={`flex items-start gap-2.5 ${isBot ? 'self-start' : 'self-end flex-row-reverse'}`}
                  >
                    {/* Avatar */}
                    {isBot ? (
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white grid place-items-center shrink-0 mt-0.5 shadow-xs text-xs font-black">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-xl bg-teal2-600 text-white grid place-items-center shrink-0 mt-0.5 shadow-xs text-xs font-black">
                        {user?.name?.[0] || 'أنت'}
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed max-w-[88%] shadow-xs ${
                        isBot
                          ? 'bg-slate-50 dark:bg-[#121f2f] text-ocean-950 dark:text-white rounded-tr-xs border border-slate-200 dark:border-[#1d2d3e]'
                          : 'bg-ocean-900 text-white rounded-tl-xs'
                      }`}
                    >
                      {/* Text */}
                      <div className="whitespace-pre-line font-medium leading-relaxed">{m.text}</div>

                      {/* Plan Summary Card inside Chat */}
                      {m.isPlanUpdate && m.planSummary && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-teal2-500/30 text-ocean-900 dark:text-white flex items-center justify-between gap-2 shadow-2xs">
                          <div className="min-w-0">
                            <p className="font-black text-xs truncate">{m.planSummary.title}</p>
                            <p className="text-[10px] text-teal2-700 dark:text-teal2-300 font-bold">
                              {m.planSummary.totalCost} ج.م • {m.planSummary.stopsCount} محطات
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setShowMapPanel(true);
                              if (window.innerWidth < 1024) setMobileTab('map');
                            }}
                            type="button"
                            className="px-2.5 py-1 rounded-lg bg-teal2-600 text-white text-[10px] font-black shrink-0 hover:bg-teal2-500 transition"
                          >
                            عرض الخريطة 🗺️
                          </button>
                        </div>
                      )}

                      {/* Suggested Places interactive chips */}
                      {isBot && m.suggestedPlaces && m.suggestedPlaces.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-white/10 space-y-1.5">
                          <span className="text-[10px] font-bold text-teal2-700 dark:text-teal2-300 block">
                            معالم ومطاعم مقترحة على الخريطة:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {m.suggestedPlaces.map((pl) => (
                              <button
                                key={pl.id}
                                onClick={() => {
                                  setShowMapPanel(true);
                                  if (window.innerWidth < 1024) setMobileTab('map');
                                  setActiveSuggestedPlaces([pl]);
                                }}
                                type="button"
                                className="px-2 py-1 rounded-lg bg-white dark:bg-[#152332] border border-slate-200 dark:border-[#22354a] text-[11px] font-bold text-ocean-900 dark:text-white hover:border-teal2-500 transition flex items-center gap-1 shadow-2xs"
                              >
                                <MapPin className="w-3 h-3 text-rose-500" />
                                <span>{pl.n}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bubble Footer: Timestamp & Copy Button */}
                      <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-black/5 dark:border-white/5 text-[10px] opacity-70">
                        <span dir="ltr">{m.timestamp}</span>

                        {isBot && (
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(m.id, m.text)}
                            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition flex items-center gap-1 text-[10px]"
                            title="نسخ الإجابة"
                          >
                            {copiedMsgId === m.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-600 dark:text-emerald-400">تم النسخ</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>نسخ</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Active Writing Shimmer Indicator */}
            {loading && (
              <div className="flex items-center gap-2 p-2.5 px-3 rounded-2xl bg-slate-50 dark:bg-[#121f2f] text-slate-700 dark:text-slate-300 text-xs font-bold w-fit border border-slate-200 dark:border-[#1d2d3e] shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-teal2-600 animate-spin" />
                <span>مساعد بورسعيد يكتب الرد ويجهز التفاصيل...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* 3. Fixed Input Bar (ChatGPT Simplicity) */}
          <div className="p-3 bg-white dark:bg-[#0c1622] border-t border-slate-200 dark:border-[#1d2d3e]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleProcessUserMessage();
              }}
              className="relative flex items-center gap-2 rounded-2xl bg-slate-50 dark:bg-[#121f2f] border border-slate-300 dark:border-[#1d2d3e] p-1.5 focus-within:border-teal2-500 focus-within:ring-1 focus-within:ring-teal2-500/20 transition shadow-xs"
            >
              {/* GPS Geolocation Button */}
              <button
                type="button"
                onClick={() => handleLocateUser()}
                disabled={locatingUser}
                title={userLocation ? `موقعي محدد في ${userLocation.district || 'بورسعيد'}` : 'تحديد موقعي الحالي بالـ GPS'}
                className={`p-2 rounded-xl transition shrink-0 ${
                  userLocation
                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <MapPin className={`w-4 h-4 ${locatingUser ? 'animate-bounce text-rose-500' : ''}`} />
              </button>

              {/* Chat Input Text Field */}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  currentPlan
                    ? 'اطلب تعديل الخطة (مثلاً: شيل المكان التاني، حط مكان أقرب للبحر)...'
                    : 'اسأل عن أي مكان، أو اطلب خروجة بميزانيتك...'
                }
                className="flex-1 bg-transparent text-ocean-950 dark:text-white outline-none text-xs sm:text-sm font-semibold px-1 py-1.5 placeholder:text-slate-400"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2 rounded-xl bg-ocean-900 text-white disabled:opacity-30 hover:opacity-90 transition shrink-0 shadow-xs"
                title="إرسال"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {locationNotice && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 px-2 font-medium">
                {locationNotice}
              </p>
            )}
          </div>
        </div>

        {/* 4. Interactive Map Panel & Route Canvas */}
        {showMapPanel && (
          <div
            className={`space-y-3 ${isMapExpanded ? 'fixed inset-4 z-50 bg-white dark:bg-[#071322] p-4 rounded-3xl shadow-2xl overflow-y-auto' : 'lg:col-span-7'} ${
              mobileTab === 'map' ? 'block' : 'hidden lg:block'
            }`}
          >
            {/* Top Bar for Map / Plan */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] shadow-xs flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-black text-sm text-ocean-950 dark:text-white truncate">
                    {currentPlan ? currentPlan.title : 'الخريطة الحية ومسارات بورسعيد'}
                  </h2>
                  {currentPlan && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal2-500/15 text-teal2-700 dark:text-teal2-300 border border-teal2-400/30">
                      {currentPlan.totalCost} ج.م • {currentPlan.stops.length} محطات
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {currentPlan
                    ? `⏱️ ${currentPlan.totalDurationHours} ساعات • 👥 ${currentPlan.partySize} أفراد • 🛣️ ${currentPlan.totalDistanceKm} كم مسار حقيقي`
                    : 'انقر على أي علامة أو حدد بداية ونهاية لمسارك'}
                </p>
              </div>

              {/* Action Buttons for Plan */}
              {currentPlan && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleSavePlan}
                    type="button"
                    className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 border ${
                      isCurrentSaved
                        ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-400/40'
                        : 'bg-slate-100 dark:bg-[#162738] text-ocean-900 dark:text-white border-slate-200 dark:border-[#22354a]'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{isCurrentSaved ? 'محفوظة' : 'حفظ'}</span>
                  </button>

                  <button
                    onClick={handleSharePlan}
                    type="button"
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#162738] text-ocean-900 dark:text-white text-xs font-bold transition flex items-center gap-1 border border-slate-200 dark:border-[#22354a]"
                  >
                    {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5 text-teal2-600" />}
                    <span>{copiedShare ? 'تم!' : 'مشاركة'}</span>
                  </button>

                  <button
                    onClick={() => setCurrentPlan(null)}
                    type="button"
                    title="مسح الخطة"
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-[#162738] text-slate-500 hover:text-rose-500 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Interactive Map Component */}
            <div className={`rounded-3xl overflow-hidden border border-slate-200 dark:border-[#1d2d3e] shadow-md relative ${isMapExpanded ? 'h-[75vh]' : 'h-[380px] sm:h-[430px]'}`}>
              <PlannerMap
                plan={currentPlan}
                suggestedPlaces={activeSuggestedPlaces}
                startPoint={startPoint}
                endPoint={isRoundTrip ? startPoint : endPoint}
                userLocation={userLocation}
                activeStopIndex={activeStopIndex}
                onSelectStop={(idx) => setActiveStopIndex(idx)}
                onAddPlaceToPlan={handleAddPlaceToPlan}
                onRemoveStop={handleRemoveStop}
                onSetStartPoint={handleSetStartPoint}
                pickingPointFor={pickingPointFor}
                onStartPickingPoint={(type) => setPickingPointFor(type)}
                onPointPicked={(pt) => {
                  if (pickingPointFor === 'start') {
                    handleSetStartPoint(pt);
                  } else {
                    setEndPoint(pt);
                  }
                  setPickingPointFor(null);
                }}
                onCancelPick={() => setPickingPointFor(null)}
                onViewPlaceDetails={onViewPlaceDetails}
                isExpanded={isMapExpanded}
                onToggleExpand={() => setIsMapExpanded(!isMapExpanded)}
              />
            </div>

            {/* Plan Stops List & Timeline */}
            {currentPlan && (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] shadow-xs space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#1d2d3e]">
                  <h3 className="font-bold text-xs text-ocean-950 dark:text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-teal2-600" />
                    <span>محطات الرحلة ({currentPlan.stops.length} محطات)</span>
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    انقر على أي محطة لتكبيرها على الخريطة
                  </span>
                </div>

                <div className="space-y-2">
                  {currentPlan.stops.map((stop, idx) => {
                    const isSelected = activeStopIndex === idx;
                    return (
                      <div
                        key={stop.placeId || idx}
                        onClick={() => setActiveStopIndex(idx)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-50 dark:bg-[#152336] border-teal2-500 shadow-xs ring-1 ring-teal2-500/30'
                            : 'bg-white dark:bg-[#0f1b2b] border-slate-200 dark:border-[#1d2d3e] hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-lg bg-ocean-900 text-white font-black text-xs grid place-items-center shrink-0">
                              {stop.order}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-black text-xs text-ocean-950 dark:text-white truncate">
                                  {stop.name}
                                </h4>
                                {stop.discountPercent && stop.discountPercent > 0 ? (
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500/15 text-rose-700 dark:text-rose-300">
                                    خصم {stop.discountPercent}%
                                  </span>
                                ) : null}
                              </div>

                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                {stop.categoryLabel} • {stop.area} • التواجد: {stop.arrivalTime} - {stop.departureTime}
                              </p>
                            </div>
                          </div>

                          {/* Stop Controls */}
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="font-bold text-xs text-ocean-900 dark:text-white ml-2">
                              {stop.totalCost > 0 ? `${stop.totalCost} ج.م` : 'مجانًا'}
                            </span>

                            {idx > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveStop(idx, idx - 1);
                                }}
                                type="button"
                                title="تقديم المحطة"
                                className="p-1 rounded-md bg-slate-100 dark:bg-[#162738] text-slate-600 dark:text-slate-300 hover:bg-slate-200"
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
                                className="p-1 rounded-md bg-slate-100 dark:bg-[#162738] text-slate-600 dark:text-slate-300 hover:bg-slate-200"
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
                              className="p-1 rounded-md bg-slate-100 dark:bg-[#162738] text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/40"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Model & AI Key Configuration Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-5 rounded-3xl bg-white dark:bg-[#0d1826] border border-slate-200 dark:border-[#1d2d3e] shadow-2xl space-y-4 text-right"
              dir="rtl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1d2d3e]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-500 grid place-items-center">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-ocean-950 dark:text-white">
                      إعدادات نموذج الذكاء الاصطناعي
                    </h3>
                    <p className="text-[10px] text-slate-500">النموذج المعتمد: {activeModelObj.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Model Selector */}
              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-ocean-950 dark:text-white block">
                  اختر النموذج:
                </label>
                <div className="space-y-1.5">
                  {POPULAR_MODELS.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setSelectedModel(model.id)}
                      className={`w-full p-2.5 rounded-xl border text-right transition flex items-center justify-between text-xs font-bold ${
                        selectedModel === model.id
                          ? 'bg-teal2-500/15 border-teal2-500 text-teal2-800 dark:text-teal2-200'
                          : 'bg-slate-50 dark:bg-[#121f2f] border-slate-200 dark:border-[#1d2d3e] text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{model.name}</span>
                      <span className="text-[10px] opacity-70 shrink-0 mr-1">{model.tag}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom OpenRouter Key */}
              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-ocean-950 dark:text-white flex items-center justify-between">
                  <span>مفتاح OpenRouter API (اختياري):</span>
                  <span className="text-[10px] text-slate-400 font-normal">محفوظ محلياً فقط</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="password"
                      value={customKey}
                      onChange={(e) => {
                        setCustomKey(e.target.value);
                        setKeyTestFeedback(null);
                      }}
                      placeholder="sk-or-v1-..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#121f2f] border border-slate-200 dark:border-[#1d2d3e] text-ocean-950 dark:text-white text-xs outline-none focus:border-teal2-500 font-mono"
                    />
                    <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  </div>
                  <button
                    type="button"
                    onClick={handleTestKey}
                    disabled={isTestingKey || !customKey.trim()}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#152332] text-ocean-900 dark:text-white border border-slate-200 dark:border-[#1d2d3e] text-[11px] font-bold transition disabled:opacity-40 shrink-0"
                  >
                    {isTestingKey ? 'جارٍ الفحص...' : 'فحص المفتاح'}
                  </button>
                </div>

                {keyTestFeedback && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-semibold leading-relaxed border ${
                      keyTestFeedback.ok
                        ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {keyTestFeedback.ok ? '✅ ' : '❌ '}
                    {keyTestFeedback.message}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="flex-1 py-2 rounded-xl bg-teal2-600 hover:bg-teal2-500 text-white font-bold text-xs transition"
                >
                  حفظ وتطبيق
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#152332] text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Saved Trips Modal */}
      <SavedTripsModal
        isOpen={showSavedModal}
        onClose={() => setShowSavedModal(false)}
        savedTrips={savedTrips}
        onLoadTrip={(trip: PlanResult) => {
          setCurrentPlan(trip);
          setActiveStopIndex(0);
          setShowSavedModal(false);
          setShowMapPanel(true);
          const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
          setMessages((prev) => [
            ...prev,
            {
              id: 'restored-' + Date.now(),
              role: 'bot',
              text: `تم استرجاع رحلة "${trip.title}" بنجاح! تفاصيل المحطات ومسار الشوارع معروضة الآن على الخريطة 🧭`,
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
