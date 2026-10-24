'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  MapPin,
  Compass,
  Navigation,
  Copy,
  Check,
  RotateCcw,
  Menu,
  X,
  ArrowRight,
  Utensils,
  Bus,
  Bed,
  Star,
  ExternalLink,
  MessageSquare,
  Clock,
  ChevronRight,
  Info,
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

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

interface GeminiChatViewProps {
  initialPrompt?: string | null;
  onNavigate?: (view: string, arg?: string | null) => void;
  onOpenPoints?: () => void;
  onBack?: () => void;
}

const STORAGE_KEY = 'portsaid_hub_gemini_sessions_v1';
const ACTIVE_SESSION_KEY = 'portsaid_hub_gemini_active_session_id';

const QUICK_CARDS = [
  {
    icon: '🧭',
    title: 'مخطط الرحلات والخروجات الذكي',
    desc: 'صمم خطة خروجة تفاعلية بالذكاء الاصطناعي مع حساب الميزانية ومسار الخريطة',
    prompt: '__OPEN_AI_PLANNER__',
  },
  {
    icon: '🐟',
    title: 'أقرب مطاعم سمك وسي فود',
    desc: 'اقترح لي أقرب مطعم سمك طازة لموقعي مع نسبة الخصم والأسعار',
    prompt: 'إيه أحسن وأقرب مطاعم سمك وسي فود في بورسعيد لموقعي؟ وعايز أعرف الأماكن اللي فيها خصومات بالكوبونات.',
  },
  {
    icon: '🏛️',
    title: 'خطة يوم سياحي متكامل',
    desc: 'جدول فسحة وترفيه في بورسعيد وبورفؤاد وجبال الملح والممشى',
    prompt: 'رتب لي خطة يوم سياحي ممتع من الصبح لليل في بورسعيد وبورفؤاد، مع المعالم والمعدية وأماكن التصوير.',
  },
  {
    icon: '🚌',
    title: 'مواصلات الجامعة والكليات',
    desc: 'خطوط المينى باص ومحطات كليات الطب والهندسة والتربية',
    prompt: 'إزاي أروح كليات جامعة بورسعيد من المعدية والسكن؟ واشرح لي خطوط المينى باص المتاحة.',
  },
  {
    icon: '⭐',
    title: 'كسب النقاط واستبدال الكوبونات',
    desc: 'طريقة زيادة رصيدك واستبداله بخصومات 20% في كاستن وسيلفر',
    prompt: 'إزاي أكسب نقاط في بورسعيد هاب؟ وإزاي أستبدلها بكوبونات خصم 10% لـ 20% في المحلات والمطاعم؟',
  },
];

const PROMPT_CHIPS = [
  '📍 أقرب مكان لموقعي الحالي',
  '🐟 مطعم كاستن وسوق السمك',
  '🍨 كاساتا بورسعيد وحلويات سيلفر',
  '⚓ فنار بورسعيد وممشى ديليسبس',
  '🚌 خط الأمين وخط الزهور',
  '🏠 سكن الطلبة في حي الزهور والشرق',
  '🗺️ اعرض خريطة بورسعيد التفاعلية',
];

