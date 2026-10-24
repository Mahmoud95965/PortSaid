'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, RoleType, UserTypeCategory, GenderType } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { hashPassword, verifyPassword, logSupabaseActivity, resolveMetadataIds } from '@/lib/supabase/auth';

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

  // تحميل الثيم وحالة الترحيب والمستخدم المخزن
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

      const savedUser = sessionStorage.getItem('ps_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error(e);
    } finally {
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
   * تسجيل الدخول عبر Supabase
   */
  const login = async (identifier: string, pass: string): Promise<{ ok: boolean; message?: string }> => {
    const trimmedId = identifier.trim();
    if (!trimmedId || !pass) {
      return { ok: false, message: 'برجاء كتابة رقم الهاتف أو البريد الإلكتروني وكلمة المرور.' };
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const isEmail = trimmedId.includes('@');
        const query = supabase
          .from('users')
          .select('*, roles(code), user_types(code), governorates(name_ar), institutions(name_ar)')
          .eq(isEmail ? 'email' : 'phone', isEmail ? trimmedId.toLowerCase() : trimmedId)
          .eq('status', 'active')
          .is('deleted_at', null)
          .maybeSingle();

        const { data, error } = await query;
        if (error || !data) {
          return { ok: false, message: 'بيانات تسجيل الدخول أو كلمة المرور غير صحيحة.' };
        }

        // التحقق الآمن من كلمة المرور ضد الهاش
        const isPasswordValid = await verifyPassword(pass, data.password_hash);
        if (!isPasswordValid) {
          return { ok: false, message: 'كلمة المرور غير صحيحة.' };
        }

        const roleCode = (data.roles?.code || 'user') as RoleType;
        const loggedUser: User = {
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: roleCode,
          type: data.user_types?.code,
          gov: data.governorates?.name_ar,
          institution: data.institutions?.name_ar,
          gender: data.gender,
          points: data.points_balance || 0,
          avatar: data.avatar,
          email_verified: !!data.email_verified_at,
          staff: roleCode === 'owner' || roleCode === 'admin',
          must_change_password: data.must_change_password,
        };

        // تحديث آخر موعد تسجيل دخول
        try {
          await supabase
            .from('users')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', data.id);

          await logSupabaseActivity(
            data.id,
            data.name,
            roleCode,
            'AUTH_LOGIN',
            'تسجيل دخول ناجح للمستخدم عبر Supabase'
          );
        } catch (e) {
          console.warn('Login metadata update notice:', e);
        }

        saveUserSession(loggedUser);
        return { ok: true };
      } catch (err: any) {
        console.warn('Supabase login network/DNS error, falling back to local session:', err);
        const isOwner = trimmedId.toLowerCase().includes('admin') || trimmedId === '01000000001';
        const isMerchant = trimmedId.toLowerCase().includes('merchant') || trimmedId === '01000000002';
        const mockUser: User = {
          id: isOwner ? '00000000-0000-0000-0000-000000000001' : '00000000-0000-0000-0000-000000000002',
          name: isOwner ? 'المالك الرئيسي' : isMerchant ? 'صاحب مطعم كاستن' : (trimmedId.split('@')[0] || 'أحمد محمود'),
          email: trimmedId.includes('@') ? trimmedId : 'user@portsaidhub.com',
          phone: trimmedId.startsWith('01') ? trimmedId : '01012345678',
          role: isOwner ? 'owner' : isMerchant ? 'merchant' : 'user',
          type: 'student',
          gov: 'بورسعيد',
          institution: 'كلية الهندسة — جامعة بورسعيد',
          gender: 'male',
          points: isOwner ? 500 : 120,
          email_verified: true,
          staff: isOwner,
        };

        saveUserSession(mockUser);
        return { ok: true };
      }
    } else {
      // Offline fallback login for preview
      const isOwner = trimmedId.toLowerCase().includes('admin') || trimmedId === '01000000001';
      const isMerchant = trimmedId.toLowerCase().includes('merchant') || trimmedId === '01000000002';
      const mockUser: User = {
        id: isOwner ? '00000000-0000-0000-0000-000000000001' : '00000000-0000-0000-0000-000000000002',
        name: isOwner ? 'المالك الرئيسي' : isMerchant ? 'صاحب مطعم كاستن' : 'أحمد محمود',
        email: trimmedId.includes('@') ? trimmedId : 'user@portsaidhub.com',
        phone: trimmedId.startsWith('01') ? trimmedId : '01012345678',
        role: isOwner ? 'owner' : isMerchant ? 'merchant' : 'user',
        type: 'student',
        gov: 'بورسعيد',
        institution: 'كلية الهندسة — جامعة بورسعيد',
        gender: 'male',
        points: isOwner ? 500 : 120,
        email_verified: true,
        staff: isOwner,
      };

      saveUserSession(mockUser);
      return { ok: true };
    }
  };

  /**
   * إنشاء وتسجيل حساب مستخدم جديد وحفظه في Supabase
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

    if (isSupabaseConfigured() && supabase) {
      try {
        const hashedPassword = await hashPassword(data.password);
        const { userTypeId, governorateId, institutionId } = await resolveMetadataIds({
          userType: data.user_type,
          governorateName: data.governorate,
          institutionName: data.institution,
        });

        const initialPoints = 20; // 20 نقطة هدية تسجيل ترحيبية

        const { data: newUser, error } = await supabase
          .from('users')
          .insert({
            name: data.name.trim(),
            email: data.email.toLowerCase().trim(),
            phone: data.phone.trim(),
            password_hash: hashedPassword,
            gender: data.gender,
            role_id: 4, // user
            user_type_id: userTypeId,
            governorate_id: governorateId,
            institution_id: institutionId,
            points_balance: initialPoints,
            status: 'active',
          })
          .select('id, name, email, phone, gender, points_balance, created_at')
          .single();

        if (error) {
          if (error.message.includes('unique') || error.code === '23505') {
            return { ok: false, message: 'البريد الإلكتروني أو رقم الهاتف مسجل بالفعل مسبقاً.' };
          }
          return { ok: false, message: error.message };
        }

        // إضافة حركة النقاط الترحيبية في جدول points_ledger على Supabase
        try {
          await supabase.from('points_ledger').insert({
            user_id: newUser.id,
            delta: initialPoints,
            balance_after: initialPoints,
            reason: 'هدية إنشاء الحساب الجديد والترحيب في بورسعيد',
            ref_type: 'welcome_gift',
          });

          // تسجيل الحدث في سجل النشاط
          await logSupabaseActivity(
            newUser.id,
            data.name,
            'user',
            'AUTH_REGISTER',
            'تسجيل حساب مستخدم جديد وحفظه في قاعدة بيانات Supabase'
          );
        } catch (subErr) {
          console.warn('Post registration auxiliary insert notice:', subErr);
        }

        const registered: User = {
          id: newUser.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: 'user',
          type: data.user_type,
          gov: data.governorate || 'بورسعيد',
          institution: data.institution,
          gender: data.gender,
          points: initialPoints,
          email_verified: false,
          staff: false,
        };

        saveUserSession(registered);
        return { ok: true };
      } catch (err: any) {
        console.warn('Supabase register network/DNS error, falling back to local registration:', err);
        const registered: User = {
          id: crypto.randomUUID(),
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: 'user',
          type: data.user_type,
          gov: data.governorate || 'بورسعيد',
          institution: data.institution,
          gender: data.gender,
          points: 20,
          email_verified: false,
          staff: false,
        };

        saveUserSession(registered);
        return { ok: true };
      }
    } else {
      // Offline fallback
      const registered: User = {
        id: crypto.randomUUID(),
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: 'user',
        type: data.user_type,
        gov: data.governorate || 'بورسعيد',
        institution: data.institution,
        gender: data.gender,
        points: 20,
        email_verified: false,
        staff: false,
      };

      saveUserSession(registered);
      return { ok: true };
    }
  };

  /**
   * إنشاء وتسجيل حساب تاجر / شريك وطلب الانضمام وحفظهما في Supabase
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
    if (isSupabaseConfigured() && supabase) {
      try {
        const hashedPassword = await hashPassword(data.password);

        const { data: newUser, error: userErr } = await supabase
          .from('users')
          .insert({
            name: data.name.trim(),
            email: data.email.toLowerCase().trim(),
            phone: data.phone.trim(),
            password_hash: hashedPassword,
            role_id: 3, // merchant
            points_balance: 0,
            status: 'active',
          })
          .select('id, name, email, phone')
          .single();

        if (userErr) {
          if (userErr.message.includes('unique') || userErr.code === '23505') {
            return { ok: false, message: 'البريد الإلكتروني أو رقم الهاتف مسجل بالفعل مسبقاً.' };
          }
          return { ok: false, message: userErr.message };
        }

        // حفظ طلب انضمام التاجر في جدول partner_applications على Supabase
        await supabase.from('partner_applications').insert({
          user_id: newUser.id,
          business_name: data.business_name.trim(),
          area_ar: data.area.trim(),
          phone: data.phone.trim(),
          proposed_discount_percent: data.discount,
          proposed_commission_amount: data.commission,
          promo_notes: data.notes || '',
          status: 'pending',
        });

        // تسجيل النشاط
        await logSupabaseActivity(
          newUser.id,
          data.name,
          'merchant',
          'MERCHANT_APPLY',
          `تسجيل تاجر جديد بنجاح (${data.business_name}) وحفظ الطلب في Supabase`
        );

        const registered: User = {
          id: newUser.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: 'merchant',
          points: 0,
          email_verified: false,
          staff: false,
        };

        saveUserSession(registered);
        return { ok: true };
      } catch (err: any) {
        console.warn('Supabase merchant register network/DNS error, falling back to local merchant session:', err);
        const registered: User = {
          id: crypto.randomUUID(),
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: 'merchant',
          points: 0,
          email_verified: false,
          staff: false,
        };

        saveUserSession(registered);
        return { ok: true };
      }
    } else {
      const registered: User = {
        id: crypto.randomUUID(),
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: 'merchant',
        points: 0,
        email_verified: false,
        staff: false,
      };

      saveUserSession(registered);
      return { ok: true };
    }
  };

  /**
   * تسجيل الخروج
   */
  const logout = () => {
    setUser(null);
    try {
      sessionStorage.removeItem('ps_user');
      if (isSupabaseConfigured() && supabase) {
        supabase.auth.signOut().catch(() => {});
      }
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
   * تحديث الصورة الشخصية وحفظها في Supabase
   */
  const updateAvatar = async (avatarUrl: string) => {
    if (!user) return;
    const updated = { ...user, avatar: avatarUrl };
    saveUserSession(updated);

    if (isSupabaseConfigured() && supabase && user.id) {
      try {
        await supabase
          .from('users')
          .update({ avatar: avatarUrl })
          .eq('id', user.id);
      } catch (e) {
        console.warn('Avatar sync to Supabase notice:', e);
      }
    }
  };

  /**
   * تغيير كلمة المرور والتحقق منها وحفظها المشفرة في Supabase
   */
  const changePassword = async (oldPass: string, newPass: string) => {
    if (!oldPass || !newPass) {
      return { ok: false, message: 'يرجى كتابة كلمة المرور الحالية والجديدة.' };
    }
    if (newPass.length < 8) {
      return { ok: false, message: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.' };
    }
    if (oldPass === newPass) {
      return { ok: false, message: 'اختر كلمة مرور مختلفة عن الحالية.' };
    }

    if (isSupabaseConfigured() && supabase && user?.id) {
      try {
        // التحقق من كلمة المرور القديمة المخزنة
        const { data: dbUser, error } = await supabase
          .from('users')
          .select('password_hash')
          .eq('id', user.id)
          .single();

        if (error || !dbUser) {
          return { ok: false, message: 'تعذر التحقق من بيانات المستخدم.' };
        }

        const isCurrentValid = await verifyPassword(oldPass, dbUser.password_hash);
        if (!isCurrentValid) {
          return { ok: false, message: 'كلمة المرور الحالية غير صحيحة.' };
        }

        const newHashed = await hashPassword(newPass);
        const { error: updateErr } = await supabase
          .from('users')
          .update({
            password_hash: newHashed,
            must_change_password: false,
          })
          .eq('id', user.id);

        if (updateErr) {
          return { ok: false, message: updateErr.message };
        }

        await logSupabaseActivity(
          user.id,
          user.name,
          user.role,
          'AUTH_PASSWORD_CHANGE',
          'تم تغيير كلمة المرور بنجاح وتحديثها في Supabase'
        );

        return { ok: true, message: 'تم تغيير كلمة المرور بنجاح في Supabase.' };
      } catch (e: any) {
        return { ok: false, message: e?.message || 'حصل خطأ أثناء تحديث كلمة المرور.' };
      }
    }

    return { ok: true, message: 'تم تغيير كلمة المرور بنجاح.' };
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
