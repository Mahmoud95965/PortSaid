'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import { BOT_FAQ } from '@/lib/constants';

interface ChatMessage {
  role: 'bot' | 'me';
  text: string;
}

export const AssistantChat: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'bot',
      text: 'أهلًا بيك في Port Said Hub 👋 أنا مساعد بورسعيد الذكي، اسألني أي سؤال عن المدينة أو اختار من الأسئلة الجاهزة تحت.',
    },
  ]);
  const [input, setInput] = useState('');
  const [showQuick, setShowQuick] = useState(true);
  const [loading, setLoading] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const findFallbackAnswer = (text: string) => {
    const t = text.toLowerCase().trim();
    for (const item of BOT_FAQ) {
      for (const kw of item.kw) {
        if (t.includes(kw)) {
          return item.a;
        }
      }
    }
    return 'مش متأكد إني فاهم سؤالك بالظبط 🙏 جرب تختار من الأسئلة الجاهزة بالأسفل، أو لو محتاج رد من فريقنا استخدم زر "شكاوى واقتراحات" أعلى الصفحة.';
  };

  const handleSend = async (userText?: string) => {
    const textToSend = userText || input.trim();
    if (!textToSend || loading) return;

    setInput('');
    setShowQuick(false);

    // Append user message
    const updatedMessages: ChatMessage[] = [...messages, { role: 'me', text: textToSend }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend }),
      });
      const data = await res.json();

      if (data.ok && data.reply) {
        setMessages((prev) => [...prev, { role: 'bot', text: data.reply }]);
      } else {
        const fallback = findFallbackAnswer(textToSend);
        setMessages((prev) => [...prev, { role: 'bot', text: fallback }]);
      }
    } catch (e) {
      const fallback = findFallbackAnswer(textToSend);
      setMessages((prev) => [...prev, { role: 'bot', text: fallback }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={() => setOpen(!open)}
        type="button"
        aria-label="مساعد بورسعيد"
        className="fixed left-4 bottom-4 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-teal2-500 via-teal2-600 to-ocean-700 text-white grid place-items-center text-xl shadow-2xl border-2 border-white/30 backdrop-blur-md"
        whileHover={{ scale: 1.12, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {/* Pulsing ring */}
        <span className="absolute inset-0 rounded-full bg-teal2-400 opacity-30 animate-ping" />

        <span className="relative">
          <MessageSquare className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-coral-500 border-2 border-white" />
        </span>
      </motion.button>

      {/* Chat Popup Panel with AnimatePresence */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed left-3 sm:left-4 bottom-20 z-50 w-[min(23rem,calc(100vw-1.5rem))] h-[min(34rem,calc(100vh-6.5rem))] flex flex-col rounded-3xl overflow-hidden shadow-2xl bg-white dark:bg-[#0f1a28] border border-sand-200/90 dark:border-[#1d2d3e]"
          >
            {/* Header */}
            <div className="hero-bg waves-pattern text-white p-3.5 sm:p-4 flex items-center justify-between gap-2 border-b border-white/10 relative overflow-hidden">
              <div className="flex items-center gap-2.5 min-w-0 relative z-10">
                <span className="w-10 h-10 shrink-0 rounded-2xl bg-white/20 backdrop-blur-sm grid place-items-center shadow-inner border border-white/20">
                  <Bot className="w-5 h-5 text-sand-400" />
                </span>
                <div className="min-w-0">
                  <p className="font-black text-sm truncate flex items-center gap-1.5">
                    <span>مساعد بورسعيد الذكي</span>
                    <Sparkles className="w-3.5 h-3.5 text-sand-400" />
                  </p>
                  <p className="text-[11px] text-white/80 font-semibold">جاهز لمساعدتك في أي وقت</p>
                </div>
              </div>
              <motion.button
                onClick={() => setOpen(false)}
                type="button"
                className="w-8 h-8 rounded-xl bg-white/15 grid place-items-center hover:bg-white/25 transition relative z-10"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Messages Body */}
            <div
              ref={chatBodyRef}
              className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-4 flex flex-col gap-2.5 text-xs sm:text-sm bg-sand-50/50 dark:bg-[#071322]/50"
            >
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed font-semibold text-xs sm:text-sm ${
                    m.role === 'bot'
                      ? 'bg-white dark:bg-[#162536] text-ocean-900 dark:text-white self-start rounded-bl-sm border border-sand-200/80 dark:border-[#22354a] shadow-sm'
                      : 'bg-gradient-to-r from-teal2-600 to-teal2-500 text-white self-end rounded-br-sm shadow-md'
                  }`}
                >
                  {m.text}
                </motion.div>
              ))}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white dark:bg-[#162536] text-ocean-900 dark:text-white p-3 rounded-2xl self-start text-xs font-bold border border-sand-200/80 dark:border-[#22354a] flex items-center gap-1.5 shadow-sm"
                >
                  <span className="text-[11px] text-ocean-700/70 dark:text-white/60">بيكتب</span>
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal2-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-teal2-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-teal2-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </motion.div>
              )}
            </div>

            {/* Quick FAQ Toggle */}
            <button
              onClick={() => setShowQuick(!showQuick)}
              type="button"
              className="flex items-center justify-center gap-1.5 py-2 text-xs font-black bg-sand-100/70 dark:bg-[#142232] text-ocean-800 dark:text-teal2-400 border-t border-sand-200/80 dark:border-[#1d2d3e] transition hover:opacity-90"
            >
              {showQuick ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              <span>{showQuick ? 'إخفاء الأسئلة الجاهزة' : 'أسئلة شائعة سريعة'}</span>
            </button>

            {/* Quick FAQ Chips */}
            <AnimatePresence>
              {showQuick && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex gap-1.5 overflow-x-auto p-2.5 bg-white dark:bg-[#0f1a28] border-t border-sand-200/80 dark:border-[#1d2d3e] scrollbar-none"
                >
                  {BOT_FAQ.map((faq, i) => (
                    <motion.button
                      key={i}
                      type="button"
                      onClick={() => handleSend(faq.q)}
                      className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold bg-sand-50 dark:bg-[#182638] text-ocean-800 dark:text-white border border-sand-200/80 dark:border-[#24374c] hover:bg-teal2-100 dark:hover:bg-teal2-900/40 hover:text-teal2-700 transition whitespace-nowrap shadow-sm"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {faq.q}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Bar */}
            <div className="p-2.5 sm:p-3 border-t border-sand-200/80 dark:border-[#1d2d3e] flex items-center gap-2 bg-white dark:bg-[#0f1a28]">
              <input
                type="text"
                placeholder="اكتب سؤالك هنا..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend();
                }}
                className="flex-1 min-w-0 rounded-2xl border border-sand-200 dark:border-[#22354a] bg-sand-50 dark:bg-[#142232] px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal2-500 font-medium"
              />
              <motion.button
                onClick={() => handleSend()}
                type="button"
                className="w-10 h-10 shrink-0 rounded-2xl bg-teal2-600 hover:bg-teal2-500 text-white grid place-items-center transition shadow-md shadow-teal2-600/30"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
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