export const GeminiChatView: React.FC<GeminiChatViewProps> = ({
  initialPrompt,
  onNavigate,
  onOpenPoints,
  onBack,
}) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // موقع المستخدم
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; district?: string } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasHandledInitialPromptRef = useRef(false);

  // 1. تحميل الجلسات المحفوظة من localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let parsedSessions: ChatSession[] = stored ? JSON.parse(stored) : [];

      if (!Array.isArray(parsedSessions) || parsedSessions.length === 0) {
        // إنشاء جلسة أولى افتراضية
        const initialSession: ChatSession = {
          id: 'session-' + Date.now(),
          title: 'محادثة جديدة مع المساعد',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
        };
        parsedSessions = [initialSession];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedSessions));
      }

      setSessions(parsedSessions);

      const savedActiveId = localStorage.getItem(ACTIVE_SESSION_KEY);
      const targetSession = parsedSessions.find((s) => s.id === savedActiveId) || parsedSessions[0];
      setActiveSessionId(targetSession.id);
    } catch (e) {
      console.warn('Could not load chat sessions from localStorage:', e);
    }
  }, []);

  // 2. حفظ الجلسات في localStorage عند التحديث
  const saveSessions = (updated: ChatSession[]) => {
    setSessions(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  };

  // الجلسة النشطة الحالية
  const currentSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = currentSession?.messages || [];

  // التمرير التلقائي لأسفل عند وصول رسائل جديدة
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // إنشاء جلسة محادثة جديدة
  const handleCreateNewSession = () => {
    const newSession: ChatSession = {
      id: 'session-' + Date.now(),
      title: 'محادثة جديدة ' + (sessions.length + 1),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    const updated = [newSession, ...sessions];
    saveSessions(updated);
    setActiveSessionId(newSession.id);
    try {
      localStorage.setItem(ACTIVE_SESSION_KEY, newSession.id);
    } catch (e) {}
    setIsSidebarOpen(false);
  };

  // حذف جلسة
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = sessions.filter((s) => s.id !== sessionId);
    if (filtered.length === 0) {
      const fresh: ChatSession = {
        id: 'session-' + Date.now(),
        title: 'محادثة جديدة',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };
      saveSessions([fresh]);
      setActiveSessionId(fresh.id);
      localStorage.setItem(ACTIVE_SESSION_KEY, fresh.id);
    } else {
      saveSessions(filtered);
      if (activeSessionId === sessionId) {
        setActiveSessionId(filtered[0].id);
        localStorage.setItem(ACTIVE_SESSION_KEY, filtered[0].id);
      }
    }
  };

  // تحديد الموقع الجغرافي بالـ GPS
  const handleLocateUser = () => {
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
          setLocationNotice(`تم تحديد موقعك في "${district}" 📍`);
        } else {
          setLocationNotice(`موقعك الحالي (${lat.toFixed(2)}, ${lng.toFixed(2)}) يقع خارج حدود بورسعيد.`);
        }
      },
      () => {
        setLocatingUser(false);
        setLocationNotice('يرجى تفعيل صلاحية الـ GPS في المتصفح لمشاركة مكانك.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // إرسال رسالة ومعالجتها بالـ AI
  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || input.trim();
    if (!textToSend) return;

    if (textToSend === '__OPEN_AI_PLANNER__') {
      if (onNavigate) {
        onNavigate('ai');
      }
      return;
    }

    if (loading || !activeSessionId) return;

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    const userMessage: ChatMessage = {
      id: 'usr-' + Date.now(),
      role: 'me',
      text: textToSend,
      timestamp: timeStr,
    };

    // تحديث الجلسة فوراً مع رسالة المستخدم
    const targetSession = sessions.find((s) => s.id === activeSessionId);
    if (!targetSession) return;

    // تحديث العنوان إذا كانت هذه أول رسالة
    let newTitle = targetSession.title;
    if (targetSession.messages.length === 0) {
      newTitle = textToSend.slice(0, 28) + (textToSend.length > 28 ? '...' : '');
    }

    const updatedSessionWithUser: ChatSession = {
      ...targetSession,
      title: newTitle,
      updatedAt: Date.now(),
      messages: [...targetSession.messages, userMessage],
    };

    const newSessions = sessions.map((s) => (s.id === activeSessionId ? updatedSessionWithUser : s));
    saveSessions(newSessions);
    setLoading(true);

    try {
      const historyTurns = updatedSessionWithUser.messages.map((m) => ({
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

      const botReply = data.ok && data.reply ? data.reply : 'أنا معاك يا بطل! اسألني عن أي حاجة في بورسعيد.';
      const suggestedPlaces = data.suggestedPlaces || [];

      const botMessage: ChatMessage = {
        id: 'bot-' + Date.now(),
        role: 'bot',
        text: botReply,
        timestamp: timeStr,
        suggestedPlaces,
      };

      const finalSession: ChatSession = {
        ...updatedSessionWithUser,
        messages: [...updatedSessionWithUser.messages, botMessage],
      };

      const finalSessions = sessions.map((s) => (s.id === activeSessionId ? finalSession : s));
      saveSessions(finalSessions);
    } catch (err) {
      const errMessage: ChatMessage = {
        id: 'bot-err-' + Date.now(),
        role: 'bot',
        text: 'عفواً حدث بطء مؤقت في الاتصال، تفضل بإعادة المحاولة وسأجيبك فوراً.',
        timestamp: timeStr,
      };

      const finalSession: ChatSession = {
        ...updatedSessionWithUser,
        messages: [...updatedSessionWithUser.messages, errMessage],
      };

      const finalSessions = sessions.map((s) => (s.id === activeSessionId ? finalSession : s));
      saveSessions(finalSessions);
    } finally {
      setLoading(false);
    }
  };

  // التعامل مع initialPrompt الممرر عند فتح الشاشة
  useEffect(() => {
    if (initialPrompt && activeSessionId && !hasHandledInitialPromptRef.current) {
      hasHandledInitialPromptRef.current = true;
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt, activeSessionId]);

  // نسخ النص
  const handleCopy = (id: string, text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {}
  };

  const userName = user?.name ? user.name.split(' ')[0] : 'صديقي';

  return (
    <div className="relative w-full h-[calc(100vh-5rem)] min-h-[580px] flex overflow-hidden rounded-3xl border border-sand-300 dark:border-[#1d2d3e] bg-white dark:bg-[#071322] shadow-2xl">
      {/* 1. Gemini Style Sidebar (Drawer on mobile, collapsible panel on desktop) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 290, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="h-full z-40 shrink-0 bg-sand-50/90 dark:bg-[#0b1625] border-l border-sand-300 dark:border-[#1d2d3e] flex flex-col overflow-hidden backdrop-blur-md"
          >
            {/* Sidebar Top: New Chat & Close */}
            <div className="p-4 border-b border-sand-200 dark:border-[#1d2d3e] flex items-center justify-between gap-2">
              <button
                onClick={handleCreateNewSession}
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-ocean-900 to-teal2-700 text-white font-black text-xs shadow-md hover:scale-102 transition"
              >
                <Plus className="w-4 h-4 text-sand-300" />
                <span>محادثة جديدة</span>
              </button>

              <button
                onClick={() => setIsSidebarOpen(false)}
                type="button"
                className="w-9 h-9 rounded-xl bg-sand-200 dark:bg-[#162738] hover:bg-sand-300 text-ocean-800 dark:text-white grid place-items-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-none">
              <span className="text-[11px] font-black text-ocean-700/70 dark:text-white/60 px-2 py-1 block">
                سجل المحادثات الثابتة ({sessions.length})
              </span>

              {sessions.map((sess) => {
                const isActive = sess.id === activeSessionId;
                return (
                  <div
                    key={sess.id}
                    onClick={() => {
                      setActiveSessionId(sess.id);
                      localStorage.setItem(ACTIVE_SESSION_KEY, sess.id);
                    }}
                    className={`group relative flex items-center justify-between p-2.5 rounded-2xl cursor-pointer text-xs font-bold transition ${
                      isActive
                        ? 'bg-white dark:bg-[#152436] text-ocean-950 dark:text-white shadow-sm border border-sand-300 dark:border-teal2-500/40'
                        : 'text-ocean-800 dark:text-white/70 hover:bg-sand-200/70 dark:hover:bg-[#121f2f]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      <MessageSquare
                        className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal2-600 dark:text-teal2-400' : 'text-ocean-400'}`}
                      />
                      <span className="truncate">{sess.title}</span>
                    </div>

                    <button
                      onClick={(e) => handleDeleteSession(sess.id, e)}
                      type="button"
                      title="حذف هذه المحادثة"
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Sidebar Bottom Shortcuts */}
            <div className="p-3 border-t border-sand-200 dark:border-[#1d2d3e] space-y-1">
              {onNavigate && (
                <button
                  onClick={() => onNavigate('map')}
                  type="button"
                  className="w-full text-right p-2 rounded-xl text-xs font-bold text-ocean-800 dark:text-white/80 hover:bg-sand-200 dark:hover:bg-[#142334] flex items-center gap-2"
                >
                  <Compass className="w-4 h-4 text-teal2-600" />
                  <span>فتح خريطة بورسعيد 🗺️</span>
                </button>
              )}
              {onBack && (
                <button
                  onClick={onBack}
                  type="button"
                  className="w-full text-right p-2 rounded-xl text-xs font-bold text-ocean-800 dark:text-white/80 hover:bg-sand-200 dark:hover:bg-[#142334] flex items-center gap-2"
                >
                  <ArrowRight className="w-4 h-4 text-amber-500" />
                  <span>العودة للرئيسية 🏠</span>
                </button>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 2. Main Chat Conversation Canvas */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* Top Header Bar */}
        <div className="p-3.5 sm:p-4 border-b border-sand-200 dark:border-[#1d2d3e] bg-white/90 dark:bg-[#071322]/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Sidebar Toggle Button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              type="button"
              className="p-2 rounded-xl bg-sand-100 dark:bg-[#132233] text-ocean-900 dark:text-white hover:bg-sand-200 transition"
              title={isSidebarOpen ? 'إغلاق السجل' : 'عرض سجل المحادثات'}
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-amber-500 p-0.5 shadow-md shrink-0 flex items-center justify-center">
                <div className="w-full h-full rounded-2xl bg-white dark:bg-[#071322] flex items-center justify-center p-1.5">
                  <img src="/assets/logo/icon-192.png" alt="Port Said Hub" className="w-full h-full object-contain" />
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-black text-sm sm:text-base text-ocean-950 dark:text-white truncate">
                    مساعد بورسعيد الذكي
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-blue-500/15 via-indigo-500/15 to-amber-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-400/30">
                    Gemini AI ⚡
                  </span>
                </div>
                <p className="text-[11px] text-ocean-700/70 dark:text-white/60 truncate font-semibold">
                  محادثة تفاعلية مستمرة • متصل بالخريطة وبيانات الأماكن المعتمدة
                </p>
              </div>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCreateNewSession}
              type="button"
              title="محادثة جديدة"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sand-100 dark:bg-[#132233] hover:bg-sand-200 text-ocean-900 dark:text-white text-xs font-bold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>جديد</span>
            </button>

            {onNavigate && (
              <button
                onClick={() => onNavigate('map')}
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal2-600 to-ocean-800 text-white text-xs font-bold shadow hover:opacity-95 transition"
              >
                <Compass className="w-3.5 h-3.5 text-sand-300" />
                <span className="hidden sm:inline">الخريطة</span>
              </button>
            )}

            {onBack && (
              <button
                onClick={onBack}
                type="button"
                className="w-9 h-9 rounded-xl bg-sand-100 dark:bg-[#132233] text-ocean-900 dark:text-white hover:bg-sand-200 grid place-items-center transition"
                title="إغلاق والعودة"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Location Notice Banner */}
        <AnimatePresence>
          {locationNotice && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 py-2 bg-teal2-500/15 dark:bg-teal2-950/60 border-b border-teal2-500/30 text-teal2-800 dark:text-teal2-300 text-xs font-bold flex items-center justify-between gap-2 shrink-0"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>{locationNotice}</span>
              </span>
              <button onClick={() => setLocationNotice(null)} type="button">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages Feed or Empty Gemini Welcome */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {messages.length === 0 ? (
            /* Gemini Welcome Screen */
            <div className="max-w-3xl mx-auto h-full flex flex-col justify-center items-center text-center py-6 sm:py-10 space-y-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-blue-500 via-indigo-600 to-amber-400 p-1 shadow-2xl flex items-center justify-center"
              >
                <div className="w-full h-full rounded-3xl bg-white dark:bg-[#071322] flex items-center justify-center p-3">
                  <Sparkles className="w-full h-full text-indigo-500 animate-spin" style={{ animationDuration: '10s' }} />
                </div>
              </motion.div>

              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 bg-clip-text text-transparent">
                  أهلاً بك، {userName} 👋
                </h1>
                <p className="text-sm sm:text-base text-ocean-700/80 dark:text-white/70 max-w-xl font-medium leading-relaxed">
                  أنا مساعد بورسعيد الذكي المطور بـ Gemini AI. اسألني عن أفضل المطاعم، الفسح، خطوط المواصلات، أو شارك
                  موقعك لحساب أقرب الأماكن إليك على الخريطة فوراً.
                </p>
              </div>

              {/* 4 Inspiration Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-right pt-2">
                {QUICK_CARDS.map((card, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSendMessage(card.prompt)}
                    type="button"
                    className="p-4 rounded-2xl bg-sand-50 dark:bg-[#0c1828] border border-sand-300 dark:border-[#1d2d3e] hover:border-teal2-500/50 shadow-sm transition flex items-start gap-3"
                  >
                    <span className="text-2xl shrink-0 p-2 rounded-xl bg-white dark:bg-[#142334] shadow-sm">
                      {card.icon}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-black text-xs sm:text-sm text-ocean-950 dark:text-white">{card.title}</h4>
                      <p className="text-[11px] text-ocean-700/70 dark:text-white/60 mt-0.5 line-clamp-2">
                        {card.desc}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            /* Message Thread */
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((m) => {
                const isBot = m.role === 'bot';
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex items-start gap-3 sm:gap-4 ${isBot ? 'self-start' : 'self-end flex-row-reverse'}`}
                  >
                    {/* Avatar */}
                    {isBot ? (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-600 to-amber-500 p-0.5 shadow-md shrink-0 mt-1">
                        <div className="w-full h-full rounded-2xl bg-white dark:bg-[#071322] flex items-center justify-center p-1.5">
                          <img src="/assets/logo/icon-192.png" alt="Gemini" className="w-full h-full object-contain" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-ocean-900 text-sand-300 shadow-md shrink-0 mt-1 grid place-items-center font-black text-xs">
                        {userName[0] || 'أنت'}
                      </div>
                    )}

                    {/* Content Bubble */}
                    <div
                      className={`relative group p-4 sm:p-5 rounded-3xl text-xs sm:text-sm leading-relaxed font-semibold max-w-[88%] sm:max-w-[80%] shadow-md transition ${
                        isBot
                          ? 'bg-white dark:bg-[#0f1d2e] text-ocean-950 dark:text-white rounded-tr-sm border border-sand-300 dark:border-[#1d2d3e]'
                          : 'bg-gradient-to-r from-ocean-900 via-ocean-800 to-teal2-700 text-white rounded-tl-sm'
                      }`}
                    >
                      {/* Message Text with Clean Formatting */}
                      <div className="whitespace-pre-line leading-relaxed font-medium">{m.text}</div>

                      {/* Bot Suggested Places Map Pills (Deep Linking) */}
                      {isBot && m.suggestedPlaces && m.suggestedPlaces.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-sand-200 dark:border-white/10 flex flex-col gap-2">
                          <div className="text-[11px] font-black text-teal2-700 dark:text-teal2-300 flex items-center gap-1.5">
                            <Compass className="w-3.5 h-3.5 text-teal2-500 animate-pulse" />
                            <span>الأماكن المقترحة على الخريطة التفاعلية:</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {m.suggestedPlaces.map((pl) => (
                              <motion.button
                                key={pl.id}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => onNavigate && onNavigate('map', pl.id)}
                                type="button"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal2-600 to-ocean-800 text-white font-black text-xs shadow hover:opacity-95 transition"
                              >
                                <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
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

                      {/* Bubble Footer: Timestamp & Actions */}
                      <div className="mt-2.5 flex items-center justify-between text-[10px] text-ocean-700/60 dark:text-white/50 pt-1">
                        <span>{m.timestamp}</span>

                        {isBot && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCopy(m.id, m.text)}
                              type="button"
                              className="inline-flex items-center gap-1 opacity-70 hover:opacity-100 transition px-1.5 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10"
                              title="نسخ الرد"
                            >
                              {copiedId === m.id ? (
                                <span className="text-emerald-500 font-bold flex items-center gap-1">
                                  <Check className="w-3 h-3" /> تم النسخ
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Copy className="w-3 h-3" /> نسخ
                                </span>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Gemini Shimmer Typing Indicator */}
              {loading && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-600 to-amber-500 p-0.5 shadow-md shrink-0">
                    <div className="w-full h-full rounded-2xl bg-white dark:bg-[#071322] flex items-center justify-center p-1.5">
                      <Sparkles className="w-full h-full text-indigo-500 animate-spin" />
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#0f1d2e] border border-sand-300 dark:border-[#1d2d3e] text-xs font-bold text-ocean-800 dark:text-white/80 flex items-center gap-2 shadow-sm">
                    <span>مساعد بورسعيد يفكّر ويكتب لك</span>
                    <span className="inline-flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '180ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '360ms' }} />
                    </span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 3. Floating Bottom Gemini Capsule Input */}
        <div className="p-3 sm:p-5 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-[#071322] dark:via-[#071322]/95 dark:to-transparent shrink-0">
          <div className="max-w-4xl mx-auto space-y-2">
            {/* Horizontal Prompt Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {PROMPT_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  type="button"
                  className="px-3 py-1.5 rounded-full text-xs font-bold bg-sand-100 dark:bg-[#121f2f] text-ocean-900 dark:text-white border border-sand-300 dark:border-[#22354a] hover:border-teal2-500/60 transition whitespace-nowrap shrink-0 shadow-sm"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* User Active Location Indicator */}
            {userLocation && (
              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
                  <span>
                    موقعك محدد بالـ GPS: <strong>{userLocation.district || 'بورسعيد'}</strong> ({userLocation.lat.toFixed(3)},{' '}
                    {userLocation.lng.toFixed(3)})
                  </span>
                </span>
                <button
                  onClick={() => setUserLocation(null)}
                  type="button"
                  className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Input Bar Capsule */}
            <div className="relative rounded-3xl border border-sand-300 dark:border-[#22354a] bg-white dark:bg-[#0c1828] shadow-2xl p-2 sm:p-2.5 flex items-end gap-2 focus-within:ring-2 focus-within:ring-indigo-500 transition">
              {/* GPS Geolocation Button */}
              <motion.button
                onClick={handleLocateUser}
                disabled={locatingUser}
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                title="تحديد ومشاركة موقعك بالـ GPS"
                className={`w-10 h-10 shrink-0 rounded-2xl grid place-items-center transition border ${
                  userLocation
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/30'
                    : 'bg-sand-100 dark:bg-[#152436] text-ocean-800 dark:text-sand-300 border-sand-300 dark:border-[#22354a] hover:bg-sand-200'
                }`}
              >
                <Navigation className={`w-4 h-4 ${locatingUser ? 'animate-spin' : ''}`} />
              </motion.button>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                placeholder="اكتب رسالتك للمساعد الذكي أو اسأل عن أي مكان في بورسعيد... (اضغط Enter للإرسال)"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="flex-1 bg-transparent border-none outline-none resize-none text-xs sm:text-sm text-ocean-950 dark:text-white placeholder:text-ocean-700/50 dark:placeholder:text-white/40 py-2.5 px-2 font-medium max-h-32"
              />

              {/* Send Button */}
              <motion.button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || loading}
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className={`w-11 h-11 shrink-0 rounded-2xl grid place-items-center transition shadow-lg ${
                  input.trim() && !loading
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 text-white shadow-indigo-600/30'
                    : 'bg-sand-200 dark:bg-[#1b2b3d] text-ocean-700/40 dark:text-white/30 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Disclaimer Footer */}
            <p className="text-[10px] text-center text-ocean-700/50 dark:text-white/40 font-medium">
              مساعد بورسعيد الذكي مدعوم بنماذج Gemini عبر OpenRouter ومربوط بخريطة بورسعيد التفاعلية وقاعدة بيانات الأماكن المعتمدة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
