'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Sparkles,
  RotateCcw,
  Star,
  Compass,
  MapPin,
  Utensils,
  Bus,
  Bed,
  Store,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Navigation,
  ExternalLink,
  Info,
  Map as MapIcon,
  Cpu,
} from 'lucide-react';
import { isPointInPortSaid, identifyPortSaidDistrict } from '@/lib/geoUtils';

interface SuggestedPlace {
  id: string;
  n: string;
  cat: string;
  a: string;
  lat: number;
  lon: number;
  disc?: number;
  distanceKm?: number;
}

interface ChatMessage {
  id: string;
  role: 'bot' | 'me';
  text: string;
  timestamp: string;
  suggestedPlaces?: SuggestedPlace[];
}

interface AssistantChatProps {
  onOpenPoints?: () => void;
  onNavigate?: (view: string, arg?: string | null) => void;
}

interface QuickPrompt {
  label: string;
  text: string;
  icon: string;
}

const QUICK_PROMPTS: QuickPrompt[] = [
  { label: 'أقرب مكان لموقعي', text: '📍 إيه أقرب مطعم سمك وكافيه لموقعي الحالي؟', icon: '📍' },
  { label: 'النقاط والكوبونات', text: '⭐ إزاي أستفيد من النقط والكوبونات وأوفر فلوس؟', icon: '⭐' },
  { label: 'أكل وسمك', text: '🐟 أحسن مطعم سمك وسي فود وسوق السمك فين؟', icon: '🐟' },
  { label: 'خريطة بورسعيد', text: '🗺️ افتح خريطة بورسعيد التفاعلية واعرض الأماكن', icon: '🗺️' },
  { label: 'مواصلات الجامعة', text: '🚌 إزاي أروح كليات جامعة بورسعيد بالمينى باص؟', icon: '🚌' },
  { label: 'خروجة وفسح', text: '🏛️ رتب لي يوم خروجة وفسحة في بورسعيد وبورفؤاد', icon: '🏛️' },
  { label: 'سكن الطلبة', text: '🏠 إيه أحسن مناطق لسكن الطلاب والمغتربين؟', icon: '🏠' },
  { label: 'كاساتا وحلويات', text: '🍨 إيه أشهر حلويات بورسعيد وفين ألاقي كاساتا سيلفر؟', icon: '🍨' },
  { label: 'انضمام التجار', text: '🏬 إزاي أسجل متجري أو مطعمي كشريك في Hubs؟', icon: '🏬' },
];

