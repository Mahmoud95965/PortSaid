'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Sparkles,
  RotateCcw,
  Compass,
  MapPin,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Navigation,
  AlertCircle,
  Info,
  Maximize2,
  Map as MapIcon,
  Star,
} from 'lucide-react';
import { isPointInPortSaid, identifyPortSaidDistrict } from '@/lib/geoUtils';

export interface SuggestedPlace {
  id: string;
  n: string;
  cat: string;
  a: string;
  lat: number;
  lon: number;
  disc?: number;
  distanceKm?: number;
}

export interface ChatMessage {
  id: string;
  role: 'bot' | 'me';
  text: string;
  timestamp: string;
  suggestedPlaces?: SuggestedPlace[];
  isError?: boolean;
}

export interface AssistantChatProps {
  onOpenPoints?: () => void;
  onNavigate?: (view: string, arg?: string | null) => void;
}

interface QuickPrompt {
  label: string;
  text: string;
  icon: string;
}

// قائمة الاقتراحات السريعة المقسمة (4 أساسية + 3 إضافية)
const PRIMARY_PROMPTS: QuickPrompt[] = [
  { label: 'خروجة لشخصين 500 ج.م', text: 'خطط لي خروجة لشخصين لمدة 5 ساعات بميزانية 500 جنيه تشمل كافيه ومطعم سمك', icon: '🧭' },
  { label: 'أقرب سمك لموقعي', text: 'إيه أقرب مطعم سمك وسي فود لموقعي الحالي وفيه خصومات؟', icon: '📍' },
  { label: 'كافيهات ممشى القناة', text: 'رشح لي أحسن كافيهات على ممشى القناة لمشاهدة السفن في بورسعيد', icon: '☕' },
  { label: 'النقاط والكوبونات', text: 'إزاي أستفيد من نقاط الزيارة وأحصل على كوبونات خصم للمطاعم؟', icon: '⭐' },
];

const SECONDARY_PROMPTS: QuickPrompt[] = [
  { label: 'فسحة وجبال الملح', text: 'عايز برنامج زيارة للمعدية وجبال الملح في بورفؤاد مع مكان حلويات', icon: '🚢' },
  { label: 'مواصلات كليات الجامعة', text: 'إزاي أروح كليات جامعة بورسعيد بالمينى باص من السكن والمعدية؟', icon: '🚌' },
  { label: 'كاساتا وحلويات سيلفر', text: 'إيه أشهر حلويات بورسعيد وفين ألاقي كاساتا سيلفر الأصلية؟', icon: '🍨' },
];

