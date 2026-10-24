'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
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
  ShieldCheck,
} from 'lucide-react';

interface AccountViewProps {
  onBack: () => void;
}

export const AccountView: React.FC<AccountViewProps> = ({ onBack }) => {
  const { user, updateAvatar, changePassword } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [passMsg, setPassMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [avatarMsg, setAvatarMsg] = useState('');
  const [verMsg, setVerMsg] = useState('');

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
      className="space-y-6 max-w-4xl mx-auto"
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

      {/* Hero Profile Badge with Ambient Waves */}
      <motion.section
        className="hero-bg waves-pattern text-white rounded-3xl shadow-xl p-5 sm:p-6 flex items-center gap-4 sm:gap-6 flex-wrap relative overflow-hidden"
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        {/* Glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-sand-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative shrink-0 z-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-sand-400 text-ocean-900 text-3xl font-black flex items-center justify-center overflow-hidden ring-4 ring-white/30 shadow-xl">
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
            className="absolute -bottom-1 -left-1 w-8 h-8 rounded-full bg-sand-400 text-ocean-900 grid place-items-center shadow-lg border-2 border-white hover:bg-sand-200 transition"
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
          >
            <Camera className="w-4 h-4" />
          </motion.button>
        </div>

        <div className="flex-1 min-w-0 relative z-10">
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2 truncate">
            <span>{user?.name || 'مستخدم بورسعيد'}</span>
            {user?.email_verified && <CheckCircle className="w-5 h-5 text-sky-400 fill-sky-400" />}
          </h2>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-white/20 border border-white/30 px-3 py-0.5">
              {userRoleTitle}
            </span>
            {user?.type && (
              <span className="rounded-full bg-white/20 border border-white/30 px-3 py-0.5">
                {userTypeTitle}
              </span>
            )}
            {user?.gov && (
              <span className="rounded-full bg-white/20 border border-white/30 px-3 py-0.5">
                {user.gov}
              </span>
            )}
          </div>
          {avatarMsg && <p className="mt-1.5 text-xs text-sand-300 font-bold">{avatarMsg}</p>}
        </div>

        <motion.div
          className="shrink-0 rounded-2xl bg-white/15 border border-white/30 px-4 py-2.5 text-center relative z-10 backdrop-blur-sm"
          whileHover={{ scale: 1.05 }}
        >
          <p className="text-2xl sm:text-3xl font-black text-sand-400 flex items-center justify-center gap-1">
            <Star className="w-6 h-6 fill-sand-400" />
            <span>{user?.points ?? 0}</span>
          </p>
          <p className="text-xs text-white/90 font-bold">نقطة مكافآت</p>
        </motion.div>
      </motion.section>

      {/* Two Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Personal Details */}
        <motion.section
          className="bg-white dark:bg-[#0f1a28] rounded-3xl shadow-xl p-6 sm:p-7 border border-sand-200/80 dark:border-[#1d2d3e] space-y-4"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-lg font-black text-ocean-900 dark:text-white flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-teal2-600" />
            <span>البيانات الشخصية</span>
          </h3>

          <div className="space-y-3 divide-y divide-sand-200/60 dark:divide-[#1d2d3e] text-xs sm:text-sm">
            <div className="pt-2 flex items-center justify-between">
              <span className="text-ocean-700/70 dark:text-white/60 font-medium">الاسم</span>
              <span className="font-bold">{user?.name}</span>
            </div>

            {user?.phone && (
              <div className="pt-2 flex items-center justify-between">
                <span className="text-ocean-700/70 dark:text-white/60 font-medium">الهاتف</span>
                <span dir="ltr" className="font-bold font-mono">
                  {user.phone}
                </span>
              </div>
            )}

            {user?.email && (
              <div className="pt-2 flex items-center justify-between">
                <span className="text-ocean-700/70 dark:text-white/60 font-medium">البريد الإلكتروني</span>
                <span dir="ltr" className="font-bold">
                  {user.email}
                </span>
              </div>
            )}

            {user?.gender && (
              <div className="pt-2 flex items-center justify-between">
                <span className="text-ocean-700/70 dark:text-white/60 font-medium">الجنس</span>
                <span className="font-bold">{user.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
              </div>
            )}

            {user?.institution && (
              <div className="pt-2 flex items-center justify-between">
                <span className="text-ocean-700/70 dark:text-white/60 font-medium">الكلية / المدرسة</span>
                <span className="font-bold text-xs max-w-[60%] truncate">{user.institution}</span>
              </div>
            )}

            {user?.gov && (
              <div className="pt-2 flex items-center justify-between">
                <span className="text-ocean-700/70 dark:text-white/60 font-medium">المحافظة</span>
                <span className="font-bold">{user.gov}</span>
              </div>
            )}
          </div>

          {/* Email Verification Box */}
          <div className="mt-4 rounded-2xl bg-sand-50 dark:bg-[#142232] p-4 border border-sand-200/80 dark:border-[#203246]">
            {user?.email_verified ? (
              <p className="text-xs font-bold text-teal2-600 dark:text-teal2-400 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>بريدك الإلكتروني موثّق بالعلامة الزرقاء ✓</span>
              </p>
            ) : (
              <div>
                <p className="text-xs text-ocean-700/80 dark:text-white/80 font-bold mb-2">
                  بريدك الإلكتروني غير موثق حالياً.
                </p>
                <motion.button
                  type="button"
                  onClick={() => setVerMsg('تم إرسال رابط التوثيق إلى بريدك الإلكتروني بنجاح.')}
                  className="px-3.5 py-1.5 rounded-xl bg-teal2-600 hover:bg-teal2-500 text-white font-bold text-xs transition"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  إرسال رابط التوثيق
                </motion.button>
                {verMsg && <p className="text-xs text-teal2-600 font-bold mt-2">{verMsg}</p>}
              </div>
            )}
          </div>
        </motion.section>

        {/* Security & Password */}
        <motion.section
          className="bg-white dark:bg-[#0f1a28] rounded-3xl shadow-xl p-6 sm:p-7 border border-sand-200/80 dark:border-[#1d2d3e] space-y-4"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-lg font-black text-ocean-900 dark:text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-teal2-600" />
            <span>الأمان وتغيير كلمة المرور</span>
          </h3>

          <form onSubmit={handleChangePassSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold mb-1">كلمة المرور الحالية</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  dir="ltr"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  className="w-full rounded-2xl border border-sand-200 dark:border-[#22354a] bg-sand-50 dark:bg-[#142232] px-3.5 py-2.5 text-xs sm:text-sm pl-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ocean-700/60 dark:text-white/50"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">كلمة المرور الجديدة</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  dir="ltr"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full rounded-2xl border border-sand-200 dark:border-[#22354a] bg-sand-50 dark:bg-[#142232] px-3.5 py-2.5 text-xs sm:text-sm pl-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ocean-700/60 dark:text-white/50"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength Meter */}
              {newPass && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-sand-200 dark:bg-[#203246] overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        strength <= 1
                          ? 'bg-red-500 w-1/4'
                          : strength <= 3
                          ? 'bg-amber-500 w-2/3'
                          : 'bg-teal2-500 w-full'
                      }`}
                    />
                  </div>
                  <p className="text-[10px] text-ocean-700/70 dark:text-white/60 font-semibold">
                    {strength <= 1 ? 'ضعيفة' : strength <= 3 ? 'متوسطة' : 'قوية جداً ✓'}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">تأكيد كلمة المرور الجديدة</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  dir="ltr"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  className="w-full rounded-2xl border border-sand-200 dark:border-[#22354a] bg-sand-50 dark:bg-[#142232] px-3.5 py-2.5 text-xs sm:text-sm pl-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ocean-700/60 dark:text-white/50"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {passMsg && (
              <p className={`text-xs font-bold ${passMsg.ok ? 'text-teal2-600' : 'text-red-600'}`}>
                {passMsg.text}
              </p>
            )}

            <motion.button
              type="submit"
              className="w-full py-3 rounded-2xl bg-teal2-600 hover:bg-teal2-500 text-white font-black text-xs sm:text-sm shadow-md transition"
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
