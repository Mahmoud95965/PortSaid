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
  MessageSquare,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'bot' | 'me';
  text: string;
  timestamp: string;
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
  { label: 'النقاط والكوبونات', text: '⭐ إزاي أستفيد من النقط والكوبونات وأوفر فلوس؟', icon: '⭐' },
  { label: 'أكل وسمك', text: '🐟 أحسن مطعم سمك وسي فود وسوق السمك فين؟', icon: '🐟' },
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

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'bot',
      text: 'أهلاً بيك يا غالي في Port Said Hub! 👋 أنا "مساعد بورسعيد الذكي".\n\nأقدر أساعدك في أي وقت بخصوص:\n• أحسن مطاعم الأسماك والحلويات البورسعيدية 🐟\n• كسب النقاط واستبدالها بكوبونات خصم حقيقية 10%-20% ⭐\n• خطوط المينى باص ومحطات كليات الجامعة 🚌\n• سكن الطلبة والمغتربين 🏠\n\nاسألني سؤالك أو اختر من الأسئلة المقترحة بالأسفل 👇',
      timestamp: 'الآن',
    },
  ]);

  const [input, setInput] = useState('');
  const [showQuick, setShowQuick] = useState(true);
  const [loading, setLoading] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTo({
        top: chatBodyRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setHasOpenedBefore(true);
      setShowTooltip(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [open]);

  // Hide the initial callout tooltip after 8 seconds
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
        text: 'بدأنا محادثة جديدة! 🌊 اسألني عن أي حاجة في بورسعيد وأنا في خدمتك.',
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

  const handleSend = async (userText?: string) => {
    const textToSend = userText || input.trim();
    if (!textToSend || loading) return;

    setInput('');
    setShowQuick(false);

    const now = new Date();
    const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    // Append user message
    const userMsg: ChatMessage = {
      id: 'usr-' + Date.now(),
      role: 'me',
      text: textToSend,
      timestamp: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend }),
      });
      const data = await res.json();

      const botReply =
        data.ok && data.reply
          ? data.reply
          : 'أنا هنا لمساعدتك! تقدر تسألني عن نظام النقاط وكوبونات الخصم، أحسن مطاعم الأسماك، مواصلات كليات جامعة بورسعيد، أو أفضل مناطق السكن.';

      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-' + Date.now(),
          role: 'bot',
          text: botReply,
          timestamp: timeStr,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-err-' + Date.now(),
          role: 'bot',
          text: 'عفواً حدث بطء في الاتصال. لكن تقدر تسألني عن أي حاجة وسأجيبك فوراً.',
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
              <span>مساعد بورسعيد الذكي 👋 جاهز لخدمتك!</span>
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
            className="fixed left-2 sm:left-4 bottom-20 sm:bottom-24 z-50 w-[min(26rem,calc(100vw-1rem))] h-[min(38rem,calc(100vh-7rem))] flex flex-col rounded-3xl overflow-hidden shadow-2xl bg-white dark:bg-[#0b1624] border border-sand-300 dark:border-[#1d2d3e] backdrop-blur-xl"
          >
            {/* Header: App Brand, Live Status, Controls */}
            <div className="bg-gradient-to-r from-ocean-950 via-ocean-900 to-teal2-800 text-white p-3.5 sm:p-4 flex items-center justify-between gap-2 border-b border-white/10 relative overflow-hidden shadow-md">
              {/* Subtle background glow */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-teal2-400/10 rounded-full blur-2xl pointer-events-none" />

              {/* Bot Info with Official App Icon */}
              <div className="flex items-center gap-3 min-w-0 relative z-10">
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
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black text-sm sm:text-base text-white truncate tracking-tight">
                      مساعد بورسعيد الذكي
                    </h3>
                    <Sparkles className="w-3.5 h-3.5 text-sand-400 animate-spin" style={{ animationDuration: '8s' }} />
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] text-teal2-200 font-bold">متصل الآن 24/7 • ردود فورية</span>
                  </div>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-1.5 relative z-10">
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
                    className={`flex items-start gap-2 max-w-[90%] ${isBot ? 'self-start' : 'self-end flex-row-reverse'}`}
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

                      {/* Interactive Deep-Action Pills for Bot Messages */}
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
                              <span>تصفح مطاعم الأسماك 🐟</span>
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
                              <span>شبكة المواصلات والخطوط 🚌</span>
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

                          {mentionsTour && onNavigate && (
                            <button
                              onClick={() => {
                                onNavigate('explore');
                                setOpen(false);
                              }}
                              type="button"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sand-100 dark:bg-sand-900/40 text-ocean-900 dark:text-sand-200 font-bold text-[11px] border border-sand-300/50 hover:bg-sand-200 transition"
                            >
                              <Compass className="w-3.5 h-3.5 text-amber-500" />
                              <span>خريطة معالم بورسعيد 🧭</span>
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
                              <span>حلويات وكاساتا بورسعيد 🍨</span>
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
                    <span className="text-[11px]">مساعد بورسعيد بيكتب لك</span>
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

            {/* Input Bar */}
            <div className="p-3 border-t border-sand-200/90 dark:border-[#1d2d3e] flex items-center gap-2 bg-white dark:bg-[#0b1624]">
              <div className="flex-1 relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="اسأل عن أي حاجة في بورسعيد..."
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
