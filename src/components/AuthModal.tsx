'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowRight,
  ArrowLeft,
  Bus,
  Utensils,
  Bed,
  Star,
  User as UserIcon,
  Store,
  GraduationCap,
  Compass,
  Home,
  Sun,
  Moon,
  Eye,
  EyeOff,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  Lock,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { GOVERNORATES, INSTITUTIONS } from '@/lib/constants';
import { GenderType, UserTypeCategory } from '@/types';

interface AuthModalProps {
  onSuccess: () => void;
  onBackToWelcome: () => void;
}

const STEPS = ['البيانات الأساسية', 'التفاصيل', 'كلمة المرور'];

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess, onBackToWelcome }) => {
  const { login, registerUser, registerMerchant, theme, toggleTheme } = useAuth();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [accountType, setAccountType] = useState<'user' | 'merchant'>('user');

  // Login
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Signup wizard
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<GenderType>('male');
  const [userType, setUserType] = useState<UserTypeCategory>('student');
  const [institution, setInstitution] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Merchant
  const [bizName, setBizName] = useState('');
  const [bizCategory, setBizCategory] = useState('food');
  const [bizArea, setBizArea] = useState('');
  const [bizDiscount, setBizDiscount] = useState<number>(10);
  const [bizCommission, setBizCommission] = useState<number>(5);
  const [bizNotes, setBizNotes] = useState('');

  const [signupErr, setSignupErr] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  const passStrength = (p: string) => {
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };
  const ps = passStrength(password);
  const psColors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-teal2-500'];
  const psLabels = ['', 'ضعيفة', 'مقبولة', 'جيدة', 'قوية'];

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr('');
    setLoginLoading(true);
    const res = await login(loginId, loginPass);
    setLoginLoading(false);
    if (!res.ok) setLoginErr(res.message || 'بيانات الدخول غير صحيحة.');
    else onSuccess();
  };

  const handleSignupNext = (e: React.FormEvent) => {
    e.preventDefault();
    setSignupErr('');
    if (step === 1) {
      if (!name.trim()) return setSignupErr('برجاء كتابة الاسم.');
      if (accountType === 'merchant' && !bizName.trim()) return setSignupErr('برجاء كتابة اسم المتجر.');
      setStep(2);
    } else if (step === 2) {
      if (accountType === 'user' && userType === 'student' && !institution) return setSignupErr('برجاء اختيار الكلية.');
      if (!phone.trim()) return setSignupErr('برجاء كتابة رقم الهاتف.');
      if (!phone.startsWith('01') || phone.length !== 11) return setSignupErr('رقم الهاتف يجب 11 رقم ويبدأ بـ 01.');
      setStep(3);
    } else if (step === 3) {
      if (!email.trim() || !email.includes('@')) return setSignupErr('برجاء كتابة بريد إلكتروني صحيح.');
      if (password.length < 8) return setSignupErr('كلمة المرور 8 أحرف على الأقل.');
      if (password !== passwordConfirm) return setSignupErr('كلمتا المرور غير متطابقتين.');
      handleFinalSignup();
    }
  };

  const handleFinalSignup = async () => {
    setSignupLoading(true);
    setSignupErr('');
    const res =
      accountType === 'merchant'
        ? await registerMerchant({
            name,
            email,
            phone,
            password,
            business_name: bizName,
            category: bizCategory,
            area: bizArea || 'حي الشرق',
            discount: bizDiscount,
            commission: bizCommission,
            notes: bizNotes,
          })
        : await registerUser({
            name,
            email,
            phone,
            password,
            gender,
            user_type: userType,
            governorate: userType === 'local' ? 'بورسعيد' : governorate,
            institution: userType === 'student' ? institution : undefined,
          });
    setSignupLoading(false);
    if (!res.ok) setSignupErr(res.message || 'حدث خطأ أثناء التسجيل.');
    else setShowIntro(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto waves-pattern flex items-center justify-center p-3 sm:p-4">
      {/* Theme Toggle */}
      <motion.button
        onClick={toggleTheme}
        type="button"
        aria-label="تبديل الوضع الليلي والنهاري"
        className="absolute left-4 top-4 z-20 w-11 h-11 rounded-2xl bg-white/15 border border-white/30 text-white backdrop-blur-sm flex items-center justify-center hover:bg-white/25 transition shadow-lg"
        whileHover={{ scale: 1.1, rotate: 15 }}
        whileTap={{ scale: 0.9 }}
      >
        {theme === 'dark' ? <Sun className="w-5 h-5 text-sand-400" /> : <Moon className="w-5 h-5" />}
      </motion.button>

      {/* Card with Spring Animation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-md md:max-w-4xl bg-white dark:bg-[#0e1621] text-ocean-900 dark:text-white rounded-3xl shadow-2xl shadow-black/40 overflow-hidden md:grid md:grid-cols-5 border border-white/10"
      >
        {/* Left sidebar (desktop) */}
        <aside className="hidden md:flex md:col-span-2 flex-col justify-between waves-pattern text-white p-8 relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-60 h-60 bg-sand-400/10 blur-3xl pointer-events-none" />

          <div className="space-y-6 relative z-10">
            <motion.div
              className="w-16 h-16 rounded-2xl bg-gradient-to-b from-[#f8f4ea] to-[#ffe3a8] border-2 border-white/40 shadow-xl flex items-center justify-center overflow-hidden"
              whileHover={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 0.5 }}
            >
              <img src="/assets/logo/icon-192.png" alt="Port Said Hub" className="w-[84%] h-[84%] object-contain" />
            </motion.div>
            <div>
              <p dir="ltr" className="text-2xl font-black leading-tight tracking-tight">
                Port Said Hub
              </p>
              <p className="text-white/75 text-sm font-semibold mt-0.5">دليلك الشامل في بورسعيد</p>
            </div>
            <ul className="space-y-3.5">
              {[
                { icon: <Bus className="w-4 h-4" />, text: 'مواصلات السكن للكلية' },
                { icon: <Utensils className="w-4 h-4" />, text: 'أفضل المطاعم والكافيهات' },
                { icon: <Bed className="w-4 h-4" />, text: 'سكن وأماكن قريبة منك' },
                { icon: <Star className="w-4 h-4" />, text: 'نقاط ومكافآت على كل زيارة' },
              ].map((item, i) => (
                <motion.li
                  key={i}
                  className="flex items-center gap-2.5 text-white/90 font-bold text-sm"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                >
                  <span className="w-7 h-7 rounded-xl bg-white/15 flex items-center justify-center text-sand-400 shrink-0 shadow-sm">
                    {item.icon}
                  </span>
                  <span>{item.text}</span>
                </motion.li>
              ))}
            </ul>
          </div>
          <div className="text-white/50 text-xs font-semibold relative z-10">
            فريق Alpha Team &copy; 2026
          </div>
        </aside>

        {/* Right form */}
        <div className="p-6 sm:p-8 md:col-span-3 flex flex-col min-h-[520px]">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <motion.button
              onClick={onBackToWelcome}
              type="button"
              className="w-10 h-10 shrink-0 rounded-2xl bg-sand-100 dark:bg-[#1a2535] text-ocean-700 dark:text-teal2-400 flex items-center justify-center hover:bg-sand-200 dark:hover:bg-[#243347] transition shadow-sm"
              whileHover={{ scale: 1.05, x: 2 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowRight className="w-5 h-5" />
            </motion.button>
            <div className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-b from-[#f8f4ea] to-[#ffe3a8] border border-sand-200/50 shadow flex items-center justify-center overflow-hidden">
              <img src="/assets/logo/icon-192.png" alt="" className="w-[84%] h-[84%] object-contain" />
            </div>
            <div>
              <p dir="ltr" className="font-black text-lg leading-none">
                Port Said Hub
              </p>
              <p className="text-xs text-ocean-700/60 dark:text-white/50 mt-1 font-bold">
                انضم لمجتمع بورسعيد
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-sand-100 dark:bg-[#1a2535] mb-5 relative">
            {(['login', 'signup'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setStep(1);
                }}
                type="button"
                className={`py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all duration-200 relative z-10 ${
                  tab === t
                    ? 'bg-white dark:bg-[#243347] shadow-md text-ocean-900 dark:text-white'
                    : 'text-ocean-700/60 dark:text-white/50 hover:text-ocean-900 dark:hover:text-white'
                }`}
              >
                {t === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
              </button>
            ))}
          </div>

          {/* ============ LOGIN ============ */}
          {tab === 'login' && (
            <motion.form
              onSubmit={handleLoginSubmit}
              className="space-y-4 flex-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div>
                <label className="block text-xs sm:text-sm font-bold mb-2 text-ocean-900 dark:text-white/90">
                  <Mail className="w-4 h-4 inline ml-1.5 text-teal2-500" />
                  رقم الهاتف / البريد الإلكتروني
                </label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="01xxxxxxxxx أو name@example.com"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="ps-input"
                  required
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold mb-2 text-ocean-900 dark:text-white/90">
                  <Lock className="w-4 h-4 inline ml-1.5 text-teal2-500" />
                  كلمة المرور
                </label>
                <div className="relative">
                  <input
                    type={showLoginPass ? 'text' : 'password'}
                    dir="ltr"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    className="ps-input pl-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPass(!showLoginPass)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {loginErr && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-500 font-bold bg-red-50 dark:bg-red-950/30 rounded-xl px-3 py-2 border border-red-200/50"
                >
                  {loginErr}
                </motion.p>
              )}
              <motion.button
                type="submit"
                disabled={loginLoading}
                className="ps-btn-primary mt-2 flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loginLoading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                <span>{loginLoading ? 'جارٍ تسجيل الدخول...' : 'دخول'}</span>
              </motion.button>
            </motion.form>
          )}

          {/* ============ SIGNUP ============ */}
          {tab === 'signup' && (
            <motion.form
              onSubmit={handleSignupNext}
              className="space-y-4 flex-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Account type */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'user', Icon: UserIcon, label: 'مستخدم عادي', sub: 'طالب / زائر / بورسعيدي' },
                  { key: 'merchant', Icon: Store, label: 'تاجر / شريك', sub: 'صاحب محل أو نشاط' },
                ].map((at) => (
                  <motion.button
                    key={at.key}
                    type="button"
                    onClick={() => setAccountType(at.key as any)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 text-xs font-bold transition ${
                      accountType === at.key
                        ? 'border-teal2-500 bg-teal2-50 dark:bg-teal2-900/20 text-teal2-600 dark:text-teal2-400'
                        : 'border-sand-200 dark:border-[#2a3a4a] bg-sand-50 dark:bg-[#1a2535] text-ocean-700 dark:text-white/70 hover:border-teal2-300'
                    }`}
                  >
                    <at.Icon className="w-5 h-5" />
                    <span className="font-black">{at.label}</span>
                    <span className="text-[10px] font-normal opacity-70">{at.sub}</span>
                  </motion.button>
                ))}
              </div>

              {/* Step Progress with Animated Bar */}
              <div className="flex items-center gap-2">
                {STEPS.map((label, i) => (
                  <React.Fragment key={i}>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition ${
                          step > i + 1
                            ? 'bg-teal2-500 text-white'
                            : step === i + 1
                            ? 'bg-ocean-900 dark:bg-teal2-500 text-white'
                            : 'bg-sand-200 dark:bg-[#2a3a4a] text-ocean-700/50'
                        }`}
                      >
                        {step > i + 1 ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                      </div>
                      <span
                        className={`text-[10px] font-bold hidden sm:block ${
                          step === i + 1
                            ? 'text-ocean-900 dark:text-white'
                            : 'text-ocean-700/40 dark:text-white/30'
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                          step > i + 1 ? 'bg-teal2-500' : 'bg-sand-200 dark:bg-[#2a3a4a]'
                        }`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Step 1 */}
              {step === 1 && (
                <div className="space-y-3 fade-slide-up">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold mb-1.5">
                      <UserIcon className="w-4 h-4 inline ml-1.5 text-teal2-500" />
                      {accountType === 'merchant' ? 'اسم صاحب المتجر' : 'الاسم الكامل'}
                    </label>
                    <input
                      type="text"
                      placeholder="اسمك بالكامل"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="ps-input"
                      required
                    />
                  </div>
                  {accountType === 'merchant' && (
                    <div>
                      <label className="block text-xs sm:text-sm font-bold mb-1.5">
                        <Store className="w-4 h-4 inline ml-1.5 text-teal2-500" />
                        اسم المتجر / النشاط
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: مطعم سمك البحر"
                        value={bizName}
                        onChange={(e) => setBizName(e.target.value)}
                        className="ps-input"
                        required
                      />
                    </div>
                  )}
                  {accountType === 'user' && (
                    <>
                      <div>
                        <label className="block text-xs sm:text-sm font-bold mb-1.5">الجنس</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { val: 'male', label: '👨 ذكر' },
                            { val: 'female', label: '👩 أنثى' },
                          ].map((g) => (
                            <button
                              key={g.val}
                              type="button"
                              onClick={() => setGender(g.val as GenderType)}
                              className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition ${
                                gender === g.val
                                  ? 'border-teal2-500 bg-teal2-50 dark:bg-teal2-900/20 text-teal2-600'
                                  : 'border-sand-200 dark:border-[#2a3a4a] bg-white dark:bg-[#1a2535]'
                              }`}
                            >
                              {g.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-bold mb-1.5">أنت؟</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { val: 'student', Icon: GraduationCap, label: 'طالب', sub: 'جامعة أو معهد' },
                            { val: 'visitor', Icon: Compass, label: 'زائر', sub: 'سائح / مغترب' },
                            { val: 'local', Icon: Home, label: 'بورسعيدي', sub: 'ابن البلد' },
                          ].map((ut) => (
                            <button
                              key={ut.val}
                              type="button"
                              onClick={() => setUserType(ut.val as UserTypeCategory)}
                              className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition text-xs font-bold ${
                                userType === ut.val
                                  ? 'border-teal2-500 bg-teal2-50 dark:bg-teal2-900/20 text-teal2-600'
                                  : 'border-sand-200 dark:border-[#2a3a4a] bg-white dark:bg-[#1a2535]'
                              }`}
                            >
                              <ut.Icon className="w-4 h-4" />
                              <span className="font-black text-xs">{ut.label}</span>
                              <span className="text-[9px] opacity-60 font-normal">{ut.sub}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <div className="space-y-3 fade-slide-up">
                  {accountType === 'merchant' ? (
                    <>
                      <div>
                        <label className="block text-xs sm:text-sm font-bold mb-1.5">
                          <MapPin className="w-4 h-4 inline ml-1.5 text-teal2-500" />
                          المنطقة
                        </label>
                        <input
                          type="text"
                          placeholder="مثال: حي الشرق"
                          value={bizArea}
                          onChange={(e) => setBizArea(e.target.value)}
                          className="ps-input"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-bold mb-1.5">نوع النشاط</label>
                        <select
                          value={bizCategory}
                          onChange={(e) => setBizCategory(e.target.value)}
                          className="ps-select"
                        >
                          {[
                            ['food', 'مطاعم'],
                            ['cafe', 'كافيهات'],
                            ['sweets', 'حلويات'],
                            ['shop', 'تسوق'],
                            ['sport', 'رياضة'],
                            ['fun', 'معالم وترفيه'],
                          ].map(([v, l]) => (
                            <option key={v} value={v}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold mb-1">خصم العميل %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={bizDiscount}
                            onChange={(e) => setBizDiscount(parseInt(e.target.value) || 0)}
                            className="ps-input"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold mb-1">عمولة Alpha (جنيه)</label>
                          <input
                            type="number"
                            min="0"
                            value={bizCommission}
                            onChange={(e) => setBizCommission(parseFloat(e.target.value) || 0)}
                            className="ps-input"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {userType === 'student' && (
                        <div>
                          <label className="block text-xs sm:text-sm font-bold mb-1.5">
                            <GraduationCap className="w-4 h-4 inline ml-1.5 text-teal2-500" />
                            الكلية / المعهد
                          </label>
                          <select
                            value={institution}
                            onChange={(e) => setInstitution(e.target.value)}
                            className="ps-select"
                            required
                          >
                            <option value="">اختر الكلية أو المدرسة</option>
                            <optgroup label="جامعة بورسعيد">
                              {INSTITUTIONS.filter((x) => x.includes('جامعة بورسعيد')).map((x) => (
                                <option key={x} value={x}>
                                  {x}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="جامعة شرق بورسعيد الأهلية">
                              {INSTITUTIONS.filter((x) => x.includes('الأهلية')).map((x) => (
                                <option key={x} value={x}>
                                  {x}
                                </option>
                              ))}
                            </optgroup>
                            <option value="مدرسة (مش في كلية)">مدرسة (مش في كلية)</option>
                            <option value="كلية أخرى">كلية أخرى</option>
                          </select>
                        </div>
                      )}
                      {userType !== 'local' && (
                        <div>
                          <label className="block text-xs sm:text-sm font-bold mb-1.5">
                            <MapPin className="w-4 h-4 inline ml-1.5 text-teal2-500" />
                            المحافظة الأصلية
                          </label>
                          <select
                            value={governorate}
                            onChange={(e) => setGovernorate(e.target.value)}
                            className="ps-select"
                          >
                            <option value="">اختر المحافظة</option>
                            {GOVERNORATES.map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  )}
                  <div>
                    <label className="block text-xs sm:text-sm font-bold mb-1.5">
                      <Phone className="w-4 h-4 inline ml-1.5 text-teal2-500" />
                      رقم الهاتف
                    </label>
                    <input
                      type="tel"
                      dir="ltr"
                      placeholder="01xxxxxxxxx"
                      maxLength={11}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="ps-input"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {step === 3 && (
                <div className="space-y-3 fade-slide-up">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold mb-1.5">
                      <Mail className="w-4 h-4 inline ml-1.5 text-teal2-500" />
                      البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      dir="ltr"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="ps-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold mb-1.5">
                      <Lock className="w-4 h-4 inline ml-1.5 text-teal2-500" />
                      كلمة المرور (8 أحرف على الأقل)
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        dir="ltr"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="ps-input pl-11"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {password.length > 0 && (
                      <div className="mt-2">
                        <div className="flex gap-1">
                          {[0, 1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className={`h-1.5 flex-1 rounded-full transition ${
                                i < ps ? psColors[ps - 1] : 'bg-sand-200 dark:bg-[#2a3a4a]'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs mt-1 text-ocean-700/60 dark:text-white/50">{psLabels[ps]}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold mb-1.5">
                      <Lock className="w-4 h-4 inline ml-1.5 text-teal2-500" />
                      تأكيد كلمة المرور
                    </label>
                    <input
                      type="password"
                      dir="ltr"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      className="ps-input"
                      required
                    />
                    {passwordConfirm && password === passwordConfirm && (
                      <p className="text-xs text-teal2-600 mt-1 flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> كلمتا المرور متطابقتان
                      </p>
                    )}
                  </div>
                </div>
              )}

              {signupErr && (
                <p className="text-xs text-red-500 font-bold bg-red-50 dark:bg-red-950/30 rounded-xl px-3 py-2 border border-red-200/50">
                  {signupErr}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                {step > 1 && (
                  <motion.button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-1.5 px-4 rounded-2xl bg-sand-100 dark:bg-[#1a2535] text-ocean-700 dark:text-white font-bold text-xs sm:text-sm hover:bg-sand-200 transition"
                  >
                    <ArrowLeft className="w-4 h-4" /> السابق
                  </motion.button>
                )}
                <motion.button
                  type="submit"
                  disabled={signupLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 ps-btn-primary text-xs sm:text-sm flex items-center justify-center gap-2"
                >
                  {signupLoading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                  <span>{signupLoading ? 'جارٍ المعالجة...' : step < 3 ? `التالي (${step}/3)` : 'إنشاء الحساب'}</span>
                </motion.button>
              </div>
            </motion.form>
          )}
        </div>
      </motion.div>

      {/* Intro Modal After Signup */}
      {showIntro && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0e1621] text-ocean-900 dark:text-white shadow-2xl overflow-hidden border border-white/10"
          >
            <div className="waves-pattern text-white p-7 text-center relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  background: 'radial-gradient(circle at center, rgba(255,185,56,0.6) 0%, transparent 70%)',
                }}
              />
              <div className="relative z-10">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-b from-[#f8f4ea] to-[#ffe3a8] flex items-center justify-center shadow-xl mb-3">
                  <img src="/assets/logo/icon-192.png" alt="" className="w-[80%] h-[80%] object-contain" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black">أهلًا بيك في بورسعيد 🎉</h2>
                <p className="mt-1 text-white/80 text-sm font-semibold">مدينة البحر والقناة</p>
              </div>
            </div>
            <div className="p-6 space-y-4 text-xs sm:text-sm leading-relaxed">
              <p>
                بورسعيد مدينة على البحر المتوسط ومدخل قناة السويس، فيها الحي الإفرنجي بشرفاته الخشب،
                والفنار، والممشى السياحي، وناس طيبين.
              </p>
              <p>
                <b>Port Said Hub</b> اتعمل عشانك: تعرف تروح كليتك من السكن، وتلاقي المطاعم والكافيهات
                والأماكن، وكل ده بالعربي وبسهولة.
              </p>
              <motion.button
                type="button"
                onClick={() => {
                  setShowIntro(false);
                  onSuccess();
                }}
                className="ps-btn-primary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                يلا نبدأ 🚀
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
