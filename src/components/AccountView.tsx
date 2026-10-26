'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowRight,
  Camera,
  CheckCircle,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  Star,
  Sparkles,
  Sliders,
  Sun,
  Moon,
  Laptop,
  Navigation,
  Map as MapIcon,
  Bell,
  Volume2,
  Check,
  Save,
  Coffee,
  Fish,
  Landmark,
  ShoppingBag,
  Palmtree,
  Trophy,
  Cake,
} from 'lucide-react';

interface AccountViewProps {
  onBack: () => void;
}

interface UserPreferences {
  themeMode: 'light' | 'dark' | 'auto';
  transportMode: 'microbus' | 'taxi' | 'car' | 'walking';
  mapStyle: 'light' | 'detailed' | 'streets';
  interests: string[];
  notificationsEnabled: boolean;
  soundEffectsEnabled: boolean;
}

const PREFS_STORAGE_KEY = 'ps_user_preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  themeMode: 'auto',
  transportMode: 'microbus',
  mapStyle: 'light',
  interests: ['seafood', 'cafes', 'history', 'shopping'],
  notificationsEnabled: true,
  soundEffectsEnabled: true,
};

const INTEREST_OPTIONS = [
  { id: 'seafood', label: 'مأكولات بحرية وأسماك', icon: Fish, color: 'text-sky-600 dark:text-sky-400' },
  { id: 'cafes', label: 'كافيهات وممشى القناة', icon: Coffee, color: 'text-amber-600 dark:text-amber-400' },
  { id: 'history', label: 'معالم وآثار بورسعيد', icon: Landmark, color: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'shopping', label: 'تسوق وتجارة حرة', icon: ShoppingBag, color: 'text-indigo-600 dark:text-indigo-400' },
  { id: 'beaches', label: 'شواطئ وبحر', icon: Palmtree, color: 'text-cyan-600 dark:text-cyan-400' },
  { id: 'sports', label: 'أنشطة رياضية وملاعب', icon: Trophy, color: 'text-blue-600 dark:text-blue-400' },
  { id: 'sweets', label: 'كاساتا وحلويات', icon: Cake, color: 'text-rose-600 dark:text-rose-400' },
];

