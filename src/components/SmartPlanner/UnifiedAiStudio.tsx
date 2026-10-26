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
  RotateCcw,
  Check,
  Settings,
  X,
  Compass,
  Copy,
  Maximize2,
  Map as MapIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export interface ChatMessage {
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
  plan?: PlanResult;
  showInlineMap?: boolean;
  isInlineMapCollapsed?: boolean;
}

interface UnifiedAiStudioProps {
  initialPrompt?: string | null;
  initialPlanData?: string | null;
  onViewPlaceDetails?: (placeId: string) => void;
  onBackToHome?: () => void;
}

const CHAT_STORAGE_KEY = 'portsaid_unified_ai_chat_v3';
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

const WELCOME_SUGGESTIONS = [
  {
    title: 'أماكن للخروج والفسحة',
    desc: 'أهم المعالم والأنشطة التاريخية والسياحية',
    prompt: 'رشح لي أفضل أماكن للخروج والفسحة في بورسعيد مع تفاصيل كل مكان والأسعار',
    icon: '🧭',
  },
  {
    title: 'مطاعم سمك وكافيهات القناة',
    desc: 'أكلات بحرية وقعدات رايقة على قناة السويس',
    prompt: 'عايز ترشيحات لأحسن مطاعم سمك وكافيهات هادية قريبة من البحر',
    icon: '☕',
  },
  {
    title: 'خطط خروجة بميزانية معينة',
    desc: 'برنامج خروجة منظم بالمواعيد والميزانية',
    prompt: 'خططلي خروجة بميزانية 300 جنيه تشمل كافيه وممشى وزيارة معلم تاريخي',
    icon: '📅',
  },
  {
    title: 'أماكن قريبة مني',
    desc: 'اكتشف الأماكن المحيطة بك بحساب المسافات',
    prompt: 'عايز أماكن حلوة قريبة مني',
    icon: '📍',
  },
];

/**
 * دالة تنسيق وترتيب نصوص الإجابات وتحويل الماركداون لواجهة بصرية منظمة
 */
