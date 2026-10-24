'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, RoleType, UserTypeCategory, GenderType } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { logSupabaseActivity } from '@/lib/supabase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  hasSeenWelcome: boolean;
  setHasSeenWelcome: (seen: boolean) => void;
  login: (identifier: string, pass: string) => Promise<{ ok: boolean; message?: string }>;
  registerUser: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    gender: GenderType;
    user_type: UserTypeCategory;
    governorate?: string;
    institution?: string;
  }) => Promise<{ ok: boolean; message?: string }>;
  registerMerchant: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    business_name: string;
    category: string;
    area: string;
    discount: number;
    commission: number;
    notes?: string;
  }) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
  updatePoints: (delta: number, reason?: string) => void;
  claimShareReward: () => Promise<{ ok: boolean; message: string; pointsAwarded?: number }>;
  recordVisit: (params: {
    placeId: string;
    lat: number;
    lon: number;
    distanceM?: number;
  }) => Promise<{ ok: boolean; message: string; pointsAwarded?: number }>;
  updateAvatar: (avatarUrl: string) => void;
  changePassword: (oldPass: string, newPass: string) => Promise<{ ok: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [hasSeenWelcome, setHasSeenWelcomeState] = useState(false);

  // تحميل الثيم وحالة الترحيب والتحقق الخادمي من الجلسة الآمنة
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('ps_theme') as 'light' | 'dark' | null;
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
        document.documentElement.classList.toggle('dark', prefersDark);
      }

      const welcomeSeen = sessionStorage.getItem('ps_welcome_seen') === 'true';
      setHasSeenWelcomeState(welcomeSeen);

      // تحميل فوري مساعد لواجهة المستخدم من الكاش
      const savedUser = sessionStorage.getItem('ps_user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {}
      }

      // التحقق الإلزامي من الجلسة الخادمية الموثقة عبر HttpOnly Cookie
      fetch('/api/auth/me')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.ok && data.user) {
            setUser(data.user);
            sessionStorage.setItem('ps_user', JSON.stringify(data.user));
          } else {
            setUser(null);
            sessionStorage.removeItem('ps_user');
          }
        })
        .catch((err) => {
          console.warn('Session verification notice:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('ps_theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  };

  const setHasSeenWelcome = (seen: boolean) => {
    setHasSeenWelcomeState(seen);
    try {
      sessionStorage.setItem('ps_welcome_seen', String(seen));
    } catch (e) {}
  };

  const saveUserSession = (userData: User) => {
    setUser(userData);
    try {
      sessionStorage.setItem('ps_user', JSON.stringify(userData));
    } catch (e) {}
  };

  /**
   * تسجيل الدخول الآمن عبر مسار الخادم Next.js API (/api/auth/login)
   */
  const login = async (identifier: string, pass: string): Promise<{ ok: boolean; message?: string }> => {
    const trimmedId = identifier.trim();
    if (!trimmedId || !pass) {
      return { ok: false, message: 'برجاء كتابة رقم الهاتف أو البريد الإلكتروني وكلمة المرور.' };
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: trimmedId, password: pass }),
      });
      const data = await res.json();
      if (data.ok && data.user) {
        saveUserSession(data.user);
        return { ok: true };
      }
      return { ok: false, message: data.message || 'بيانات تسجيل الدخول أو كلمة المرور غير صحيحة.' };
    } catch (err: any) {
      console.warn('Server login request error, checking fallback:', err);
      return { ok: false, message: 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.' };
    }
  };

  /**
   * إنشاء وتسجيل حساب مستخدم جديد بأمان عبر مسار الخادم Next.js API (/api/auth/register)
   */
  const registerUser = async (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    gender: GenderType;
    user_type: UserTypeCategory;
    governorate?: string;
    institution?: string;
  }): Promise<{ ok: boolean; message?: string }> => {
    if (!data.name || !data.email || !data.phone || !data.password) {
      return { ok: false, message: 'جميع الحقول الأساسية مطلوبة.' };
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, role: 'user' }),
      });
      const json = await res.json();
      if (json.ok && json.user) {
        saveUserSession(json.user);
        return { ok: true };
      }
      return { ok: false, message: json.message || 'حدث خطأ أثناء التسجيل.' };
    } catch (err: any) {
      console.warn('Server register request error, checking fallback:', err);
      return { ok: false, message: 'تعذر الاتصال بالخادم لإتمام التسجيل.' };
    }
  };

  /**
   * إنشاء وتسجيل حساب تاجر / شريك بأمان عبر مسار الخادم Next.js API (/api/auth/register)
   */
  const registerMerchant = async (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    business_name: string;
    category: string;
    area: string;
    discount: number;
    commission: number;
    notes?: string;
  }): Promise<{ ok: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, role: 'merchant' }),
      });
      const json = await res.json();
      if (json.ok && json.user) {
        saveUserSession(json.user);
        return { ok: true };
      }
      return { ok: false, message: json.message || 'حدث خطأ أثناء تسجيل الشريك.' };
    } catch (err: any) {
      console.warn('Server merchant register error:', err);
      return { ok: false, message: 'تعذر الاتصال بالخادم لإتمام التسجيل.' };
    }
  };

  /**
   * تسجيل الخروج وإبطال الجلسة الخادمية
   */
  const logout = async () => {
    setUser(null);
    try {
      sessionStorage.removeItem('ps_user');
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
  };

  /**
   * استلام مكافأة مشاركة التطبيق بأمان عبر دالة خادمية ذرية في Supabase
   */
  const claimShareReward = async (): Promise<{ ok: boolean; message: string; pointsAwarded?: number }> => {
    if (!user) {
      return { ok: false, message: 'يجب تسجيل الدخول أولاً للحصول على النقاط.' };
    }

    const idempKey = `share_${user.id}`;

    if (isSupabaseConfigured() && supabase && user.id) {
      try {
        const { data, error } = await supabase.rpc('rpc_claim_share_reward', {
          p_user_id: user.id,
          p_idempotency_key: idempKey,
        });

        if (error) {
          console.warn('RPC share reward error, checking fallback:', error);
          return { ok: false, message: error.message || 'حدث خطأ أثناء معالجة الطلب.' };
        }

        if (data && data.ok) {
          if (typeof data.balance === 'number') {
            const updated = { ...user, points: data.balance };
            saveUserSession(updated);
          }
          return {
            ok: true,
            message: data.message || 'مبروك! تمت إضافة +40 نقطة لمشاركة التطبيق.',
            pointsAwarded: data.points_awarded || 0,
          };
        } else {
          return {
            ok: false,
            message: data?.message || 'تم الحصول على مكافأة المشاركة مسبقاً.',
          };
        }
      } catch (e: any) {
        console.warn('Share reward network error:', e);
      }
    }

    // Offline / Fallback mode: Check local cache to prevent repeated rewards
    try {
      const shareKey = `ps_shared_${user.id}`;
      if (typeof window !== 'undefined' && localStorage.getItem(shareKey)) {
        return { ok: false, message: 'تم الحصول على مكافأة المشاركة مسبقاً.' };
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(shareKey, 'true');
      }
      const newBal = user.points + 40;
      const updated = { ...user, points: newBal };
      saveUserSession(updated);
      return { ok: true, message: 'مبروك! تمت إضافة +40 نقطة لمشاركة التطبيق.', pointsAwarded: 40 };
    } catch (e) {
      return { ok: false, message: 'تعذر حفظ المكافأة محلياً.' };
    }
  };

  /**
   * تسجيل زيارة مكان والحصول على نقاطها ذرياً عبر دالة خادمية في Supabase
   */
  const recordVisit = async (params: {
    placeId: string;
    lat: number;
    lon: number;
    distanceM?: number;
  }): Promise<{ ok: boolean; message: string; pointsAwarded?: number }> => {
    if (!user) {
      return { ok: false, message: 'يجب تسجيل الدخول أولاً لتسجيل الحضور.' };
    }

    const today = new Date().toISOString().slice(0, 10);
    const idempKey = `visit_${user.id}_${params.placeId}_${today}`;

    if (isSupabaseConfigured() && supabase && user.id) {
      try {
        const { data, error } = await supabase.rpc('rpc_record_visit', {
          p_user_id: user.id,
          p_place_id: params.placeId,
          p_latitude: params.lat,
          p_longitude: params.lon,
          p_distance_m: params.distanceM || null,
          p_idempotency_key: idempKey,
        });

        if (error) {
          console.warn('RPC record visit error:', error);
          return { ok: false, message: error.message || 'فشل تسجيل الزيارة.' };
        }

        if (data && data.ok) {
          if (typeof data.balance === 'number') {
            const updated = { ...user, points: data.balance };
            saveUserSession(updated);
          }
          return {
            ok: true,
            message: data.message || `مبروك! تم تسجيل الزيارة وحصلت على +${data.points_awarded || 20} نقطة 🎉`,
            pointsAwarded: data.points_awarded || 20,
          };
        } else {
          return {
            ok: false,
            message: data?.message || 'لقد سجلت زيارتك لهذا المكان اليوم بالفعل.',
          };
        }
      } catch (e: any) {
        console.warn('Record visit network error:', e);
      }
    }

    // Offline / Fallback mode: Check daily local cache
    try {
      const visitKey = `ps_visit_${user.id}_${params.placeId}_${today}`;
      if (typeof window !== 'undefined' && localStorage.getItem(visitKey)) {
        return { ok: false, message: 'لقد سجلت زيارتك لهذا المكان اليوم بالفعل.' };
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(visitKey, 'true');
      }
      const pts = 20;
      const newBal = user.points + pts;
      const updated = { ...user, points: newBal };
      saveUserSession(updated);
      return { ok: true, message: `مبروك! تم تسجيل الزيارة وحصلت على +${pts} نقطة 🎉`, pointsAwarded: pts };
    } catch (e) {
      return { ok: false, message: 'تعذر تسجيل الزيارة محلياً.' };
    }
  };

  /**
   * تحديث رصيد النقاط محلياً (محمية ومقيدة خادمياً عبر دوال RPC الذرية)
   */
  const updatePoints = async (delta: number, reason: string = 'مكافأة نقاط من نشاط الموقع') => {
    if (!user) return;
    const newBal = Math.max(0, user.points + delta);
    const updated = { ...user, points: newBal };
    saveUserSession(updated);
  };

  /**
   * تحديث الصورة الشخصية بأمان عبر مسار الخادم Next.js API (/api/user/avatar)
   */
  const updateAvatar = async (avatarUrl: string) => {
    if (!user) return;
    const updated = { ...user, avatar: avatarUrl };
    saveUserSession(updated);

    try {
      await fetch('/api/user/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl }),
      });
    } catch (e) {
      console.warn('Avatar sync notice:', e);
    }
  };

  /**
   * تغيير كلمة المرور بأمان عبر مسار الخادم Next.js API (/api/auth/change-password)
   */
  const changePassword = async (oldPass: string, newPass: string): Promise<{ ok: boolean; message?: string }> => {
    if (!oldPass || !newPass) {
      return { ok: false, message: 'يرجى كتابة كلمة المرور الحالية والجديدة.' };
    }
    if (newPass.length < 8) {
      return { ok: false, message: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.' };
    }
    if (oldPass === newPass) {
      return { ok: false, message: 'اختر كلمة مرور مختلفة عن الحالية.' };
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass }),
      });
      const json = await res.json();
      return { ok: json.ok, message: json.message };
    } catch (err: any) {
      console.warn('Server change-password request error:', err);
      return { ok: false, message: 'حدث خطأ في الاتصال بالخادم لتحديث كلمة المرور.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        theme,
        toggleTheme,
        hasSeenWelcome,
        setHasSeenWelcome,
        login,
        registerUser,
        registerMerchant,
        logout,
        updatePoints,
        claimShareReward,
        recordVisit,
        updateAvatar,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
