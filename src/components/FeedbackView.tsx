'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Lightbulb, AlertTriangle, Send, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';

interface FeedbackViewProps {
  onBack: () => void;
}

export const FeedbackView: React.FC<FeedbackViewProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [kind, setKind] = useState<'suggestion' | 'complaint'>('suggestion');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 5) {
      setStatusMsg({ text: 'اكتب رسالة من 5 حروف على الأقل.', ok: false });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('feedback').insert({
          user_id: user?.id || null,
          kind,
          message: message.trim(),
          status: 'new',
        });
        if (error) {
          setStatusMsg({ text: error.message, ok: false });
        } else {
          setMessage('');
          setStatusMsg({
            text:
              kind === 'complaint'
                ? 'وصلتنا شكوتك، هنراجعها بأسرع وقت ونحلها 🙏'
                : 'شكرًا على اقتراحك الرائع 💡 وصلنا وهندرسه فوراً!',
            ok: true,
          });
        }
      } catch (err: any) {
        setStatusMsg({ text: 'تعذر الإرسال، حاول مجدداً.', ok: false });
      } finally {
        setLoading(false);
      }
    } else {
      // Offline fallback
      setTimeout(() => {
        setMessage('');
        setLoading(false);
        setStatusMsg({
          text:
            kind === 'complaint'
              ? 'وصلتنا شكوتك، هنراجعها بأسرع وقت ونحلها 🙏'
              : 'شكرًا على اقتراحك الرائع 💡 وصلنا وهندرسه فوراً!',
          ok: true,
        });
      }, 500);
    }
  };

  return (
    <motion.div
      className="space-y-5 max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
    >
      <motion.button
        onClick={onBack}
        type="button"
        className="inline-flex items-center gap-2 font-bold text-ocean-700 dark:text-teal2-400 hover:text-teal2-600 transition group"
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.95 }}
      >
        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        <span>رجوع للرئيسية</span>
      </motion.button>

      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-ocean-900 dark:text-white flex items-center gap-2">
          <span>شكاوى واقتراحات</span>
          <Sparkles className="w-5 h-5 text-sand-400" />
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-ocean-700/80 dark:text-ocean-100/70 font-semibold">
          رأيك بيطوّر Port Said Hub. قولنا إيه اللي مضايقك أو حابب نضيفه وفريقنا بيقرأ كل رسالة.
        </p>
      </div>

      <motion.div
        className="rounded-3xl bg-white dark:bg-[#0f1a28] p-5 sm:p-7 shadow-xl border border-sand-200/80 dark:border-[#1d2d3e]"
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {/* Type Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-sand-100 dark:bg-[#142232] mb-5">
          <button
            type="button"
            onClick={() => setKind('suggestion')}
            className={`py-3 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 ${
              kind === 'suggestion'
                ? 'bg-white dark:bg-[#1e2f42] text-ocean-900 dark:text-teal2-400 shadow-md'
                : 'text-ocean-700/70 dark:text-white/60'
            }`}
          >
            <Lightbulb className="w-4 h-4 text-sand-400" />
            <span>اقتراح فكرة</span>
          </button>
          <button
            type="button"
            onClick={() => setKind('complaint')}
            className={`py-3 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 ${
              kind === 'complaint'
                ? 'bg-white dark:bg-[#1e2f42] text-ocean-900 dark:text-teal2-400 shadow-md'
                : 'text-ocean-700/70 dark:text-white/60'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-coral-500" />
            <span>شكوى أو مشكلة</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-black mb-1.5 text-xs sm:text-sm text-ocean-900 dark:text-white">
              رسالتك بالتفصيل
            </label>
            <textarea
              rows={5}
              maxLength={1000}
              placeholder="اكتب هنا بالتفصيل كل ما تريد إخبارنا به وسنتابع معك..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-2xl border border-sand-200 dark:border-[#22354a] bg-sand-50 dark:bg-[#142232] p-4 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal2-500 text-ocean-900 dark:text-white font-medium"
              required
            />
            <div className="flex items-center justify-between text-xs text-ocean-700/70 dark:text-white/50 mt-1.5 font-semibold">
              <span>{message.length} / 1000</span>
              <span>الحد الأدنى 5 حروف</span>
            </div>
          </div>

          {statusMsg && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3.5 rounded-2xl flex items-center gap-2 text-xs font-black ${
                statusMsg.ok
                  ? 'bg-teal2-100 text-teal2-800 dark:bg-teal2-950/60 dark:text-teal2-300'
                  : 'bg-red-50 text-red-600 dark:bg-red-950/40'
              }`}
            >
              {statusMsg.ok && <CheckCircle2 className="w-4 h-4 shrink-0" />}
              <span>{statusMsg.text}</span>
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            className="w-full bg-teal2-600 hover:bg-teal2-500 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-teal2-600/30 transition flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{loading ? 'جارٍ الإرسال...' : 'إرسال الرسالة'}</span>
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
};