export const AssistantChat: React.FC<AssistantChatProps> = ({ onOpenPoints, onNavigate }) => {
  const [open, setOpen] = useState(false);
  const [hasOpenedBefore, setHasOpenedBefore] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // حالة تحديد الموقع الجغرافي للمستخدم
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; district?: string } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<{ enabled: boolean; provider?: string; model?: string } | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'bot',
      text: 'أهلاً بيك يا غالي في Port Said Hub! 👋 أنا "مساعد بورسعيد الذكي".\n\nأنا متصل بالكامل بخريطة بورسعيد التفاعلية وأقدر أساعدك في:\n• تحديد موقعك بالـ GPS واقتراح أقرب الأماكن والمطاعم ليك 📍\n• عرض أي مكان بالضغط عليه فوراً على الخريطة 🗺️\n• كسب النقاط واستبدالها بكوبونات خصم حقيقية 10%-20% ⭐\n• خطوط المينى باص وسكن الطلبة 🚌\n\nاضغط على "📍 موقعي" أو اسألني أي سؤال 👇',
      timestamp: 'الآن',
    },
  ]);

  const [input, setInput] = useState('');
  const [showQuick, setShowQuick] = useState(true);
  const [loading, setLoading] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // التمرير التلقائي لأسفل
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
      setHasOpenedBefore(true);
      setShowTooltip(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [open]);

  // إخفاء تلميح الزر العائم بعد 8.5 ثوانٍ
  useEffect(() => {
    const t = setTimeout(() => {
      setShowTooltip(false);
    }, 8500);
    return () => clearTimeout(t);
  }, []);

  const handleResetChat = () => {
    setMessages([
      {
        id: 'new-' + Date.now(),
        role: 'bot',
        text: 'بدأنا محادثة جديدة! 🌊 اسألني عن أي مكان أو شارك موقعك لأرشح لك الأقرب على الخريطة.',
        timestamp: 'الآن',
      },
    ]);
    setShowQuick(true);
  };

  const handleCopyText = (id: string, text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {}
  };

  // وظيفة تحديد ومشاركة موقع المستخدم بالـ GPS
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationNotice('تحديد الموقع الجغرافي غير مدعوم في متصفحك.');
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
          setLocationNotice(`تم تحديد موقعك بنجاح في ${district} 📍`);

          // إضافة رسالة تأكيد لطيفة من البوت
          const now = new Date();
          const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
          setMessages((prev) => [
            ...prev,
            {
              id: 'loc-' + Date.now(),
              role: 'bot',
              text: `📍 تم تحديد موقعك في "${district}" بنجاح!\nاسألني الآن: "إيه أقرب مطعم سمك ليا؟" أو "أقرب كافيه أو معلم سياحي؟" وسأقيس لك المسافة بالضبط.`,
              timestamp: timeStr,
            },
          ]);
        } else {
          setLocationNotice(`موقعك الحالي (${lat.toFixed(2)}, ${lng.toFixed(2)}) يقع خارج حدود بورسعيد.`);
        }
      },
      (err) => {
        setLocatingUser(false);
        if (err.code === 1) {
          setLocationNotice('يرجى السماح بصلاحية الموقع في المتصفح لمشاركة مكانك.');
        } else {
          setLocationNotice('تعذر تحديد الموقع، يرجى التأكد من تشغيل الـ GPS.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleSend = async (userText?: string) => {
    const textToSend = userText || input.trim();
    if (!textToSend || loading) return;

    // فحص طلب فتح الخريطة
    if (textToSend.includes('افتح خريطة') || textToSend.includes('الخريطة التفاعلية') || textToSend.includes('عرض الخريطة')) {
      if (onNavigate) {
        onNavigate('map');
        setOpen(false);
        return;
      }
    }

    setInput('');
    setShowQuick(false);

    const now = new Date();
    const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    // رسالة المستخدم
    const userMsg: ChatMessage = {
      id: 'usr-' + Date.now(),
      role: 'me',
      text: textToSend,
      timestamp: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const historyTurns = messages.map((m) => ({
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
        if (data.ai_enabled !== undefined) {
          setAiProvider({
            enabled: data.ai_enabled,
            provider: data.provider,
            model: data.model,
          });
        }

        const botReply = data.reply || 'أنا معاك يا بطل! اسألني عن أي حاجة في بورسعيد.';
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
        throw new Error(data.error || 'Response error');
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-err-' + Date.now(),
          role: 'bot',
          text: 'عفواً حدث بطء مؤقت في الاتصال. لكن تقدر تسألني عن أي حاجة وسأجيبك فوراً.',
          timestamp: timeStr,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) using Official App Icon */}
      <div className="fixed left-3 sm:left-5 bottom-3 sm:bottom-5 z-50 flex items-center gap-3">
        {/* Floating Speech Tooltip */}
        <AnimatePresence>
          {showTooltip && !open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: -15 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: -15 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={() => setOpen(true)}
              className="cursor-pointer hidden min-[400px]:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-[#0c1622] text-ocean-900 dark:text-white shadow-2xl border border-sand-300 dark:border-teal2-500/40 text-xs font-black select-none hover:scale-105 transition"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>مساعد بورسعيد والخريطة 👋 جاهز لخدمتك!</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTooltip(false);
                }}
                className="text-ocean-700/60 dark:text-white/50 hover:text-ocean-900 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating App Icon Button with Multi-layer Animated Rings */}
        <motion.button
          onClick={() => setOpen(!open)}
          type="button"
          aria-label="مساعد بورسعيد الذكي"
          title="مساعد بورسعيد الذكي - اضغط للتحدث"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          whileHover={{ scale: 1.12, rotate: 4 }}
          whileTap={{ scale: 0.92 }}
          className="relative group w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#f8f4ea] via-[#ffe3a8] to-[#ffb938] p-1 shadow-2xl shadow-ocean-900/40 border-2 border-white/80 grid place-items-center touch-manipulation cursor-pointer"
        >
          {/* Animated Glowing Wave Rings */}
          <span className="absolute -inset-1 rounded-full bg-amber-400/40 blur-md group-hover:bg-teal2-400/50 transition-colors pointer-events-none" />
          <span className="absolute -inset-2 rounded-full border-2 border-amber-400/40 animate-ping opacity-30 pointer-events-none" />

          {/* Official App Logo Icon */}
          <div className="relative z-10 w-full h-full rounded-full bg-white dark:bg-[#071322] flex items-center justify-center p-2 overflow-hidden shadow-inner border border-amber-300/50">
            <img
              src="/assets/logo/icon-192.png"
              alt="Port Said Hub"
              className="w-full h-full object-contain filter drop-shadow-sm group-hover:scale-110 transition-transform duration-300"
            />
          </div>

          {/* Active Online Indicator Dot */}
          <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-md flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          </span>
        </motion.button>
      </div>

      {/* Main Chat Window Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 35 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 35 }}
            transition={{ type: 'spring', stiffness: 350, damping: 26 }}
            className="fixed left-2 sm:left-4 bottom-20 sm:bottom-24 z-50 w-[min(27rem,calc(100vw-1rem))] h-[min(40rem,calc(100vh-6.5rem))] flex flex-col rounded-3xl overflow-hidden shadow-2xl bg-white dark:bg-[#0b1624] border border-sand-300 dark:border-[#1d2d3e] backdrop-blur-xl"
          >
            {/* Header: App Brand, Live Status, Controls */}
            <div className="bg-gradient-to-r from-ocean-950 via-ocean-900 to-teal2-800 text-white p-3.5 sm:p-4 flex items-center justify-between gap-2 border-b border-white/10 relative overflow-hidden shadow-md">
              {/* Subtle background glow */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-teal2-400/10 rounded-full blur-2xl pointer-events-none" />

              {/* Bot Info with Official App Icon */}
              <div className="flex items-center gap-2.5 min-w-0 relative z-10">
                <motion.div
                  className="w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-b from-[#f8f4ea] to-[#ffe3a8] p-1.5 border-2 border-white/70 shadow-lg flex items-center justify-center relative overflow-hidden"
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.6 }}
                >
                  <img
                    src="/assets/logo/icon-192.png"
                    alt="Port Said Hub"
                    className="w-full h-full object-contain"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
                </motion.div>

                <div className="min-w-0 leading-tight">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-black text-sm sm:text-base text-white truncate tracking-tight">
                      مساعد بورسعيد الذكي
                    </h3>
                    <Sparkles className="w-3.5 h-3.5 text-sand-400 animate-spin" style={{ animationDuration: '8s' }} />
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] text-teal2-200 font-bold truncate">
                      {aiProvider?.provider === 'openrouter'
                        ? 'مدعوم بـ OpenRouter ⚡'
                        : 'متصل 24/7 • مرتبط بالخريطة 🗺️'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-1.5 relative z-10 shrink-0">
                {onNavigate && (
                  <button
                    onClick={() => {
                      onNavigate('map');
                      setOpen(false);
                    }}
                    title="فتح خريطة بورسعيد"
                    type="button"
                    className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-sand-200 hover:text-white flex items-center gap-1 text-[11px] font-bold transition"
                  >
                    <Compass className="w-3.5 h-3.5 text-sand-300" />
                    <span className="hidden sm:inline">الخريطة</span>
                  </button>
                )}

                <button
                  onClick={handleResetChat}
                  title="بدء محادثة جديدة"
                  type="button"
                  className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 text-white/90 grid place-items-center transition text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setOpen(false)}
                  title="إغلاق المحادثة"
                  type="button"
                  className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 text-white grid place-items-center transition"
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
                  className="px-3.5 py-2 bg-teal2-500/15 dark:bg-teal2-950/60 border-b border-teal2-500/30 text-teal2-800 dark:text-teal2-300 text-xs font-bold flex items-center justify-between gap-2"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{locationNotice}</span>
                  </span>
                  <button onClick={() => setLocationNotice(null)} type="button">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chat Messages Body */}
            <div
              ref={chatBodyRef}
              className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-4 flex flex-col gap-3.5 bg-sand-50/60 dark:bg-[#07111c]/70 text-xs sm:text-sm"
            >
              {messages.map((m) => {
                const isBot = m.role === 'bot';
                const mentionsPoints = isBot && (m.text.includes('نقط') || m.text.includes('كوبون') || m.text.includes('خصم'));
                const mentionsFish = isBot && (m.text.includes('سمك') || m.text.includes('كاستن') || m.text.includes('الجندي') || m.text.includes('أكل'));
                const mentionsBus = isBot && (m.text.includes('مواصلات') || m.text.includes('مينى باص') || m.text.includes('خط'));
                const mentionsHousing = isBot && (m.text.includes('سكن') || m.text.includes('شقق') || m.text.includes('مغترب'));
                const mentionsTour = isBot && (m.text.includes('فسح') || m.text.includes('خروج') || m.text.includes('معالم') || m.text.includes('جبال الملح'));
                const mentionsSweets = isBot && (m.text.includes('كاساتا') || m.text.includes('حلويات') || m.text.includes('سيلفر'));

                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 25 }}
                    className={`flex items-start gap-2 max-w-[92%] ${isBot ? 'self-start' : 'self-end flex-row-reverse'}`}
                  >
                    {/* Bot Avatar */}
                    {isBot && (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-b from-[#f8f4ea] to-[#ffe3a8] border border-amber-300 shadow-sm shrink-0 grid place-items-center p-1 mt-0.5">
                        <img src="/assets/logo/icon-192.png" alt="Bot" className="w-full h-full object-contain" />
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`relative group p-3.5 sm:p-4 rounded-3xl leading-relaxed font-semibold text-xs sm:text-sm shadow-md transition-all ${
                        isBot
                          ? 'bg-white dark:bg-[#132030] text-ocean-950 dark:text-white rounded-tr-sm border border-sand-200/90 dark:border-[#1d2d3e]'
                          : 'bg-gradient-to-r from-ocean-900 via-ocean-800 to-teal2-700 text-white rounded-tl-sm'
                      }`}
                    >
                      {/* Message Text with Line Breaks */}
                      <div className="whitespace-pre-line leading-relaxed">{m.text}</div>

                      {/* Bot Suggested Places Map Pills (Deep Linking to Map) */}
                      {isBot && m.suggestedPlaces && m.suggestedPlaces.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-sand-200/80 dark:border-white/10 flex flex-col gap-2">
                          <div className="text-[11px] font-black text-teal2-700 dark:text-teal2-300 flex items-center gap-1.5">
                            <Compass className="w-3.5 h-3.5 text-teal2-500 animate-pulse" />
                            <span>اضغط لمعاينة المكان على الخريطة التفاعلية:</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {m.suggestedPlaces.map((pl) => (
                              <motion.button
                                key={pl.id}
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  if (onNavigate) {
                                    onNavigate('map', pl.id);
                                    setOpen(false);
                                  }
                                }}
                                type="button"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-ocean-900 to-teal2-800 text-white font-black text-[11px] shadow hover:shadow-md transition"
                              >
                                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>{pl.n}</span>
                                {typeof pl.distanceKm === 'number' && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-sand-200 text-[10px]">
                                    {pl.distanceKm} كم
                                  </span>
                                )}
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Interactive Category Action Pills */}
                      {isBot && (
                        <div className="mt-3 pt-2.5 border-t border-sand-200/60 dark:border-white/10 flex flex-wrap gap-1.5">
                          {mentionsPoints && onOpenPoints && (
                            <button
                              onClick={() => {
                                onOpenPoints();
                                setOpen(false);
                              }}
                              type="button"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-ocean-950 font-black text-[11px] shadow hover:opacity-95 transition"
                            >
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <span>رصيد النقاط والكوبونات 👈</span>
                            </button>
                          )}

                          {onNavigate && (
                            <button
                              onClick={() => {
                                onNavigate('map');
                                setOpen(false);
                              }}
                              type="button"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sand-100 dark:bg-sand-900/50 text-ocean-900 dark:text-sand-200 font-bold text-[11px] border border-sand-300/50 hover:bg-sand-200 transition"
                            >
                              <Compass className="w-3.5 h-3.5 text-teal2-600" />
                              <span>فتح الخريطة 🗺️</span>
                            </button>
                          )}

                          {mentionsFish && onNavigate && (
                            <button
                              onClick={() => {
                                onNavigate('list', 'food');
                                setOpen(false);
                              }}
                              type="button"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal2-100 dark:bg-teal2-950/70 text-teal2-800 dark:text-teal2-300 font-bold text-[11px] border border-teal2-300/40 hover:bg-teal2-200 transition"
                            >
                              <Utensils className="w-3.5 h-3.5 text-teal2-600" />
                              <span>مطاعم الأسماك 🐟</span>
                            </button>
                          )}

                          {mentionsBus && onNavigate && (
                            <button
                              onClick={() => {
                                onNavigate('bus');
                                setOpen(false);
                              }}
                              type="button"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ocean-100 dark:bg-ocean-950/70 text-ocean-900 dark:text-ocean-200 font-bold text-[11px] border border-ocean-300/40 hover:bg-ocean-200 transition"
                            >
                              <Bus className="w-3.5 h-3.5 text-ocean-700" />
                              <span>شبكة المواصلات 🚌</span>
                            </button>
                          )}

                          {mentionsHousing && onNavigate && (
                            <button
                              onClick={() => {
                                onNavigate('housing');
                                setOpen(false);
                              }}
                              type="button"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-900 dark:text-purple-200 font-bold text-[11px] border border-purple-300/40 hover:bg-purple-200 transition"
                            >
                              <Bed className="w-3.5 h-3.5 text-purple-600" />
                              <span>دليل سكن الطلبة 🏠</span>
                            </button>
                          )}

                          {mentionsSweets && onNavigate && (
                            <button
                              onClick={() => {
                                onNavigate('list', 'sweets');
                                setOpen(false);
                              }}
                              type="button"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-900 dark:text-rose-200 font-bold text-[11px] border border-rose-300/40 hover:bg-rose-200 transition"
                            >
                              <span>كاساتا وحلويات 🍨</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Footer Info: Timestamp & Copy Button */}
                      <div className="mt-2 flex items-center justify-between text-[10px] text-ocean-700/60 dark:text-white/50 pt-1">
                        <span>{m.timestamp}</span>

                        {isBot && (
                          <button
                            onClick={() => handleCopyText(m.id, m.text)}
                            type="button"
                            className="inline-flex items-center gap-1 opacity-70 hover:opacity-100 transition px-1.5 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10"
                            title="نسخ الإجابة"
                          >
                            {copiedId === m.id ? (
                              <span className="text-emerald-500 flex items-center gap-1 font-bold">
                                <Check className="w-3 h-3" /> تم النسخ
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Copy className="w-3 h-3" /> نسخ
                              </span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Animated Typing Indicator */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 self-start"
                >
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-b from-[#f8f4ea] to-[#ffe3a8] border border-amber-300 grid place-items-center p-1">
                    <img src="/assets/logo/icon-192.png" alt="" className="w-full h-full object-contain" />
                  </div>
                  <div className="p-3 rounded-2xl bg-white dark:bg-[#132030] border border-sand-200 dark:border-[#1d2d3e] text-xs font-bold text-ocean-800 dark:text-white/80 flex items-center gap-2 shadow-sm">
                    <span className="text-[11px]">مساعد بورسعيد بيبحث لك</span>
                    <span className="inline-flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal2-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-teal2-500 animate-bounce" style={{ animationDelay: '180ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-teal2-500 animate-bounce" style={{ animationDelay: '360ms' }} />
                    </span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Quick Prompts Toggle */}
            <button
              onClick={() => setShowQuick(!showQuick)}
              type="button"
              className="flex items-center justify-between px-4 py-2 text-xs font-black bg-sand-100/80 dark:bg-[#111e2d] text-ocean-900 dark:text-sand-300 border-t border-sand-200/90 dark:border-[#1d2d3e] transition hover:bg-sand-200"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>أسئلة ومقترحات سريعة جاهزة</span>
              </span>
              <div className="flex items-center gap-1 text-[11px] text-ocean-700/70 dark:text-white/60">
                <span>{showQuick ? 'إخفاء' : 'عرض'}</span>
                {showQuick ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </div>
            </button>

            {/* Quick Prompt Chips Carousel */}
            <AnimatePresence>
              {showQuick && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden bg-white dark:bg-[#0c1622] border-t border-sand-200/80 dark:border-[#1d2d3e]"
                >
                  <div className="flex gap-2 overflow-x-auto p-2.5 scrollbar-none">
                    {QUICK_PROMPTS.map((prompt, i) => (
                      <motion.button
                        key={i}
                        type="button"
                        onClick={() => handleSend(prompt.text)}
                        className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold bg-sand-50 dark:bg-[#162536] text-ocean-900 dark:text-white border border-sand-200/90 dark:border-[#22354a] hover:bg-teal2-100 dark:hover:bg-teal2-900/50 hover:border-teal2-400 transition whitespace-nowrap shadow-sm flex items-center gap-1.5"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <span>{prompt.icon}</span>
                        <span>{prompt.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* User Active Location Indicator Badge */}
            {userLocation && (
              <div className="px-3 py-1.5 bg-emerald-500/10 dark:bg-emerald-950/40 border-t border-emerald-500/20 flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
                  <span>
                    موقعك محدد: <strong>{userLocation.district || 'بورسعيد'}</strong> ({userLocation.lat.toFixed(3)}, {userLocation.lng.toFixed(3)})
                  </span>
                </span>
                <button
                  onClick={() => setUserLocation(null)}
                  type="button"
                  title="إلغاء تحديد الموقع"
                  className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Input Bar with GPS Button */}
            <div className="p-3 border-t border-sand-200/90 dark:border-[#1d2d3e] flex items-center gap-2 bg-white dark:bg-[#0b1624]">
              {/* GPS Geolocation Button */}
              <motion.button
                onClick={handleGetLocation}
                disabled={locatingUser}
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                title="تحديد ومشاركة موقعك الحالي بالـ GPS"
                className={`w-10 h-10 shrink-0 rounded-2xl grid place-items-center transition border ${
                  userLocation
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/30'
                    : 'bg-sand-100 dark:bg-[#162536] text-ocean-800 dark:text-sand-300 border-sand-300 dark:border-[#22354a] hover:bg-sand-200'
                }`}
              >
                <Navigation className={`w-4 h-4 ${locatingUser ? 'animate-spin' : ''}`} />
              </motion.button>

              <div className="flex-1 relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="اسأل عن أي مكان أو أقرب مطعم لموقعك..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSend();
                  }}
                  className="w-full rounded-2xl border border-sand-300 dark:border-[#22354a] bg-sand-50 dark:bg-[#132030] pr-4 pl-9 py-2.5 text-xs sm:text-sm text-ocean-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal2-500 font-medium placeholder:text-ocean-700/50 dark:placeholder:text-white/40 shadow-inner"
                />
                {input.trim() && (
                  <button
                    onClick={() => setInput('')}
                    type="button"
                    className="absolute left-2.5 w-5 h-5 rounded-full bg-sand-200 dark:bg-[#203042] text-ocean-700 dark:text-white/70 grid place-items-center text-xs"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <motion.button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className={`w-11 h-11 shrink-0 rounded-2xl grid place-items-center transition shadow-lg ${
                  input.trim() && !loading
                    ? 'bg-gradient-to-r from-teal2-600 to-ocean-800 text-white shadow-teal2-600/30'
                    : 'bg-sand-200 dark:bg-[#1c2d40] text-ocean-700/40 dark:text-white/30 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
