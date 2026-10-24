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
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Car,
  Footprints,
  Check,
  Brain,
  Settings,
  Cpu,
  Key,
  X,
  Layers,
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
  thinkingProcess?: string[];
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
const OPENROUTER_KEY_STORAGE = 'portsaid_openrouter_key';
const OPENROUTER_MODEL_STORAGE = 'portsaid_openrouter_model';

const POPULAR_MODELS = [
  { id: 'openai/gpt-4.1-nano', name: 'OpenAI GPT-4.1 Nano (الموديل المعتمد فائق السرعة)', tag: 'Default ⭐' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash (سريع ودقيق)', tag: 'Fast ⚡' },
  { id: 'google/gemini-2.0-flash-thinking-exp:free', name: 'Gemini 2.0 Flash Thinking (مجاني ويفكر)', tag: 'Free 💡' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (تفكير متعمق واستدلال كامل)', tag: 'Reasoning 🧠' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 (ذكاء عالي وسريع)', tag: 'Fast ⚡' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (مجاني وقوي)', tag: 'Free 🦙' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (فائق الذكاء)', tag: 'Premium 🎯' },
  { id: 'built-in', name: 'المحرك المحلي الافتراضي (بدون مفتاح)', tag: 'Offline 🏠' },
];

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

  // إعدادات المسار
  const [transportMode, setTransportMode] = useState<'driving' | 'walking'>('driving');
  const [startPoint, setStartPoint] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [isRoundTrip, setIsRoundTrip] = useState(true);
  const [pickingPointFor, setPickingPointFor] = useState<'start' | 'end' | null>(null);

  // إعدادات الموديل و OpenRouter
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [customKey, setCustomKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('openai/gpt-4.1-nano');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestFeedback, setKeyTestFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  // 2. حالة الشات والمحادثة المدمجة
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'bot',
      text:
        'أهلاً بك في مركز الذكاء الاصطناعي والتخطيط الذكي لـ Port Said Hub 🌊\n\n' +
        'أنا مساعدك ومخطط رحلاتك المتصل بالخريطة الحية ومسارات شوارع بورسعيد:\n' +
        '• اطلب أي خروجة بميزانيتك ووقتك ➔ هصمم لك الخطة والمسار الفعلي فوراً 🧭\n' +
        '• الموديل يفكر ويحلل خطوات المسار والميزانية جغرافياً بدقة 🧠\n' +
        '• عدّل أي محطة بالكلام المباشر أو اسأل عن أي مكان ومواصلاته 🗺️',
      thinkingProcess: [
        '⚡ تهيئة محرك التحليل الجغرافي لبورسعيد وبورفؤاد.',
        '🗺️ تحميل قاعدة بيانات الأماكن المعتمدة وحساب المسافات.',
        '🟢 جاهز لاستقبال طلبات التخطيط والاستفسارات الحية.',
      ],
      timestamp: 'الآن',
    },
  ]);
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({
    'welcome-1': false,
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; district?: string } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  // 3. التبويب في الشاشات الصغيرة (الموبايل)
  const [mobileView, setMobileView] = useState<'chat' | 'canvas'>('chat');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
          const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
          setMessages((prev) => [
            ...prev,
            {
              id: 'shared-' + Date.now(),
              role: 'bot',
              text: `تم فتح خطة الرحلة المشتركة: "${decoded.title}". تفاصيل المحطات ومسار الشوارع معروضة مباشرة في الخريطة على يسارك 🧭`,
              thinkingProcess: [
                '📥 استيراد خطة الرحلة المشتركة والتحقق من سلامة البيانات.',
                `📍 عدد المحطات: ${decoded.stops.length} محطات بتكلفة ${decoded.totalCost} ج.م.`,
                '🛣️ عرض المسار الواقعي على الخريطة التفاعلية.',
              ],
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

          const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
          setMessages((prev) => [
            ...prev,
            {
              id: 'loc-' + Date.now(),
              role: 'bot',
              text: `📍 تم تحديد موقعك الحالي بنجاح في ${district}! يمكنك الآن طلب خروجة تنطلق من مكانك مباشرة أو السؤال عن أقرب الأماكن إليك.`,
              thinkingProcess: [
                `📡 استقبال إحداثيات الـ GPS: (${lat.toFixed(4)}, ${lng.toFixed(4)}).`,
                `🏛️ التحقق من النطاق الإداري: الموقع يقع داخل حدود ${district}.`,
                '🎯 تعيين الموقع كنقطة انطلاق افتراضية لحساب المسافات ومسارات الشوارع.',
              ],
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

  // إرسال ومعالجة الرسالة في المكان الموحد
  const handleProcessUserMessage = async (rawText?: string) => {
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
          confetti({ particleCount: 35, spread: 65, origin: { y: 0.8 } });

          const newBotId = 'bot-' + Date.now();
          setMessages((prev) => [
            ...prev,
            {
              id: newBotId,
              role: 'bot',
              text: `تمام يا غالي! تم تعديل الخطة بناءً على طلبك: "${textToSend}". تم تحديث مسار الشوارع والتكلفة الإجمالية أصبحت (${data.plan.totalCost} ج.م من أصل ${data.plan.budgetEgp} ج.م) والجدول والخريطة اتحدثوا على يسارك مباشرة 🧭`,
              thinkingProcess: data.thinkingProcess || [
                `🔄 تطبيق تعديل المستخدم: "${textToSend}".`,
                '🛣️ إعادة حساب مسارات الشوارع الواقعية والمسافات.',
                '💰 تحديث الميزانية والإجماليات.',
              ],
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
          setExpandedThinking((prev) => ({ ...prev, [newBotId]: true }));
        } else {
          throw new Error(data.error || 'تعذر تعديل الخطة');
        }
      } else if (isPlanningRequest) {
        // 2. تخطيط رحلة جديدة بالذكاء الاصطناعي
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
          confetti({ particleCount: 50, spread: 80, origin: { y: 0.7 } });

          const stopsNames = data.plan.stops.map((s: PlanStop) => s.name).join(' ➔ ');
          const newBotId = 'bot-' + Date.now();

          setMessages((prev) => [
            ...prev,
            {
              id: newBotId,
              role: 'bot',
              text:
                `صممت لك خطة خروجة بورسعيدية متكاملة! 🧭\n\n` +
                `📌 **${data.plan.title}**\n` +
                `💰 التكلفة المقدرة: **${data.plan.totalCost} ج.م** (الميزانية المحددة: ${data.plan.budgetEgp} ج.م)\n` +
                `⏳ المدة: **${data.plan.totalDurationHours} ساعات** • **${data.plan.partySize} أفراد** • المسافة: **${data.plan.totalDistanceKm} كم**\n` +
                `🛣️ خط السير: ${stopsNames}\n\n` +
                `الخريطة ومسار الشوارع الفعلي وجدول المواعيد جاهزين على يسارك. تقدر تسألني عن أي تفاصيل أو تقولي أعدل أي محطة! 👇`,
              thinkingProcess: data.thinkingProcess || [
                `🎯 تحليل نية المستخدم: استخراج المعايير والتفضيلات.`,
                `🗺️ فحص ومطابقة أماكن بورسعيد المعتمدة جغرافياً.`,
                `🛣️ حساب مسارات الشوارع الواقعية عبر OSRM.`,
                `💰 التحقق من ملاءمة الميزانية والتوقيت.`,
              ],
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
          setExpandedThinking((prev) => ({ ...prev, [newBotId]: true }));

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
          headers: getAiHeaders(),
          body: JSON.stringify({
            message: textToSend,
            history: historyTurns,
            userLocation: userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null,
          }),
        });

        const data = await res.json();
        if (data.ok) {
          const newBotId = 'bot-' + Date.now();
          setMessages((prev) => [
            ...prev,
            {
              id: newBotId,
              role: 'bot',
              text: data.reply,
              thinkingProcess: data.thinkingProcess || [],
              timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
              suggestedPlaces: data.suggestedPlaces || [],
            },
          ]);
          if (data.thinkingProcess && data.thinkingProcess.length > 0) {
            setExpandedThinking((prev) => ({ ...prev, [newBotId]: true }));
          }
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
        thinkingProcess: [
          `🗑️ حذف محطة: "${removedStop?.name}".`,
          `📊 إعادة تسلسل المحطات المتبقية (${remaining.length} محطات).`,
          `💰 إعادة حساب التكلفة الإجمالية: ${newTotalCost} ج.م.`,
        ],
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
        text: 'بدأنا جلسة جديدة ونظيفة! 🌊 اسألني عن أي مكان في بورسعيد أو اطلب خروجة جديدة بالميزانية والوقت اللي يناسبك.',
        timestamp: 'الآن',
      },
    ]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
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

  const toggleThinking = (id: string) => {
    setExpandedThinking((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isCurrentSaved = currentPlan ? savedTrips.some((t) => t.id === currentPlan.id) : false;
  const activeModelObj = POPULAR_MODELS.find((m) => m.id === selectedModel) || {
    id: selectedModel,
    name: selectedModel,
    tag: 'Custom AI',
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8">
      {/* 1. Sleek Minimalist Top Header */}
      <header className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] shadow-md flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto text-right">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal2-600 to-indigo-600 text-white grid place-items-center shrink-0 shadow-md">
            <Brain className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-ocean-950 dark:text-white leading-tight">
                مركز الذكاء الاصطناعي ومخطط الرحلات
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal2-500/15 text-teal2-700 dark:text-teal2-300 border border-teal2-400/30">
                {activeModelObj.tag}
              </span>
            </div>
            <p className="text-[11px] text-ocean-700/80 dark:text-white/70 font-medium">
              شات تفاعلي يفكر ويحلل بالذكاء الاصطناعي مع خريطة حية لمسارات بورسعيد
            </p>
          </div>
        </div>

        {/* Clean Header Action Buttons */}
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end flex-wrap">
          <button
            onClick={handleLocateUser}
            disabled={locatingUser}
            type="button"
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#152332] text-ocean-900 dark:text-white hover:bg-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 dark:border-[#1d2d3e]"
            title="تحديد موقعك الحالي بالـ GPS"
          >
            <MapPin className={`w-3.5 h-3.5 text-rose-500 ${locatingUser ? 'animate-bounce' : ''}`} />
            <span>{locatingUser ? 'جارٍ التحديد...' : userLocation ? userLocation.district || 'موقعي محدد' : 'موقعي GPS'}</span>
          </button>

          <button
            onClick={() => setShowSavedModal(true)}
            type="button"
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#152332] text-ocean-900 dark:text-white hover:bg-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 dark:border-[#1d2d3e]"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-500" />
            <span>رحلاتي ({savedTrips.length})</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            type="button"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              customKey
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-400/30'
                : 'bg-slate-100 dark:bg-[#152332] text-ocean-900 dark:text-white hover:bg-slate-200 border-slate-200 dark:border-[#1d2d3e]'
            }`}
            title="إعدادات الموديل ومفتاح AI"
          >
            <Settings className={`w-3.5 h-3.5 ${customKey ? 'text-emerald-500 animate-spin' : 'text-indigo-500'}`} style={{ animationDuration: '6s' }} />
            <span>{customKey ? 'AI مفعّل 🟢' : 'إضافة مفتاح AI'}</span>
          </button>

          <button
            onClick={handleResetChatAndPlan}
            type="button"
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#152332] text-ocean-700 dark:text-white/70 hover:bg-slate-200 text-xs font-bold transition flex items-center gap-1"
            title="جلسة جديدة"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">جديد</span>
          </button>
        </div>
      </header>

      {/* 2. Mobile Tab Switcher */}
      <div className="flex lg:hidden rounded-2xl bg-slate-200/90 dark:bg-[#0c1622] p-1 border border-slate-300 dark:border-[#1d2d3e]">
        <button
          onClick={() => setMobileView('chat')}
          type="button"
          className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            mobileView === 'chat'
              ? 'bg-white dark:bg-[#162738] text-ocean-950 dark:text-white shadow-sm'
              : 'text-ocean-700 dark:text-white/60'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-teal2-600" />
          <span>المحادثة والذكاء ({messages.length})</span>
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
          <Compass className="w-3.5 h-3.5 text-indigo-500" />
          <span>الخريطة والمسار {currentPlan ? `(${currentPlan.stops.length})` : '🗺️'}</span>
        </button>
      </div>

      {/* 3. Unified Workspace: Chat (5 cols) + Canvas (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-h-[640px]">
        {/* Right Column: Conversational AI Co-Pilot */}
        <div
          className={`lg:col-span-5 flex flex-col h-[650px] sm:h-[700px] rounded-3xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] shadow-xl overflow-hidden relative ${
            mobileView === 'chat' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Minimal Chat Sub-Header */}
          <div className="p-3 px-4 bg-slate-50 dark:bg-[#101e2e] border-b border-slate-200 dark:border-[#1d2d3e] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-ocean-900 dark:text-white">
                مساعد بورسعيد الذكي
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                • {activeModelObj.name.split(' ')[0]}
              </span>
            </div>

            {currentPlan && (
              <button
                onClick={() => setMobileView('canvas')}
                type="button"
                className="lg:hidden px-2.5 py-1 rounded-xl bg-teal2-500/20 text-teal2-700 dark:text-teal2-300 text-[11px] font-black border border-teal2-400/30"
              >
                الخريطة 🗺️
              </button>
            )}
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 scrollbar-thin">
            {messages.map((m) => {
              const isBot = m.role === 'bot';
              const isThinkingOpen = expandedThinking[m.id] ?? false;

              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 ${isBot ? 'self-start' : 'self-end flex-row-reverse'}`}
                >
                  {/* Avatar */}
                  {isBot ? (
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white grid place-items-center shrink-0 mt-0.5 shadow-sm text-xs font-black">
                      <Brain className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-xl bg-teal2-600 text-white grid place-items-center shrink-0 mt-0.5 shadow-sm text-xs font-black">
                      {user?.name?.[0] || 'أنت'}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`p-3.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed max-w-[88%] shadow-sm ${
                      isBot
                        ? 'bg-slate-50 dark:bg-[#121f2f] text-ocean-950 dark:text-white rounded-tr-sm border border-slate-200 dark:border-[#1d2d3e]'
                        : 'bg-gradient-to-r from-ocean-900 to-teal2-700 text-white rounded-tl-sm'
                    }`}
                  >
                    {/* Collapsible Thinking Block */}
                    {isBot && m.thinkingProcess && m.thinkingProcess.length > 0 && (
                      <div className="mb-2.5 rounded-xl border border-indigo-500/20 bg-indigo-950/20 dark:bg-indigo-950/40 p-2 text-xs">
                        <button
                          type="button"
                          onClick={() => toggleThinking(m.id)}
                          className="w-full flex items-center justify-between font-bold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-200 transition text-right"
                        >
                          <div className="flex items-center gap-1.5">
                            <Brain className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                            <span>تفكير وتحليل النموذج ({m.thinkingProcess.length} خطوات)</span>
                          </div>
                          {isThinkingOpen ? (
                            <ChevronUp className="w-3.5 h-3.5 text-indigo-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                          )}
                        </button>

                        <AnimatePresence>
                          {isThinkingOpen && (
                            <motion.ul
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-2 space-y-1.5 border-t border-indigo-500/15 pt-2 text-[11px] text-slate-700 dark:text-slate-300 overflow-hidden font-normal"
                            >
                              {m.thinkingProcess.map((step, sIdx) => (
                                <li key={sIdx} className="flex items-start gap-1.5 leading-relaxed">
                                  <span className="text-indigo-400 select-none">•</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Main Text Content */}
                    <div className="whitespace-pre-line font-medium leading-relaxed">{m.text}</div>

                    {/* Plan Summary Badge */}
                    {m.isPlanUpdate && m.planSummary && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-teal2-500/30 text-ocean-900 dark:text-white flex items-center justify-between gap-2 shadow-sm">
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
                      <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-white/10 space-y-1.5">
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
                              className="px-2 py-1 rounded-lg bg-white dark:bg-[#152332] border border-slate-200 dark:border-[#22354a] text-[11px] font-bold text-ocean-900 dark:text-white hover:border-teal2-500 transition flex items-center gap-1 shadow-xs"
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

            {/* Active Thinking Shimmer */}
            {loading && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-indigo-50 dark:bg-[#121f2f] text-indigo-900 dark:text-indigo-200 text-xs font-bold w-fit border border-indigo-200 dark:border-indigo-900/40 shadow-sm animate-pulse">
                <Brain className="w-4 h-4 text-indigo-500 animate-spin" />
                <span>الذكاء الاصطناعي يفكر ويحلل النطاق الجغرافي والميزانية...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts Carousel */}
          <div className="px-3 py-2 bg-slate-50/90 dark:bg-[#101e2e]/90 border-t border-slate-200 dark:border-[#1d2d3e] flex gap-1.5 overflow-x-auto scrollbar-none">
            {QUICK_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleProcessUserMessage(p.text)}
                type="button"
                className="shrink-0 px-2.5 py-1 rounded-full bg-white dark:bg-[#162536] text-[11px] font-bold text-ocean-900 dark:text-white border border-slate-200 dark:border-[#22354a] hover:border-teal2-400 hover:bg-teal2-50 dark:hover:bg-teal2-900/30 transition shadow-xs flex items-center gap-1"
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          {/* Clean Floating Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleProcessUserMessage();
            }}
            className="p-3 bg-white dark:bg-[#0c1622] border-t border-slate-200 dark:border-[#1d2d3e] flex items-center gap-2"
          >
            <button
              type="button"
              onClick={handleLocateUser}
              title="تحديد موقعي الجغرافي"
              className="p-2.5 rounded-2xl bg-slate-100 dark:bg-[#162738] text-ocean-800 dark:text-slate-300 hover:bg-slate-200 transition shrink-0"
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
              className="flex-1 px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#121f2f] text-ocean-950 dark:text-white border border-slate-300 dark:border-[#1d2d3e] focus:border-teal2-500 outline-none text-xs sm:text-sm font-semibold transition"
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-2xl bg-gradient-to-r from-ocean-900 via-indigo-900 to-teal2-700 text-white disabled:opacity-40 hover:opacity-90 transition shrink-0 shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Left Column: Live Planner Canvas & Map */}
        <div
          className={`lg:col-span-7 flex flex-col space-y-4 ${
            mobileView === 'canvas' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Canvas Top Bar */}
          <div className="p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
                  اطلب أي خروجة في الشات وستظهر محطات ومسار الشوارع الفعلي هنا فوراً
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
                      : 'bg-slate-100 dark:bg-[#162738] text-ocean-900 dark:text-white hover:bg-slate-200 border-slate-300 dark:border-[#22354a]'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>{isCurrentSaved ? 'محفوظة' : 'حفظ'}</span>
                </button>

                <button
                  onClick={handleSharePlan}
                  type="button"
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#162738] text-ocean-900 dark:text-white hover:bg-slate-200 text-xs font-bold transition flex items-center gap-1 border border-slate-300 dark:border-[#22354a]"
                >
                  {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5 text-teal2-600" />}
                  <span>{copiedShare ? 'تم النسخ!' : 'مشاركة'}</span>
                </button>

                <button
                  onClick={() => setCurrentPlan(null)}
                  type="button"
                  title="مسح الخطة"
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-[#162738] text-ocean-600 dark:text-white/60 hover:text-rose-500 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Interactive Map Container */}
          <div className="h-[360px] sm:h-[400px] rounded-3xl overflow-hidden border border-slate-200 dark:border-[#1d2d3e] shadow-xl relative">
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
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] shadow-md space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#1d2d3e]">
                <h3 className="font-black text-xs sm:text-sm text-ocean-950 dark:text-white flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-teal2-600" />
                  <span>جدول المحطات الزمني ({currentPlan.stops.length} محطات)</span>
                </h3>
                <span className="text-[11px] text-ocean-700/70 dark:text-white/60 font-medium">
                  اضغط على أي محطة لتكبيرها على الخريطة
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
                          ? 'bg-slate-50 dark:bg-[#152336] border-teal2-500 shadow-md ring-1 ring-teal2-500/30'
                          : 'bg-white dark:bg-[#0f1b2b] border-slate-200 dark:border-[#1d2d3e] hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
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
                                className="p-1 rounded-lg bg-slate-100 dark:bg-[#162738] hover:bg-slate-200 text-ocean-700 dark:text-white/70"
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
                                className="p-1 rounded-lg bg-slate-100 dark:bg-[#162738] hover:bg-slate-200 text-ocean-700 dark:text-white/70"
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
                              className="p-1 rounded-lg bg-slate-100 dark:bg-[#162738] hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 transition"
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
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e] shadow-md space-y-3">
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
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-[#101e2e] border border-slate-200 dark:border-[#1d2d3e] hover:border-teal2-500 text-right transition flex flex-col justify-between"
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

      {/* Model & AI Key Configuration Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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
                    <p className="text-[10px] text-slate-500">تحكم بمحرك التفكير ومفاتيح OpenRouter</p>
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
                  اختر نموذج الذكاء الاصطناعي:
                </label>
                <div className="space-y-1.5">
                  {POPULAR_MODELS.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setSelectedModel(model.id)}
                      className={`w-full p-2.5 rounded-xl border text-right transition flex items-center justify-between text-xs font-bold ${
                        selectedModel === model.id
                          ? 'bg-indigo-500/15 border-indigo-500 text-indigo-700 dark:text-indigo-300'
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
                  <span>مفتاح OpenRouter API:</span>
                  <span className="text-[10px] text-slate-400 font-normal">محفوظ محلياً فقط في متصفحك</span>
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
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#121f2f] border border-slate-200 dark:border-[#1d2d3e] text-ocean-950 dark:text-white text-xs outline-none focus:border-indigo-500 font-mono"
                    />
                    <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  </div>
                  <button
                    type="button"
                    onClick={handleTestKey}
                    disabled={isTestingKey || !customKey.trim()}
                    className="px-3 py-2 rounded-xl bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-400/30 text-[11px] font-bold hover:bg-indigo-500/25 transition disabled:opacity-40 shrink-0"
                  >
                    {isTestingKey ? 'جارٍ الفحص...' : 'فحص المفتاح 🔍'}
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

                <p className="text-[10px] text-slate-500 leading-relaxed pt-0.5">
                  احصل على مفتاح مجاني من <a href="https://openrouter.ai" target="_blank" rel="noreferrer" className="text-teal2-600 underline">openrouter.ai</a> وستتمكن من استخدام أقوى نماذج الذكاء التوليدي الحقيقي في العالم!
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-teal2-600 to-indigo-600 text-white font-bold text-xs hover:opacity-95 transition"
                >
                  حفظ وتفعيل
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
          const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
          setMessages((prev) => [
            ...prev,
            {
              id: 'restored-' + Date.now(),
              role: 'bot',
              text: `تم استرجاع رحلة "${trip.title}" بنجاح! الخريطة ومسار الشوارع معروضة الآن على يسارك 🧭`,
              thinkingProcess: [
                `📂 فتح الرحلة المحفوظة: "${trip.title}".`,
                `🗺️ تجهيز محطات الرحلة (${trip.stops.length} محطات) ومسار الشوارع.`,
              ],
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