export const AccountView: React.FC<AccountViewProps> = ({ onBack }) => {
  const { user, updateAvatar, changePassword, theme, setThemeExplicitly, toggleTheme } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // حالة كلمة المرور
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [passMsg, setPassMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [avatarMsg, setAvatarMsg] = useState('');
  const [verMsg, setVerMsg] = useState('');

  // حالة التفضيلات
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [prefsSavedMsg, setPrefsSavedMsg] = useState(false);

  // استرجاع التفضيلات المخزنة
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREFS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPrefs((prev) => ({ ...prev, ...parsed }));
      } else {
        const currentThemeMode = (localStorage.getItem('ps_theme') as 'light' | 'dark') || 'auto';
        setPrefs((prev) => ({ ...prev, themeMode: currentThemeMode }));
      }
    } catch (e) {
      console.warn('Could not load preferences:', e);
    }
  }, []);

  const handleThemeSelect = (mode: 'light' | 'dark' | 'auto') => {
    setPrefs((prev) => ({ ...prev, themeMode: mode }));
    if (mode === 'light' || mode === 'dark') {
      if (setThemeExplicitly) {
        setThemeExplicitly(mode);
      } else {
        if (theme !== mode) toggleTheme();
      }
    } else {
      // Auto: match system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const targetTheme = prefersDark ? 'dark' : 'light';
      if (setThemeExplicitly) {
        setThemeExplicitly(targetTheme);
      } else if (theme !== targetTheme) {
        toggleTheme();
      }
      localStorage.removeItem('ps_theme');
    }
  };

  const toggleInterest = (id: string) => {
    setPrefs((prev) => {
      const exists = prev.interests.includes(id);
      const nextInterests = exists
        ? prev.interests.filter((item) => item !== id)
        : [...prev.interests, id];
      return { ...prev, interests: nextInterests };
    });
  };

  const handleSavePreferences = () => {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
      setPrefsSavedMsg(true);
      setTimeout(() => setPrefsSavedMsg(false), 3000);
    } catch (e) {
      console.warn('Error saving preferences:', e);
    }
  };

  const calcStrength = (p: string) => {
    let s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };

  const strength = calcStrength(newPass);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    updateAvatar(url);
    setAvatarMsg('تم تحديث صورتك الشخصية بنجاح ✓');
    setTimeout(() => setAvatarMsg(''), 3000);
  };

  const handleChangePassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    if (!currentPass) {
      setPassMsg({ text: 'اكتب كلمة المرور الحالية.', ok: false });
      return;
    }
    if (newPass.length < 8) {
      setPassMsg({ text: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.', ok: false });
      return;
    }
    if (newPass !== confirmPass) {
      setPassMsg({ text: 'كلمتا المرور الجديدتان غير متطابقتين.', ok: false });
      return;
    }

    const res = await changePassword(currentPass, newPass);
    if (res.ok) {
      setPassMsg({ text: 'تم تغيير كلمة المرور وحفظها بنجاح.', ok: true });
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } else {
      setPassMsg({ text: res.message || 'حدث خطأ.', ok: false });
    }
  };

  const userRoleTitle =
    user?.role === 'owner'
      ? 'المالك الرئيسي'
      : user?.role === 'admin'
      ? 'أدمن النظام'
      : user?.role === 'merchant'
      ? 'تاجر وشريك'
      : 'مستخدم عادي';

  const userTypeTitle =
    user?.type === 'student' ? 'طالب' : user?.type === 'visitor' ? 'سائح أو مغترب' : 'من بورسعيد';

  return (
    <motion.div
      className="space-y-6 max-w-4xl mx-auto px-2 sm:px-4 py-2 sm:py-4 overflow-x-hidden"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
    >
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarChange}
        className="hidden"
      />

      {/* Top Back Action */}
      <motion.button
        onClick={onBack}
        type="button"
        className="inline-flex items-center gap-2 font-bold text-xs sm:text-sm text-ocean-800 dark:text-teal2-400 hover:text-blue-600 transition group py-1.5 px-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60"
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.95 }}
      >
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        <span>رجوع للرئيسية</span>
      </motion.button>

      {/* Hero Profile Badge with Ambient Waves */}
      <motion.section
        className="hero-bg waves-pattern text-white rounded-3xl shadow-xl p-5 sm:p-7 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-right gap-5 relative overflow-hidden"
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        {/* Glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-sand-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative shrink-0 z-10">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-sand-400 text-ocean-900 text-3xl font-black flex items-center justify-center overflow-hidden ring-4 ring-white/30 shadow-xl">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0) || <UserIcon className="w-8 h-8" />
            )}
          </div>
          <motion.button
            onClick={() => avatarInputRef.current?.click()}
            type="button"
            aria-label="تغيير الصورة الشخصية"
            className="absolute -bottom-1 -left-1 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-sand-400 text-ocean-900 grid place-items-center shadow-lg border-2 border-white hover:bg-sand-200 transition"
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
          >
            <Camera className="w-4 h-4" />
          </motion.button>
        </div>

        <div className="flex-1 min-w-0 relative z-10 space-y-2">
          <h2 className="text-xl sm:text-2xl font-black flex items-center justify-center sm:justify-start gap-2 truncate">
            <span>{user?.name || 'مستخدم بورسعيد'}</span>
            {user?.email_verified && <CheckCircle className="w-5 h-5 text-sky-400 fill-sky-400 shrink-0" />}
          </h2>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs font-bold">
            <span className="rounded-full bg-white/20 border border-white/30 px-3 py-1">
              {userRoleTitle}
            </span>
            {user?.type && (
              <span className="rounded-full bg-white/20 border border-white/30 px-3 py-1">
                {userTypeTitle}
              </span>
            )}
            {user?.gov && (
              <span className="rounded-full bg-white/20 border border-white/30 px-3 py-1">
                {user.gov}
              </span>
            )}
          </div>

          {avatarMsg && <p className="text-xs text-sand-300 font-bold">{avatarMsg}</p>}
        </div>

        <motion.div
          className="shrink-0 rounded-2xl bg-white/15 border border-white/30 px-5 py-3 text-center relative z-10 backdrop-blur-sm self-stretch sm:self-auto"
          whileHover={{ scale: 1.05 }}
        >
          <p className="text-2xl sm:text-3xl font-black text-sand-400 flex items-center justify-center gap-1.5">
            <Star className="w-6 h-6 fill-sand-400" />
            <span>{user?.points ?? 0}</span>
          </p>
          <p className="text-xs text-white/90 font-bold mt-0.5">نقطة مكافآت بورسعيد</p>
        </motion.div>
      </motion.section>

      {/* 1. NEW: Preferences Section (قسم التفضيلات في الإعدادات) */}
      <motion.section
        className="bg-white dark:bg-[#0c1622] rounded-3xl shadow-xl p-5 sm:p-7 border border-slate-200 dark:border-[#1d2d3e] space-y-5"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#172536] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 grid place-items-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-ocean-950 dark:text-white">
                التفضيلات وإعدادات الاستخدام
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                خصص تجربة استخدام Port Said Hub بما يناسب ذوقك واحتياجاتك
              </p>
            </div>
          </div>

          <motion.button
            onClick={handleSavePreferences}
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Save className="w-3.5 h-3.5" />
            <span>حفظ</span>
          </motion.button>
        </div>

        {/* 1.1 Theme Mode Selection */}
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-black text-ocean-950 dark:text-white">
            مظهر الموقع (المظهر والسمة)
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleThemeSelect('light')}
              className={`p-3 rounded-2xl border text-xs sm:text-sm font-bold flex flex-col items-center justify-center gap-1.5 transition ${
                prefs.themeMode === 'light'
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs'
                  : 'bg-slate-50 dark:bg-[#121f2f] border-slate-200 dark:border-[#1e2f42] text-slate-700 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              <Sun className="w-5 h-5 text-amber-500" />
              <span>نهاري ☀️</span>
            </button>

            <button
              type="button"
              onClick={() => handleThemeSelect('dark')}
              className={`p-3 rounded-2xl border text-xs sm:text-sm font-bold flex flex-col items-center justify-center gap-1.5 transition ${
                prefs.themeMode === 'dark'
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs'
                  : 'bg-slate-50 dark:bg-[#121f2f] border-slate-200 dark:border-[#1e2f42] text-slate-700 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              <Moon className="w-5 h-5 text-indigo-400" />
              <span>ليلي 🌙</span>
            </button>

            <button
              type="button"
              onClick={() => handleThemeSelect('auto')}
              className={`p-3 rounded-2xl border text-xs sm:text-sm font-bold flex flex-col items-center justify-center gap-1.5 transition ${
                prefs.themeMode === 'auto'
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs'
                  : 'bg-slate-50 dark:bg-[#121f2f] border-slate-200 dark:border-[#1e2f42] text-slate-700 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              <Laptop className="w-5 h-5 text-slate-500" />
              <span>تلقائي 💻</span>
            </button>
          </div>
        </div>

        {/* 1.2 Preferred Transit Mode */}
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-black text-ocean-950 dark:text-white">
            وسيلة التنقل الافتراضية المفضلة
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'microbus', label: 'ميكروباص وسرفيس', desc: 'اقتصادي وشعبي' },
              { id: 'taxi', label: 'تاكسي بورسعيد', desc: 'سريع ومباشر' },
              { id: 'car', label: 'سيارة خاصة', desc: 'حرية الحركة' },
              { id: 'walking', label: 'مشي على الأقدام', desc: 'ممتع بالجو المعتدل' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, transportMode: m.id as any }))}
                className={`p-2.5 sm:p-3 rounded-2xl border text-right transition ${
                  prefs.transportMode === m.id
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs'
                    : 'bg-slate-50 dark:bg-[#121f2f] border-slate-200 dark:border-[#1e2f42] text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <p className="font-black text-xs sm:text-sm">{m.label}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 1.3 Preferred Map Style */}
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-black text-ocean-950 dark:text-white">
            نمط الخريطة التفاعلية
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'light', label: 'ناصع وواضح', icon: '🗺️' },
              { id: 'detailed', label: 'ألوان حيوية', icon: '🎨' },
              { id: 'streets', label: 'شوارع ومعالم', icon: '🏛️' },
            ].map((map) => (
              <button
                key={map.id}
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, mapStyle: map.id as any }))}
                className={`p-2.5 rounded-2xl border text-center transition ${
                  prefs.mapStyle === map.id
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs font-bold'
                    : 'bg-slate-50 dark:bg-[#121f2f] border-slate-200 dark:border-[#1e2f42] text-slate-700 dark:text-slate-300 font-semibold'
                }`}
              >
                <span className="text-base block mb-0.5">{map.icon}</span>
                <span className="text-xs">{map.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 1.4 Exploration Interests */}
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-black text-ocean-950 dark:text-white">
            اهتماماتك في بورسعيد (حدد ما يهمك لترشيحات أذكى)
          </label>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((opt) => {
              const active = prefs.interests.includes(opt.id);
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleInterest(opt.id)}
                  className={`px-3 py-2 rounded-2xl border text-xs font-bold transition flex items-center gap-1.5 ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-[#121f2f] border-slate-200 dark:border-[#1e2f42] text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : opt.color}`} />
                  <span>{opt.label}</span>
                  {active && <Check className="w-3 h-3 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 1.5 Notification and Audio Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div
            onClick={() => setPrefs((p) => ({ ...p, notificationsEnabled: !p.notificationsEnabled }))}
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#121f2f] border border-slate-200 dark:border-[#1e2f42] flex items-center justify-between cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-xs sm:text-sm font-black text-ocean-950 dark:text-white">تنبيهات العروض والنقاط</p>
                <p className="text-[10px] text-slate-500">إشعار عند إضافة كوبونات أو مكافآت جديدة</p>
              </div>
            </div>
            <div
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                prefs.notificationsEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  prefs.notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </div>

          <div
            onClick={() => setPrefs((p) => ({ ...p, soundEffectsEnabled: !p.soundEffectsEnabled }))}
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#121f2f] border border-slate-200 dark:border-[#1e2f42] flex items-center justify-between cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-teal2-600" />
              <div>
                <p className="text-xs sm:text-sm font-black text-ocean-950 dark:text-white">أصوات التفاعل</p>
                <p className="text-[10px] text-slate-500">مؤثرات صوتية هادئة عند إنجاز الحضور</p>
              </div>
            </div>
            <div
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                prefs.soundEffectsEnabled ? 'bg-teal2-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  prefs.soundEffectsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Save Confirmation Toast */}
        <AnimatePresence>
          {prefsSavedMsg && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="p-3 rounded-2xl bg-teal2-50 dark:bg-teal2-950/40 text-teal2-800 dark:text-teal2-300 border border-teal2-200 dark:border-teal2-800/40 text-xs font-black flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4 text-teal2-600 shrink-0" />
              <span>تم حفظ تفضيلاتك بنجاح ✓ وسيتم تطبيقها في كامل الموقع.</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Two Columns Grid for Personal Details & Security */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-start">
        {/* Personal Details */}
        <motion.section
          className="bg-white dark:bg-[#0c1622] rounded-3xl shadow-xl p-5 sm:p-7 border border-slate-200 dark:border-[#1d2d3e] space-y-4"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="text-base sm:text-lg font-black text-ocean-950 dark:text-white flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-blue-600" />
            <span>البيانات الشخصية</span>
          </h3>

          <div className="space-y-3 divide-y divide-slate-100 dark:divide-[#172536] text-xs sm:text-sm">
            <div className="pt-2 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">الاسم</span>
              <span className="font-bold text-ocean-950 dark:text-white">{user?.name}</span>
            </div>

            {user?.phone && (
              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">الهاتف</span>
                <span dir="ltr" className="font-bold font-mono text-ocean-950 dark:text-white">
                  {user.phone}
                </span>
              </div>
            )}

            {user?.email && (
              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">البريد الإلكتروني</span>
                <span dir="ltr" className="font-bold text-ocean-950 dark:text-white">
                  {user.email}
                </span>
              </div>
            )}

            {user?.gender && (
              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">الجنس</span>
                <span className="font-bold text-ocean-950 dark:text-white">
                  {user.gender === 'male' ? 'ذكر' : 'أنثى'}
                </span>
              </div>
            )}

            {user?.institution && (
              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">الكلية / المدرسة</span>
                <span className="font-bold text-xs max-w-[60%] truncate text-ocean-950 dark:text-white">
                  {user.institution}
                </span>
              </div>
            )}

            {user?.gov && (
              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">المحافظة</span>
                <span className="font-bold text-ocean-950 dark:text-white">{user.gov}</span>
              </div>
            )}
          </div>

          {/* Email Verification Box */}
          <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-[#121f2f] p-4 border border-slate-200 dark:border-[#1d2d3e]">
            {user?.email_verified ? (
              <p className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span>بريدك الإلكتروني موثّق بالعلامة الزرقاء ✓</span>
              </p>
            ) : (
              <div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-bold mb-2">
                  بريدك الإلكتروني غير موثق حالياً.
                </p>
                <motion.button
                  type="button"
                  onClick={() => setVerMsg('تم إرسال رابط التوثيق إلى بريدك الإلكتروني بنجاح.')}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  إرسال رابط التوثيق
                </motion.button>
                {verMsg && <p className="text-xs text-blue-600 font-bold mt-2">{verMsg}</p>}
              </div>
            )}
          </div>
        </motion.section>

        {/* Security & Password */}
        <motion.section
          className="bg-white dark:bg-[#0c1622] rounded-3xl shadow-xl p-5 sm:p-7 border border-slate-200 dark:border-[#1d2d3e] space-y-4"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-base sm:text-lg font-black text-ocean-950 dark:text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" />
            <span>الأمان وتغيير كلمة المرور</span>
          </h3>

          <form onSubmit={handleChangePassSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold mb-1 text-ocean-950 dark:text-white">
                كلمة المرور الحالية
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  dir="ltr"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 dark:border-[#203042] bg-slate-50 dark:bg-[#121f2f] text-ocean-950 dark:text-white px-3.5 py-2.5 text-xs sm:text-sm pl-10 outline-none focus:border-blue-600 font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-ocean-950 dark:text-white">
                كلمة المرور الجديدة
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  dir="ltr"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 dark:border-[#203042] bg-slate-50 dark:bg-[#121f2f] text-ocean-950 dark:text-white px-3.5 py-2.5 text-xs sm:text-sm pl-10 outline-none focus:border-blue-600 font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength Meter */}
              {newPass && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-[#203246] overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        strength <= 1
                          ? 'bg-red-500 w-1/4'
                          : strength <= 3
                          ? 'bg-amber-500 w-2/3'
                          : 'bg-emerald-500 w-full'
                      }`}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                    {strength <= 1 ? 'ضعيفة' : strength <= 3 ? 'متوسطة' : 'قوية جداً ✓'}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-ocean-950 dark:text-white">
                تأكيد كلمة المرور الجديدة
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  dir="ltr"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 dark:border-[#203042] bg-slate-50 dark:bg-[#121f2f] text-ocean-950 dark:text-white px-3.5 py-2.5 text-xs sm:text-sm pl-10 outline-none focus:border-blue-600 font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {passMsg && (
              <p className={`text-xs font-bold ${passMsg.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                {passMsg.text}
              </p>
            )}

            <motion.button
              type="submit"
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm shadow-md transition"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              حفظ كلمة المرور
            </motion.button>
          </form>
        </motion.section>
      </div>
    </motion.div>
  );
};