export const AssistantChat: React.FC<AssistantChatProps> = ({ onOpenPoints, onNavigate }) => {
  const [open, setOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // حالة تحديد الموقع الجغرافي للمستخدم
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; district?: string } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationNotice, setLocationNotice] = useState<{ type: 'success' | 'warn' | 'error'; message: string } | null>(null);

  // حالة المزود الذكي
  const [aiProvider, setAiProvider] = useState<{ enabled: boolean; provider?: string; model?: string } | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'bot',
      text: 'أهلاً بيك في Port Said Hub! 👋 أنا مساعدك البورسعيدي الذكي.\n\nجاهز لمساعدتك في:\n• اقتراح أفضل المطاعم والكافيهات والمعالم 🌊\n• تحديد موقعك بالـ GPS وحساب المسافة لأقرب الأماكن 📍\n• معلومات الخروجات والمواصلات ونقاط الخصم ⭐\n\nاضغط على أي سؤال سريع بالأسفل أو اكتب استفسارك مباشرة 👇',
      timestamp: 'الآن',
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMorePrompts, setShowMorePrompts] = useState(false);

  const chatBodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // التمرير التلقائي لأسفل عند وصول رسالة جديدة
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTo({
        top: chatBodyRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, loading]);

  // التركيز على حقل الإدخال عند فتح النافذة
  useEffect(() => {
    if (open) {
      setShowTooltip(false);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // إخفاء تلميح الزر العائم تلقائياً بعد 5 ثوانٍ
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // إلغاء أي طلب معلق عند تفكيك المكون
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // بدء محادثة جديدة
  const handleResetChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setLoading(false);
    setMessages([
      {
        id: 'new-' + Date.now(),
        role: 'bot',
        text: 'بدأنا محادثة جديدة! 🌊 اسألني عن أي مكان في بورسعيد أو اضغط على «📍» لمشاركة موقعك وحساب الأقرب إليك.',
        timestamp: 'الآن',
      },
    ]);
  }, []);

  // نسخ نص الرسالة بطريقة آمنة
  const handleCopyText = useCallback(async (id: string, text: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.warn('Failed to copy text:', e);
    }
  }, []);

  // تحديد الموقع الجغرافي بالـ GPS
  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationNotice({
        type: 'error',
        message: 'خاصية تحديد الموقع الجغرافي غير مدعومة في متصفحك.',
      });
      return;
    }

    setLocatingUser(true);
    setLocationNotice(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const inside = isPointInPortSaid(lat, lng);

        if (inside) {
          const district = identifyPortSaidDistrict(lat, lng);
          setUserLocation({ lat, lng, district });
          setLocationNotice({
            type: 'success',
            message: `تم تحديد موقعك في: ${district}`,
          });

          const now = new Date();
          const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
          setMessages((prev) => [
            ...prev,
            {
              id: 'loc-' + Date.now(),
              role: 'bot',
              text: `📍 تم تحديد موقعك في **${district}** بنجاح!\nاسألني الآن: "إيه أقرب مطعم سمك ليا؟" أو "أقرب كافيه على الخريطة؟" وسأقيس لك المسافة الواقعية فوراً.`,
              timestamp: timeStr,
            },
          ]);
        } else {
          setLocationNotice({
            type: 'warn',
            message: 'موقعك الحالي يقع خارج النطاق الإداري لمحافظة بورسعيد.',
          });
        }
      },
      (err) => {
        setLocatingUser(false);
        if (err.code === 1) {
          setLocationNotice({
            type: 'error',
            message: 'يرجى السماح بصلاحية الموقع في المتصفح لمشاركة مكانك.',
          });
        } else {
          setLocationNotice({
            type: 'error',
            message: 'تعذر تحديد موقعك الحالي. تأكد من تفعيل الـ GPS.',
          });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // إرسال الرسالة إلى /api/assistant واستقبال الرد داخل النافذة
  const handleSend = useCallback(async (userText?: string) => {
    const textToSend = (userText || input).trim();
    if (!textToSend || loading) return;

    setInput('');

    const now = new Date();
    const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    // إضافة رسالة المستخدم إلى المحادثة
    const userMsg: ChatMessage = {
      id: 'usr-' + Date.now(),
      role: 'me',
      text: textToSend,
      timestamp: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    // إلغاء أي طلب سابق قيد التشغيل
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const historyTurns = messages.slice(-6).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      // استرجاع مفاتيح OpenRouter المخزنة إن وجدت لتعزيز دقة الرد
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (typeof window !== 'undefined') {
        const storedKey = localStorage.getItem('portsaid_openrouter_key');
        const storedModel = localStorage.getItem('portsaid_openrouter_model');
        if (storedKey && storedKey.trim().length > 5) {
          headers['x-openrouter-key'] = storedKey.trim();
        }
        if (storedModel && storedModel.trim() && storedModel !== 'built-in') {
          headers['x-openrouter-model'] = storedModel.trim();
        } else if (storedKey && storedKey.trim().length > 5) {
          headers['x-openrouter-model'] = 'openai/gpt-4.1-nano';
        }
      }

      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          message: textToSend,
          history: historyTurns,
          userLocation: userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `خطأ من الخادم (${res.status})`);
      }

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('استجابة غير صالحة من خادم المساعد.');
      }

      const data = await res.json();

      if (data.ok) {
        if (data.ai_enabled !== undefined) {
          setAiProvider({
            enabled: data.ai_enabled,
            provider: data.provider,
            model: data.model,
          });
        }

        const botReply = data.reply || 'أنا معك يا غالي! اسألني عن أي مكان أو استفسار في بورسعيد.';
        const suggestedPlaces: SuggestedPlace[] = data.suggestedPlaces || [];

        setMessages((prev) => [
          ...prev,
          {
            id: 'bot-' + Date.now(),
            role: 'bot',
            text: botReply,
            timestamp: timeStr,
            suggestedPlaces,
          },
        ]);
      } else {
        throw new Error(data.error || 'تعذر معالجة الرسالة');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;

      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-err-' + Date.now(),
          role: 'bot',
          text: `عفواً، حدث تعذر مؤقت في الاتصال: ${err.message || 'يرجى المحاولة مرة أخرى'}. يمكنك إعادة السؤال أو المحاولة بعد قليل.`,
          timestamp: timeStr,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, userLocation]);

  return (
    <>
      {/* 1. Floating Action Button (FAB) */}
      <div className="fixed left-4 sm:left-6 bottom-4 sm:bottom-6 z-40 flex items-center gap-2.5" dir="rtl">
        {/* Floating Tooltip Pill */}
        <AnimatePresence>
          {showTooltip && !open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.85, x: -10 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(true)}
              className="cursor-pointer hidden min-[420px]:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-[#0c1622] text-ocean-950 dark:text-white shadow-xl border border-slate-200 dark:border-slate-800 text-xs font-bold select-none hover:border-teal2-500 transition"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>مساعد بورسعيد الذكي 👋</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTooltip(false);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
                title="إغلاق التلميح"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clean FAB Button */}
        <motion.button
          onClick={() => setOpen(!open)}
          type="button"
          aria-label="فتح مساعد بورسعيد الذكي"
          title="مساعد بورسعيد الذكي"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-white dark:bg-[#0c1622] p-2 shadow-xl border border-slate-200 dark:border-slate-800 grid place-items-center cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-teal2-500"
        >
          <img
            src="/assets/logo/icon-192.png"
            alt="Port Said Hub"
            className="w-full h-full object-contain filter drop-shadow-xs"
          />
          {/* Status Indicator */}
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0c1622] shadow-xs" />
        </motion.button>
      </div>

      {/* 2. Main Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            dir="rtl"
            className="fixed left-3 sm:left-6 bottom-18 sm:bottom-22 z-50 w-[calc(100vw-1.5rem)] sm:w-[410px] h-[min(580px,calc(100dvh-5.5rem))] flex flex-col rounded-3xl overflow-hidden shadow-2xl bg-white dark:bg-[#0c1622] border border-slate-200 dark:border-[#1d2d3e]"
          >
            {/* Header */}
            <div className="p-3.5 px-4 bg-slate-50 dark:bg-[#101e2e] border-b border-slate-200 dark:border-[#1d2d3e] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 p-0.5 shrink-0">
                  <div className="w-full h-full rounded-[10px] bg-white dark:bg-[#071322] flex items-center justify-center p-1">
                    <img src="/assets/logo/icon-192.png" alt="" className="w-full h-full object-contain" />
                  </div>
                </div>
                <div className="min-w-0 text-right">
                  <h3 className="font-bold text-xs sm:text-sm text-ocean-950 dark:text-white truncate">
                    مساعد بورسعيد الذكي
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {aiProvider?.provider === 'openrouter'
                        ? `متصل • ${aiProvider.model?.split('/')[1] || 'OpenRouter'}`
                        : 'متصل • المساعد المحلي 🧭'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Header Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                {onNavigate && (
                  <button
                    onClick={() => {
                      onNavigate('ai');
                      setOpen(false);
                    }}
                    type="button"
                    title="فتح استوديو الذكاء الاصطناعي الكامل"
                    className="p-1.5 rounded-xl text-slate-500 hover:text-ocean-950 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={handleResetChat}
                  type="button"
                  title="محادثة جديدة"
                  className="p-1.5 rounded-xl text-slate-500 hover:text-ocean-950 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setOpen(false)}
                  type="button"
                  title="إغلاق"
                  className="p-1.5 rounded-xl text-slate-500 hover:text-ocean-950 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Location Notice Banner if Active */}
            <AnimatePresence>
              {locationNotice && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className={`px-3.5 py-1.5 text-[11px] font-bold flex items-center justify-between gap-2 border-b shrink-0 ${
                    locationNotice.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20'
                      : locationNotice.type === 'warn'
                      ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/20'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Info className="w-3 h-3 shrink-0" />
                    <span className="truncate">{locationNotice.message}</span>
                  </span>
                  <button
                    onClick={() => setLocationNotice(null)}
                    type="button"
                    className="p-0.5 hover:opacity-75"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages Body */}
            <div
              ref={chatBodyRef}
              className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 scrollbar-thin bg-slate-50/50 dark:bg-[#08121e]/60"
            >
              {messages.map((m) => {
                const isBot = m.role === 'bot';

                return (
                  <div
                    key={m.id}
                    className={`flex items-start gap-2 ${isBot ? 'self-start' : 'self-end flex-row-reverse'}`}
                  >
                    {isBot && (
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 grid place-items-center text-xs shrink-0 mt-0.5">
                        ⚓
                      </div>
                    )}

                    <div
                      className={`max-w-[86%] p-3 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-xs text-right ${
                        isBot
                          ? m.isError
                            ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-900/40'
                            : 'bg-white dark:bg-[#132030] text-ocean-950 dark:text-white rounded-tr-sm border border-slate-200/90 dark:border-[#1d2d3e]'
                          : 'bg-ocean-900 text-white rounded-tl-sm'
                      }`}
                    >
                      <div className="whitespace-pre-line font-medium leading-relaxed">{m.text}</div>

                      {/* Suggested Places Cards */}
                      {isBot && m.suggestedPlaces && m.suggestedPlaces.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                          <span className="text-[10px] font-bold text-teal2-700 dark:text-teal2-300 block">
                            الأماكن المقترحة على الخريطة:
                          </span>
                          <div className="flex flex-col gap-1.5">
                            {m.suggestedPlaces.map((pl) => (
                              <div
                                key={pl.id}
                                className="p-2 rounded-xl bg-slate-50 dark:bg-[#172638] border border-slate-200/80 dark:border-[#20344c] flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="min-w-0">
                                  <p className="font-bold text-ocean-950 dark:text-white truncate">
                                    {pl.n}
                                  </p>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {pl.a} {pl.disc ? `• خصم ${pl.disc}%` : ''}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {typeof pl.distanceKm === 'number' && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 text-[10px] font-bold text-teal2-700 dark:text-teal2-300 border border-slate-200 dark:border-slate-700">
                                      {pl.distanceKm} كم
                                    </span>
                                  )}

                                  {onNavigate && (
                                    <button
                                      onClick={() => {
                                        onNavigate('map', pl.id);
                                        setOpen(false);
                                      }}
                                      type="button"
                                      title="عرض على الخريطة"
                                      className="p-1 rounded-lg bg-teal2-600 text-white hover:bg-teal2-500 transition"
                                    >
                                      <MapIcon className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Footer: Timestamp & Copy */}
                      <div className="mt-1.5 flex items-center justify-between text-[10px] opacity-60 pt-1">
                        <span>{m.timestamp}</span>

                        {isBot && !m.isError && (
                          <button
                            onClick={() => handleCopyText(m.id, m.text)}
                            type="button"
                            className="inline-flex items-center gap-1 hover:opacity-100 transition px-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
                            title="نسخ الإجابة"
                          >
                            {copiedId === m.id ? (
                              <span className="text-emerald-500 flex items-center gap-0.5 font-bold">
                                <Check className="w-2.5 h-2.5" /> تم النسخ
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5">
                                <Copy className="w-2.5 h-2.5" /> نسخ
                              </span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing Indicator */}
              {loading && (
                <div className="flex items-center gap-2 self-start text-xs font-bold text-slate-500 dark:text-slate-400 p-2 rounded-xl bg-white dark:bg-[#132030] border border-slate-200 dark:border-[#1d2d3e] w-fit shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-teal2-500 animate-spin" />
                  <span>المساعد يكتب الآن...</span>
                </div>
              )}
            </div>

            {/* Quick Prompts Container */}
            <div className="px-3 py-2 bg-slate-50/90 dark:bg-[#101e2e]/90 border-t border-slate-200 dark:border-[#1d2d3e] flex flex-col gap-1.5 shrink-0">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                {PRIMARY_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(p.text)}
                    className="shrink-0 px-2.5 py-1 rounded-full bg-white dark:bg-[#162536] text-[11px] font-bold text-ocean-950 dark:text-white border border-slate-200 dark:border-[#22354a] hover:border-teal2-400 hover:bg-teal2-50 dark:hover:bg-teal2-900/30 transition shadow-2xs flex items-center gap-1"
                  >
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setShowMorePrompts(!showMorePrompts)}
                  className="shrink-0 px-2 py-1 rounded-full text-[11px] font-bold text-slate-500 hover:text-ocean-950 dark:text-slate-400 dark:hover:text-white transition flex items-center gap-0.5"
                >
                  <span>{showMorePrompts ? 'أقل' : 'المزيد'}</span>
                  {showMorePrompts ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Secondary Prompts (Collapsible) */}
              <AnimatePresence>
                {showMorePrompts && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex gap-1.5 overflow-x-auto scrollbar-none pt-1 border-t border-slate-200/60 dark:border-slate-800"
                  >
                    {SECONDARY_PROMPTS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSend(p.text)}
                        className="shrink-0 px-2.5 py-1 rounded-full bg-white dark:bg-[#162536] text-[11px] font-bold text-ocean-950 dark:text-white border border-slate-200 dark:border-[#22354a] hover:border-teal2-400 transition shadow-2xs flex items-center gap-1"
                      >
                        <span>{p.icon}</span>
                        <span>{p.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-2.5 bg-white dark:bg-[#0c1622] border-t border-slate-200 dark:border-[#1d2d3e] flex items-center gap-2 shrink-0"
            >
              {/* GPS Location Button */}
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={locatingUser}
                title={userLocation ? `موقعك محدد في: ${userLocation.district || 'بورسعيد'}` : 'تحديد موقعي بالـ GPS'}
                className={`p-2.5 rounded-2xl transition shrink-0 ${
                  userLocation
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-100 dark:bg-[#152332] text-slate-700 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-[#1d2d3e]'
                }`}
              >
                <Navigation className={`w-4 h-4 ${locatingUser ? 'animate-spin text-teal2-600' : ''}`} />
              </button>

              {/* Text Input */}
              <div className="flex-1 relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      if (e.nativeEvent.isComposing) return;
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="اسأل عن أي مكان أو مطعم في بورسعيد..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#121f2f] text-ocean-950 dark:text-white border border-slate-300 dark:border-[#1d2d3e] focus:border-teal2-500 outline-none text-xs font-semibold placeholder:text-slate-400"
                />
                {input.trim() && (
                  <button
                    type="button"
                    onClick={() => setInput('')}
                    className="absolute left-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2.5 rounded-2xl bg-gradient-to-r from-ocean-900 via-indigo-900 to-teal2-700 text-white disabled:opacity-40 hover:opacity-90 transition shrink-0 shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