function renderFormattedMessage(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listBuffer: React.ReactNode[] = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="space-y-1.5 my-2">
          {listBuffer}
        </ul>
      );
      listBuffer = [];
    }
  };

  const formatInline = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-black text-ocean-950 dark:text-teal2-300">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      elements.push(<div key={`space-${idx}`} className="h-2" />);
      return;
    }

    if (line === '---') {
      flushList();
      elements.push(
        <hr key={`hr-${idx}`} className="my-3 border-slate-200 dark:border-white/10" />
      );
      return;
    }

    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3
          key={`h3-${idx}`}
          className="text-sm sm:text-base font-black text-ocean-950 dark:text-white mt-3.5 mb-1.5 flex items-center gap-1.5 border-b border-slate-200/60 dark:border-white/10 pb-1"
        >
          {formatInline(line.slice(4))}
        </h3>
      );
      return;
    }

    if (line.startsWith('#### ')) {
      flushList();
      elements.push(
        <h4
          key={`h4-${idx}`}
          className="text-xs sm:text-sm font-black text-blue-700 dark:text-blue-300 mt-2.5 mb-1"
        >
          {formatInline(line.slice(5))}
        </h4>
      );
      return;
    }

    if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
      listBuffer.push(
        <li key={`li-${idx}`} className="flex items-start gap-2 text-xs sm:text-[13px] leading-relaxed">
          <span className="w-1.5 h-1.5 rounded-full bg-teal2-600 dark:bg-teal2-400 mt-2 shrink-0" />
          <span className="flex-1">{formatInline(line.slice(2))}</span>
        </li>
      );
      return;
    }

    const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      listBuffer.push(
        <li key={`num-${idx}`} className="flex items-start gap-2 text-xs sm:text-[13px] leading-relaxed">
          <span className="w-5 h-5 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-black text-[11px] grid place-items-center shrink-0 mt-0.5 border border-blue-300/40">
            {numMatch[1]}
          </span>
          <span className="flex-1">{formatInline(numMatch[2])}</span>
        </li>
      );
      return;
    }

    flushList();
    elements.push(
      <p key={`p-${idx}`} className="text-xs sm:text-[13px] leading-relaxed font-medium">
        {formatInline(line)}
      </p>
    );
  });

  flushList();
  return <div className="space-y-1">{elements}</div>;
}

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

  // إعدادات المسار
  const [transportMode, setTransportMode] = useState<'driving' | 'walking'>('driving');
  const [startPoint, setStartPoint] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [isRoundTrip, setIsRoundTrip] = useState(true);

  // الخريطة الموسعة بالكامل (Modal)
  const [showFullScreenMap, setShowFullScreenMap] = useState(false);
  const [fullScreenMapData, setFullScreenMapData] = useState<{
    plan: PlanResult | null;
    suggestedPlaces: SuggestedMapPlace[];
    title: string;
  } | null>(null);

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

  // فك شفرة الخطة المشتركة أو البدء بطلب أولي
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
              plan: decoded,
              showInlineMap: true,
            },
          ]);
        }
      } catch (e) {}
    } else if (initialPrompt) {
      handleProcessUserMessage(initialPrompt);
    }
  }, [initialPlanData, initialPrompt]);

  // تحديد الموقع الجغرافي بالـ GPS
  const handleLocateUser = (afterLocatePrompt?: string) => {
    if (!navigator.geolocation) {
      setLocationNotice('تحديد الموقع غير مدعوم في متصفحك.');
      return;
    }

    setLocatingUser(true);
    setLocationNotice(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocatingUser(false);

        if (isPointInPortSaid(lat, lng)) {
          const district = identifyPortSaidDistrict(lat, lng);
          setUserLocation({ lat, lng, district });
          setLocationNotice(`تم تحديد موقعك في: ${district} 📍`);

          if (afterLocatePrompt) {
            handleProcessUserMessage(afterLocatePrompt, { lat, lng, district });
          }
        } else {
          setUserLocation({ lat, lng, district: 'خارج بورسعيد' });
          setLocationNotice('موقعك خارج بورسعيد. سنستخدم معالم وسط المدينة في الترشيحات.');
          if (afterLocatePrompt) {
            handleProcessUserMessage(afterLocatePrompt);
          }
        }
      },
      (err) => {
        setLocatingUser(false);
        setLocationNotice('يرجى السماح بتحديد الموقع في المتصفح لحساب الكيلومترات بدقة.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const getAiHeaders = () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (customKey && customKey.trim().length > 5) {
      headers['x-openrouter-key'] = customKey.trim();
    }
    if (selectedModel) {
      headers['x-openrouter-model'] = selectedModel;
    }
    return headers;
  };

  const handleTestApiKey = async () => {
    if (!customKey.trim()) {
      setKeyTestFeedback({ ok: false, message: 'برجاء إدخال المفتاح أولاً.' });
      return;
    }
    setIsTestingKey(true);
    setKeyTestFeedback(null);
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: getAiHeaders(),
        body: JSON.stringify({ message: 'مرحبا' }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setKeyTestFeedback({
          ok: true,
          message: `المفتاح يعمل بنجاح! المزود: ${data.provider || 'OpenRouter'} (${data.model || selectedModel})`,
        });
        localStorage.setItem(OPENROUTER_KEY_STORAGE, customKey.trim());
        localStorage.setItem(OPENROUTER_MODEL_STORAGE, selectedModel);
      } else {
        setKeyTestFeedback({ ok: false, message: data.error || 'فشل الاتصال بالمفتاح' });
      }
    } catch (e: any) {
      setKeyTestFeedback({ ok: false, message: e.message || 'خطأ أثناء فحص المفتاح' });
    } finally {
      setIsTestingKey(false);
    }
  };

  // معالجة رسائل المستخدم الذكية
  const handleProcessUserMessage = async (
    overrideText?: string,
    passedLocation?: { lat: number; lng: number; district?: string } | null
  ) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: 'me-' + Date.now(),
      role: 'me',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!overrideText) setInput('');
    setLoading(true);

    try {
      const lower = textToSend.toLowerCase();
      const currentLoc = passedLocation !== undefined ? passedLocation : userLocation;

      const isNearbyQuery =
        lower.includes('قريب مني') ||
        lower.includes('اقرب مني') ||
        lower.includes('أقرب مني') ||
        lower.includes('قريبة مني') ||
        lower.includes('جنبي') ||
        lower.includes('موقعي الحالي');

      if (isNearbyQuery && !currentLoc) {
        handleLocateUser(textToSend);
        setLoading(false);
        return;
      }

      // فحص نية تعديل خطة حالية
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

      // فحص هل هو طلب تخطيط رحلة جديدة
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

      const explicitlyWantsMap =
        lower.includes('خريطة') ||
        lower.includes('الخريطة') ||
        lower.includes('وريني') ||
        lower.includes('مسار') ||
        lower.includes('خط السير') ||
        lower.includes('أروح ازاي') ||
        lower.includes('ازاي اروح') ||
        isNearbyQuery;

      if (isRefineRequest && currentPlan) {
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
              text:
                `### ✅ تم تحديث الخطة بنجاح!\n\n` +
                `عدّلت لك المحطات ومسار الشوارع الفعلي بناءً على طلبك: "${textToSend}".\n\n` +
                `• **الميزانية المحدثة:** ${data.plan.totalCost} ج.م (من أصل ${data.plan.budgetEgp} ج.م)\n` +
                `• **عدد المحطات:** ${data.plan.stops.length} محطات بورسعيدية\n\n` +
                `الخريطة المضمنة بالأسفل تم تحديثها تلقائياً بالمسار الجديد. يمكنك استعراضها بالكامل أو طلب أي تعديل آخر! 👇`,
              timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
              isPlanUpdate: true,
              planSummary: {
                title: data.plan.title,
                totalCost: data.plan.totalCost,
                budgetEgp: data.plan.budgetEgp,
                stopsCount: data.plan.stops.length,
              },
              plan: data.plan,
              showInlineMap: true,
            },
          ]);
        } else {
          throw new Error(data.error || 'تعذر تعديل الخطة');
        }
      } else if (isPlanningRequest) {
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
                `### 🧭 صممت لك برنامج خروجة بورسعيدي متكامل ومحسوب:\n\n` +
                `📌 **${data.plan.title}**\n\n` +
                `• 💰 **التكلفة الإجمالية التقديرية:** ${data.plan.totalCost} ج.م (الميزانية المتاحة: ${data.plan.budgetEgp} ج.م)\n` +
                `• ⏳ **المدة الإجمالية:** ${data.plan.totalDurationHours} ساعات • لعدد **${data.plan.partySize} أفراد**\n` +
                `• 🛣️ **المسافة بين المحطات:** ${data.plan.totalDistanceKm} كم مسار شوارع حقيقي\n` +
                `• 📍 **خط السير المقترح:** ${stopsNames}\n\n` +
                `---\n\n` +
                `### 💡 نصائح للتنفيذ\n` +
                `يمكنك بدء الجولة في أي وقت، وتم تفعيل الخريطة المضمنة بالأسفل مع المسارات وأوقات السير. يمكنك تعديل أي محطة بالكتابة مباشرة!`,
              timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
              isPlanUpdate: true,
              planSummary: {
                title: data.plan.title,
                totalCost: data.plan.totalCost,
                budgetEgp: data.plan.budgetEgp,
                stopsCount: data.plan.stops.length,
              },
              plan: data.plan,
              showInlineMap: true,
            },
          ]);
        } else {
          throw new Error(data.error || 'تعذر بناء الخطة');
        }
      } else {
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

          const shouldShowMap = suggestedList.length > 0 || explicitlyWantsMap;

          setMessages((prev) => [
            ...prev,
            {
              id: 'bot-' + Date.now(),
              role: 'bot',
              text: data.reply,
              timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
              suggestedPlaces: suggestedList,
              showInlineMap: shouldShowMap,
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

  const toggleInlineMapCollapse = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId) {
          return { ...m, isInlineMapCollapsed: !m.isInlineMapCollapsed };
        }
        return m;
      })
    );
  };

  const handleCopyMessage = async (msgId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch (e) {}
  };

  const handleClearChat = () => {
    if (confirm('هل تريد مسح سجل المحادثة وبدء محادثة جديدة؟')) {
      setMessages([]);
      setCurrentPlan(null);
      localStorage.removeItem(CHAT_STORAGE_KEY);
    }
  };

  const handleSavePlan = () => {
    if (!currentPlan) return;
    try {
      const existing = savedTrips.filter((t) => t.id !== currentPlan.id);
      const updated = [currentPlan, ...existing];
      setSavedTrips(updated);
      localStorage.setItem(SAVED_TRIPS_STORAGE, JSON.stringify(updated));
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
      alert('تم حفظ خطة الرحلة في رحلاتك المحفوظة بنجاح! ⭐');
    } catch (e) {}
  };

  const handleSharePlan = async () => {
    if (!currentPlan) return;
    try {
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(currentPlan))));
      const shareUrl = `${window.location.origin}/ai?plan=${encoded}`;

      if (navigator.share) {
        await navigator.share({
          title: currentPlan.title,
          text: `شوف خطة رحلتي لبورسعيد (${currentPlan.totalCost} ج.م): ${currentPlan.title}`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2500);
        alert('تم نسخ رابط الخطة للمشاركة بنجاح! 📋');
      }
    } catch (e) {}
  };

  return (
    <div className="max-w-4xl mx-auto w-full min-h-[82vh] flex flex-col justify-between relative pb-6" dir="rtl">
      {/* 1. Header Bar: Title, Model Badge, Clear & Settings */}
      <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] shadow-xs flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 via-teal2-600 to-indigo-600 text-white grid place-items-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-black text-sm sm:text-base text-ocean-950 dark:text-white truncate">
                مساعد بورسعيد ومخطط الرحلات الذكي
              </h1>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="جاهز للمساعدة" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
              {userLocation?.district ? `📍 موقعك: ${userLocation.district}` : 'استكشف بورسعيد، خطط الخروجات، واسأل عن أي مكان'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Model Selector Pill */}
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#152332] text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-[#1d2d3e] transition flex items-center gap-1 border border-slate-200 dark:border-[#22354a]"
            title="تغيير الموديل أو إضافة مفتاح"
          >
            <Settings className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">الموديل:</span>
            <span className="text-[11px] font-black text-blue-600 dark:text-blue-400">
              {selectedModel.includes('gpt-4.1') ? 'GPT-4.1' : selectedModel.split('/')[1] || selectedModel}
            </span>
          </button>

          {/* Saved Trips Button */}
          {savedTrips.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSavedModal(true)}
              className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300/40 transition hover:bg-amber-100"
              title="الرحلات المحفوظة"
            >
              <Bookmark className="w-4 h-4 fill-current" />
            </button>
          )}

          {/* Clear Chat Button */}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition hover:bg-slate-100 dark:hover:bg-[#121f2f]"
              title="محادثة جديدة"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Messages Container (Full Width Stream) */}
      <div className="flex-1 space-y-4 px-1 pb-4">
        {messages.length === 0 ? (
          /* Welcome State (ChatGPT style simplicity) */
          <div className="py-8 sm:py-12 text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 via-teal2-600 to-indigo-600 text-white grid place-items-center mx-auto shadow-lg shadow-blue-600/20">
              <Compass className="w-8 h-8" />
            </div>

            <div className="space-y-1.5 max-w-md mx-auto">
              <h2 className="text-xl sm:text-2xl font-black text-ocean-950 dark:text-white">
                عايز تكتشف إيه في بورسعيد اليوم؟
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                اسألني عن أحسن أماكن الخروج، مطاعم الأسماك، كافيهات البحر، أو اطلب تخطيط خروجة كاملة بميزانيتك ووقتك.
              </p>
            </div>

            {/* Quick Suggestions Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto text-right pt-2">
              {WELCOME_SUGGESTIONS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleProcessUserMessage(item.prompt)}
                  className="p-3.5 rounded-2xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] hover:border-blue-500 hover:shadow-sm transition text-right group flex items-start gap-3"
                >
                  <span className="text-2xl shrink-0 p-1.5 rounded-xl bg-slate-50 dark:bg-[#121f2f]">
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="font-black text-xs sm:text-sm text-ocean-950 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium line-clamp-1">
                      {item.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages Stream */
          messages.map((m) => {
            const isBot = m.role === 'bot';

            return (
              <div
                key={m.id}
                className={`flex items-start gap-2.5 ${isBot ? 'self-start' : 'self-end flex-row-reverse'}`}
              >
                {/* Avatar */}
                {isBot ? (
                  <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white grid place-items-center shrink-0 mt-0.5 shadow-xs text-xs font-black">
                    <Sparkles className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-2xl bg-ocean-900 text-white grid place-items-center shrink-0 mt-0.5 shadow-xs text-xs font-black">
                    {user?.name?.[0] || 'أنت'}
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`p-4 sm:p-5 rounded-3xl text-xs sm:text-sm leading-relaxed max-w-[92%] shadow-xs ${
                    isBot
                      ? 'bg-white dark:bg-[#0c1622] text-ocean-950 dark:text-white rounded-tr-xs border border-slate-200 dark:border-[#1d2d3e]'
                      : 'bg-ocean-900 text-white rounded-tl-xs'
                  }`}
                >
                  {/* Formatted Markdown Content */}
                  {isBot ? (
                    renderFormattedMessage(m.text)
                  ) : (
                    <div className="whitespace-pre-line font-medium leading-relaxed">{m.text}</div>
                  )}

                  {/* Contextual Inline Map inside Bot Message */}
                  {isBot && m.showInlineMap && (
                    <div className="mt-4 rounded-2xl border border-slate-200 dark:border-[#1d2d3e] bg-slate-50 dark:bg-[#121f2f] overflow-hidden shadow-xs">
                      {/* Map Header Bar */}
                      <div className="p-2.5 px-3 bg-white dark:bg-[#0c1622] border-b border-slate-200 dark:border-[#1d2d3e] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MapIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span className="font-black text-xs text-ocean-950 dark:text-white truncate">
                            {m.isPlanUpdate && m.planSummary
                              ? `مسار الخروجة: ${m.planSummary.title} (${m.planSummary.stopsCount} محطات)`
                              : `خريطة الأماكن المحددة (${(m.suggestedPlaces || []).length} مواقع)`}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setFullScreenMapData({
                                plan: m.plan || currentPlan,
                                suggestedPlaces: m.suggestedPlaces || activeSuggestedPlaces,
                                title: m.planSummary?.title || 'خريطة بورسعيد التفاعلية',
                              });
                              setShowFullScreenMap(true);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black transition flex items-center gap-1 shadow-2xs"
                            title="عرض الخريطة بالكامل في شاشة مستقلة"
                          >
                            <Maximize2 className="w-3 h-3" />
                            <span>عرض بالكامل ⤢</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleInlineMapCollapse(m.id)}
                            className="p-1 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                            title={m.isInlineMapCollapsed ? 'إظهار الخريطة' : 'إخفاء الخريطة'}
                          >
                            {m.isInlineMapCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Map Viewport */}
                      {!m.isInlineMapCollapsed && (
                        <div className="p-2 space-y-2">
                          <div className="h-60 sm:h-72 rounded-xl overflow-hidden relative border border-slate-200 dark:border-[#1d2d3e]">
                            <PlannerMap
                              plan={m.plan || (m.isPlanUpdate ? currentPlan : null)}
                              suggestedPlaces={m.suggestedPlaces || activeSuggestedPlaces}
                              userLocation={userLocation}
                              activeStopIndex={activeStopIndex}
                              onSelectStop={(idx) => setActiveStopIndex(idx)}
                              onViewPlaceDetails={onViewPlaceDetails}
                            />
                          </div>

                          {/* Place Tags below Map */}
                          {m.suggestedPlaces && m.suggestedPlaces.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {m.suggestedPlaces.map((pl) => (
                                <button
                                  key={pl.id}
                                  type="button"
                                  onClick={() => {
                                    setFullScreenMapData({
                                      plan: null,
                                      suggestedPlaces: [pl],
                                      title: pl.n,
                                    });
                                    setShowFullScreenMap(true);
                                  }}
                                  className="px-2 py-0.5 rounded-lg bg-white dark:bg-[#0c1622] text-[10px] font-bold text-ocean-950 dark:text-white border border-slate-200 dark:border-[#22354a] flex items-center gap-1 hover:border-blue-400 transition"
                                >
                                  <MapPin className="w-2.5 h-2.5 text-rose-500" />
                                  <span>{pl.n}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bubble Footer: Timestamp & Copy Button */}
                  <div className="flex items-center justify-between gap-2 mt-3 pt-1.5 border-t border-black/5 dark:border-white/5 text-[10px] opacity-70">
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

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center gap-2 p-3 px-4 rounded-2xl bg-white dark:bg-[#0c1622] text-slate-700 dark:text-slate-300 text-xs font-bold w-fit border border-slate-200 dark:border-[#1d2d3e] shadow-xs">
            <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
            <span>مساعد بورسعيد يكتب الرد ويرتب التفاصيل...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* 3. Fixed Bottom Input Bar (ChatGPT Simplicity) */}
      <div className="sticky bottom-2 z-20 pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleProcessUserMessage();
          }}
          className="relative flex items-center gap-2 rounded-3xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] p-2 shadow-lg focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/15 transition"
        >
          {/* GPS Geolocation Button */}
          <button
            type="button"
            onClick={() => handleLocateUser()}
            disabled={locatingUser}
            title={userLocation ? `موقعي محدد في ${userLocation.district || 'بورسعيد'}` : 'تحديد موقعي الحالي بالـ GPS'}
            className={`p-2.5 rounded-2xl transition shrink-0 ${
              userLocation
                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MapPin className={`w-4 h-4 ${locatingUser ? 'animate-bounce text-rose-500' : ''}`} />
          </button>

          {/* Input Text Field */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              currentPlan
                ? 'اطلب تعديل الخطة (مثلاً: شيل المكان التاني، حط مكان أقرب للبحر)...'
                : 'اسأل عن أي مكان، أو اطلب خروجة بميزانيتك...'
            }
            className="flex-1 bg-transparent text-ocean-950 dark:text-white outline-none text-xs sm:text-sm font-semibold px-1 py-1 placeholder:text-slate-400"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-2xl bg-blue-600 text-white disabled:opacity-30 hover:bg-blue-500 transition shrink-0 shadow-xs"
            title="إرسال"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {locationNotice && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 px-3 font-medium text-center">
            {locationNotice}
          </p>
        )}
      </div>

      {/* 4. Full-Screen Map Modal (When user clicks 'عرض بالكامل ⤢') */}
      <AnimatePresence>
        {showFullScreenMap && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-ocean-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-5"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#071322] rounded-3xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-[#1d2d3e]"
            >
              {/* Modal Top Bar */}
              <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-[#1d2d3e] flex items-center justify-between gap-3 bg-white dark:bg-[#0c1622]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white grid place-items-center">
                    <MapIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-ocean-950 dark:text-white">
                      {fullScreenMapData?.title || 'خريطة بورسعيد التفاعلية'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      استكشف المعالم والمسارات الحقيقية بحرية كاملة
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {fullScreenMapData?.plan && (
                    <button
                      type="button"
                      onClick={handleSharePlan}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#152332] text-xs font-bold text-ocean-950 dark:text-white flex items-center gap-1 border border-slate-200 dark:border-[#22354a]"
                    >
                      <Share2 className="w-3.5 h-3.5 text-teal2-600" />
                      <span>مشاركة</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowFullScreenMap(false)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#152332] dark:hover:bg-[#1d2d3e] text-slate-600 dark:text-slate-300 transition"
                    title="إغلاق الخريطة والعودة للمحادثة"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Map Viewport */}
              <div className="flex-1 relative">
                <PlannerMap
                  plan={fullScreenMapData?.plan || currentPlan}
                  suggestedPlaces={fullScreenMapData?.suggestedPlaces || activeSuggestedPlaces}
                  userLocation={userLocation}
                  activeStopIndex={activeStopIndex}
                  onSelectStop={(idx) => setActiveStopIndex(idx)}
                  onViewPlaceDetails={onViewPlaceDetails}
                  isExpanded={true}
                  onToggleExpand={() => setShowFullScreenMap(false)}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Model Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white dark:bg-[#0c1622] rounded-3xl p-5 sm:p-6 w-full max-w-lg border border-slate-200 dark:border-[#1d2d3e] shadow-2xl space-y-4 text-right"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#162232]">
                <h3 className="font-black text-base text-ocean-950 dark:text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  <span>إعدادات نموذج الذكاء الاصطناعي</span>
                </h3>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Model Choice */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  اختر النموذج المفضل:
                </label>
                <div className="space-y-1.5">
                  {POPULAR_MODELS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedModel(m.id);
                        localStorage.setItem(OPENROUTER_MODEL_STORAGE, m.id);
                      }}
                      className={`w-full p-2.5 rounded-2xl border text-right transition flex items-center justify-between gap-2 text-xs font-bold ${
                        selectedModel === m.id
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-600 text-blue-700 dark:text-blue-300'
                          : 'bg-slate-50 dark:bg-[#121f2f] border-slate-200 dark:border-[#1d2d3e] text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{m.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#22354a]">
                        {m.tag}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Key */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  مفتاح OpenRouter API (اختياري):
                </label>
                <input
                  type="password"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#22354a] bg-slate-50 dark:bg-[#121f2f] text-xs font-mono outline-none focus:border-blue-600"
                />
                <p className="text-[10px] text-slate-400">
                  إذا لم تضع مفتاحاً، سيعمل المحرك المحلي الافتراضي المدمج بكفاءة وسرعة.
                </p>
              </div>

              {keyTestFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-bold ${
                    keyTestFeedback.ok
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300'
                  }`}
                >
                  {keyTestFeedback.message}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleTestApiKey}
                  disabled={isTestingKey}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#152332] text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  {isTestingKey ? 'جارٍ الفحص...' : 'فحص الاتصال'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
                >
                  حفظ وإغلاق
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Saved Trips Modal */}
      <SavedTripsModal
        isOpen={showSavedModal}
        onClose={() => setShowSavedModal(false)}
        savedTrips={savedTrips}
        onLoadTrip={(trip) => {
          setCurrentPlan(trip);
          setShowSavedModal(false);
          setFullScreenMapData({
            plan: trip,
            suggestedPlaces: [],
            title: trip.title,
          });
          setShowFullScreenMap(true);
        }}
        onDeleteTrip={(id) => {
          const updated = savedTrips.filter((t) => t.id !== id);
          setSavedTrips(updated);
          localStorage.setItem(SAVED_TRIPS_STORAGE, JSON.stringify(updated));
        }}
      />
    </div>
  );
};
