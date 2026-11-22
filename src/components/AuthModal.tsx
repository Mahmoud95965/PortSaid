'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowRight,
  ArrowLeft,
  Bus,
  Utensils,
  Bed,
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
  Loader2,
} from 'lucide-react';
import { GOVERNORATES, INSTITUTIONS } from '@/lib/constants';
import { GenderType, UserTypeCategory } from '@/types';

interface AuthModalProps {
  onSuccess: () => void;
  onBackToWelcome: () => void;
}

const STEPS_EMAIL = ['البيانات الأساسية', 'التفاصيل', 'كلمة المرور'];
const STEPS_GOOGLE = ['البيانات الأساسية', 'التفاصيل'];

const GoogleSignInButton: React.FC<{ label: string; loading: boolean; onClick: () => void }> = ({
  label,
  loading,
  onClick,
}) => (
  <motion.button
    type="button"
    onClick={onClick}
    disabled={loading}
    className="w-full py-3.5 rounded-2xl bg-white dark:bg-white text-[#1f1f1f] font-black text-sm shadow-md border border-sand-200 hover:bg-sand-50 transition flex items-center justify-center gap-3 disabled:opacity-60"
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    {loading ? (
      <Loader2 className="w-5 h-5 animate-spin text-ocean-900" />
    ) : (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.49 12.27c0-.85-.08-1.66-.21-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.86c2.26-2.09 3.57-5.16 3.57-8.81z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
        />
      </svg>
    )}
    <span>{loading ? 'جارٍ التحويل إلى Google...' : label}</span>
  </motion.button>
);

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess, onBackToWelcome }) => {
  // Login: Google (fast option) + email/password (normal login).
  const { login, registerUser, registerMerchant, theme, toggleTheme, signInWithGoogle, googleUser } = useAuth();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [accountType, setAccountType] = useState<'user' | 'merchant'>('user');

  // Google sign-in (fast option)
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleErr, setGoogleErr] = useState('');
  // Email comes from the Google account (read-only); never typed by the user.
  const googleEmail = googleUser?.email || '';

  // Email login (normal login, as before PR #5)
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Signup method: 'google' when a Google account is linked, 'email' when
  // the user chooses email signup. Null = not chosen yet.
  const [signupMethod, setSignupMethod] = useState<'google' | 'email' | null>(null);

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

  // Pre-fill the name from the Google account (user_metadata full_name) for
  // review/confirmation — the field stays editable.
  useEffect(() => {
    if (googleUser?.name && !name) {
      setName(googleUser.name);
    }
  }, [googleUser, name]);

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

  // Steps for the signup wizard: 3 steps for email signup (with password),
  // 2 steps for Google signup (password-less, name pre-filled from Google).
  const steps = googleUser ? STEPS_GOOGLE : STEPS_EMAIL;

  const handleGoogleSignIn = async () => {
    setGoogleErr('');
    setGoogleLoading(true);
    const res = await signInWithGoogle();
    setGoogleLoading(false);
    if (!res.ok) setGoogleErr(res.message || 'تعذّر تسجيل الدخول بحساب Google.');
    // On success Supabase redirects to Google; after returning, AuthContext
    // picks up the session and googleUser is set, so the form below appears.
  };

  const handleSignupNext = (e: React.FormEvent) => {
    e.preventDefault();
    setSignupErr('');
    if (step === 1) {
      if (!name.trim()) return setSignupErr('برجاء كتابة الاسم.');
      if (accountType === 'merchant' && !bizName.trim()) return setSignupErr('برجاء كتابة اسم المتجر.');
      setStep(2);
    } else if (step === 2) {
      if (accountType === 'user' && userType === 'student' && !institution)
        return setSignupErr('برجاء اختيار الكلية.');
      if (accountType === 'user' && userType !== 'local' && !governorate)
        return setSignupErr('برجاء اختيار المحافظة.');
      if (!phone.trim()) return setSignupErr('برجاء كتابة رقم الهاتف.');
      if (!phone.startsWith('01') || phone.length !== 11) return setSignupErr('رقم الهاتف يجب 11 رقم ويبدأ بـ 01.');
      if (googleUser) {
        handleFinalSignup();
      } else {
        setStep(3);
      }
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
    // Email signup: email + password typed by the user.
    // Google signup: email comes from the Google account; nothing is
    // invented or sent in its place. The server register endpoint must
    // accept a password-less registration for the Google path.
    const signupEmail = googleUser ? googleEmail : email;
    const signupPassword = googleUser ? undefined : password;
    const res =
      accountType === 'merchant'
        ? await registerMerchant({
            name,
            email: signupEmail,
            phone,
            password: signupPassword,
            business_name: bizName,
            category: bizCategory,
            area: bizArea || 'حي الشرق',
            discount: bizDiscount,
            commission: bizCommission,
            notes: bizNotes,
          })
        : await registerUser({
            name,
            email: signupEmail,
            phone,
            password: signupPassword,
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
        className="fixed left-4 top-4 z-[60] w-11 h-11 rounded-2xl bg-white/15 border border-white/30 text-white backdrop-blur-sm flex items-center justify-center hover:bg-white/25 transition shadow-lg"
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
          <div className="text-white/70 text-xs font-semibold relative z-10">
            فريق Alpha Team · بالشراكة مع Genie &copy; 2026
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
                  setSignupMethod(null);
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

          {/* ============ LOGIN: Google (fast) + email/password (normal) ============ */}
          {tab === 'login' && (
            <motion.div
              className="space-y-4 flex-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-xs sm:text-sm text-ocean-700/80 dark:text-white/70 font-medium leading-relaxed">
                سجّل دخولك بأسرع طريقة بحساب Google، أو بالبريد الإلكتروني وكلمة المرور كالمعتاد.
              </p>
              <GoogleSignInButton
                label="تسجيل الدخول بحساب Google"
                loading={googleLoading}
                onClick={handleGoogleSignIn}
              />
              {googleErr && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-500 font-bold bg-red-50 dark:bg-red-950/30 rounded-xl px-3 py-2 border border-red-200/50"
                >
                  {googleErr}
                </motion.p>
              )}
              <div className="flex items-center gap-3 pt-1">
                <span className="flex-1 h-px bg-sand-200 dark:bg-[#2a3a4a]" />
                <span className="text-[11px] font-bold text-ocean-700/50 dark:text-white/40">
                  أو بالبريد الإلكتروني
                </span>
                <span className="flex-1 h-px bg-sand-200 dark:bg-[#2a3a4a]" />
              </div>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
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
              </form>
              {googleUser && (
                <div className="rounded-2xl bg-teal2-50 dark:bg-teal2-950/40 border border-teal2-200 dark:border-teal2-800/40 px-3.5 py-3 text-xs font-bold text-teal2-800 dark:text-teal2-300 space-y-1">
                  <p className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>تم التحقق من حساب Google الخاص بك</span>
                  </p>
                  <p dir="ltr" className="text-right text-ocean-900 dark:text-white">
                    {googleEmail}
                  </p>
                  <p className="font-medium text-ocean-700/80 dark:text-white/70">
                    أكمل بيانات التسجيل من تبويب «إنشاء حساب جديد» لإنشاء حسابك على المنصة.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('signup');
                      setStep(1);
                    }}
                    className="mt-1 px-3.5 py-2 rounded-xl bg-teal2-600 hover:bg-teal2-500 text-white font-black text-xs transition"
                  >
                    إكمال بيانات التسجيل
                  </button>
                </div>
              )}
              <p className="text-[11px] text-ocean-700/50 dark:text-white/40 font-medium leading-relaxed">
                بالمتابعة بحساب Google أنت توافق على استخدام حساب Google الخاص بك لتسجيل الدخول فقط.
              </p>
            </motion.div>
          )}

          {/* ============ SIGNUP ============ */}
          {tab === 'signup' && !googleUser && signupMethod !== 'email' && (
            <motion.div
              className="space-y-4 flex-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-xs sm:text-sm text-ocean-700/80 dark:text-white/70 font-medium leading-relaxed">
                ابدأ بتسجيل الدخول بحساب Google — سنأخذ اسمك وبريدك منه، ثم نطلب منك
                باقي البيانات فقط (المحافظة، النوع، الكلية، ورقم الموبايل).
              </p>
              <GoogleSignInButton
                label="المتابعة بحساب Google"
                loading={googleLoading}
                onClick={handleGoogleSignIn}
              />
              {googleErr && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-500 font-bold bg-red-50 dark:bg-red-950/30 rounded-xl px-3 py-2 border border-red-200/50"
                >
                  {googleErr}
                </motion.p>
              )}
              <div className="flex items-center gap-3 pt-1">
                <span className="flex-1 h-px bg-sand-200 dark:bg-[#2a3a4a]" />
                <span className="text-[11px] font-bold text-ocean-700/50 dark:text-white/40">
                  أو أنشئ حساباً بالبريد الإلكتروني
                </span>
                <span className="flex-1 h-px bg-sand-200 dark:bg-[#2a3a4a]" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setSignupMethod('email');
                  setStep(1);
                }}
                className="w-full py-3.5 rounded-2xl border-2 border-sand-200 dark:border-[#2a3a4a] bg-sand-50 dark:bg-[#1a2535] text-ocean-900 dark:text-white font-black text-sm hover:border-teal2-300 transition"
              >
                إنشاء حساب بالبريد الإلكتروني
              </button>
            </motion.div>
          )}

          {tab === 'signup' && (googleUser || signupMethod === 'email') && (
            <motion.form
              onSubmit={handleSignupNext}
              className="space-y-4 flex-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {!googleUser && (
                <button
                  type="button"
                  onClick={() => {
                    setSignupMethod(null);
                    setStep(1);
                  }}
                  className="text-xs font-bold text-teal2-600 dark:text-teal2-400 self-start"
                >
                  ← العودة لخيار الدخول بحساب Google
                </button>
              )}
              {/* Google account (email comes from Google, read-only) */}
              {googleUser && (
                <div className="flex items-center gap-2.5 rounded-2xl bg-teal2-50 dark:bg-teal2-950/40 border border-teal2-200 dark:border-teal2-800/40 px-3.5 py-2.5">
                  <CheckCircle2 className="w-5 h-5 text-teal2-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-teal2-800 dark:text-teal2-300">
                      مسجّل بحساب Google
                    </p>
                    <p dir="ltr" className="text-xs font-bold text-ocean-900 dark:text-white truncate text-right">
                      {googleEmail}
                    </p>
                  </div>
                </div>
              )}

              {/* Account type */}
              <div className="grid grid-cols-1 gap-2">
                {[
                  { key: 'user', Icon: UserIcon, label: 'مستخدم عادي', sub: 'طالب / زائر / بورسعيدي' },
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
                {steps.map((label, i) => (
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
                    {i < steps.length - 1 && (
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
                            required
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

              {/* Step 3 — email signup only: email + password */}
              {step === 3 && !googleUser && (
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
                  <span>
                    {signupLoading
                      ? 'جارٍ المعالجة...'
                      : step < steps.length
                      ? `التالي (${step}/${steps.length})`
                      : 'إنشاء الحساب'}
                  </span>
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
