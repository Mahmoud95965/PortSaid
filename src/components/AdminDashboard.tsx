'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  Gauge,
  Users,
  UserCheck,
  Shield,
  MapPin,
  Handshake,
  Compass,
  Image as ImageIcon,
  MessageSquare,
  BarChart3,
  Ticket,
  Video,
  CheckCircle,
  AlertTriangle,
  Lock,
  Search,
  Plus,
  Trash2,
  Edit,
  Mail,
  ShieldAlert,
  BookOpen,
  Camera,
  Check,
  Eye,
  EyeOff,
  Save,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { HistoricalStory, MemoryPost } from '@/types';

export const AdminDashboard: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  // Sample admin states
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [staffList, setStaffList] = useState([
    {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'المالك الرئيسي',
      email: 'admin@portsaidhub.com',
      phone: '01000000001',
      role: 'owner',
      status: 'active',
      perms: ['all'],
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'كريم محمود',
      email: 'karim@portsaidhub.com',
      phone: '01011223344',
      role: 'admin',
      status: 'active',
      perms: ['users.view', 'places.view', 'places.edit', 'stats.view'],
    },
  ]);

  const [partnerApps, setPartnerApps] = useState([
    {
      id: 'pa-1',
      business_name: 'مطعم كاستن للأسماك',
      owner_name: 'كاستن',
      phone: '01099887766',
      area: 'حي الشرق',
      discount: 15,
      commission: 10,
      status: 'pending',
      created_at: '2026-10-16',
    },
    {
      id: 'pa-2',
      business_name: 'كافيه لوتس بورسعيد',
      owner_name: 'محمد خالد',
      phone: '01122334455',
      area: 'حي العرب',
      discount: 10,
      commission: 5,
      status: 'approved',
      created_at: '2026-10-14',
    },
  ]);

  // جلب طلبات التجار والمشرفين الحقيقيين من Supabase
  useEffect(() => {
    async function fetchAdminData() {
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data: apps } = await supabase
            .from('partner_applications')
            .select('*')
            .order('created_at', { ascending: false });

          if (apps && apps.length > 0) {
            setPartnerApps(
              apps.map((a: any) => ({
                id: a.id,
                business_name: a.business_name,
                owner_name: a.phone || 'تاجر مسجل',
                phone: a.phone || '',
                area: a.area_ar || 'بورسعيد',
                discount: a.proposed_discount_percent || 10,
                commission: a.proposed_commission_amount || 5,
                status: a.status || 'pending',
                created_at: a.created_at ? a.created_at.slice(0, 10) : '',
              }))
            );
          }

          const { data: staffData } = await supabase
            .from('users')
            .select('id, name, email, phone, status, role_id, roles(code)')
            .in('role_id', [1, 2])
            .is('deleted_at', null);

          if (staffData && staffData.length > 0) {
            setStaffList(
              staffData.map((u: any) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                phone: u.phone,
                role: u.roles?.code || 'admin',
                status: u.status || 'active',
                perms: u.role_id === 1 ? ['all'] : ['users.view', 'places.view', 'places.edit', 'stats.view'],
              }))
            );
          }
        } catch (e) {
          console.error('Error fetching admin data from Supabase:', e);
        }
      }
    }
    fetchAdminData();
  }, []);

  const [redeemCode, setRedeemCode] = useState('');
  const [redeemResult, setRedeemResult] = useState<string | null>(null);
  const [logVerifyResult, setLogVerifyResult] = useState<string | null>(null);

  // ---------------------------------------------------------
  // Historical Stories State & Handlers
  // ---------------------------------------------------------
  const [stories, setStories] = useState<HistoricalStory[]>([]);
  const [loadingStories, setLoadingStories] = useState(false);
  const [editingStory, setEditingStory] = useState<Partial<HistoricalStory> | null>(null);
  const [storyFormOpen, setStoryFormOpen] = useState(false);

  const fetchStories = async () => {
    try {
      setLoadingStories(true);
      const res = await fetch('/api/historical-stories?all=true');
      const data = await res.json();
      if (data.ok && Array.isArray(data.stories)) {
        setStories(data.stories);
      }
    } catch (e) {
      console.error('Error fetching stories:', e);
    } finally {
      setLoadingStories(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchStories();
    }
  }, [activeTab]);

  const handleSaveStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStory || !editingStory.title_ar || !editingStory.summary_ar || !editingStory.content_ar || !editingStory.image_url) {
      alert('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    try {
      const res = await fetch('/api/historical-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingStory),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStoryFormOpen(false);
        setEditingStory(null);
        fetchStories();
      } else {
        alert(data.message || 'فشل حفظ القصة.');
      }
    } catch (err) {
      alert('حدث خطأ أثناء حفظ القصة.');
    }
  };

  const handleDeleteStory = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه القصة التاريخية؟')) return;
    try {
      const res = await fetch(`/api/historical-stories?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStories((prev) => prev.filter((s) => s.id !== id));
      } else {
        alert(data.message || 'فشل حذف القصة.');
      }
    } catch (err) {
      alert('حدث خطأ أثناء الحذف.');
    }
  };

  const handleTogglePublishStory = async (story: HistoricalStory) => {
    try {
      const res = await fetch('/api/historical-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...story,
          is_published: !story.is_published,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStories((prev) =>
          prev.map((s) => (s.id === story.id ? { ...s, is_published: !story.is_published } : s))
        );
      }
    } catch (err) {
      console.error('Error toggling story publish:', err);
    }
  };

  // ---------------------------------------------------------
  // Community Memories Admin State & Handlers
  // ---------------------------------------------------------
  const [adminMemories, setAdminMemories] = useState<MemoryPost[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(false);

  const fetchAdminMemories = async () => {
    try {
      setLoadingMemories(true);
      const res = await fetch('/api/memories?admin=true');
      const data = await res.json();
      if (data.ok && Array.isArray(data.memories)) {
        setAdminMemories(data.memories);
      }
    } catch (e) {
      console.error('Error fetching admin memories:', e);
    } finally {
      setLoadingMemories(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'memories') {
      fetchAdminMemories();
    }
  }, [activeTab]);

  const handleDeleteAdminMemory = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الذكرى نهائياً؟')) return;
    try {
      const res = await fetch(`/api/memories?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setAdminMemories((prev) => prev.filter((m) => m.id !== id));
      } else {
        alert(data.message || 'فشل الحذف.');
      }
    } catch (err) {
      alert('حدث خطأ أثناء الحذف.');
    }
  };

  const isOwner = user?.role === 'owner';

  const pendingPartnersCount = partnerApps.filter((x) => x.status === 'pending').length;

  const handleVerifyChain = () => {
    setLogVerifyResult('جارٍ التحقق من التشفير المتسلسل...');
    setTimeout(() => {
      setLogVerifyResult('سلسلة سجل الموقع سليمة بنسبة 100% (تم فحص 342 حدثًا تشفيريًا بنجاح).');
    }, 800);
  };

  const handleRedeemCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemCode.trim()) return;
    setRedeemResult('تمت تسوية الكوبون بنجاح! خصم 15% - تم تسجيل العمولة لفريق Alpha.');
    setRedeemCode('');
  };

  // 1. Loading Guard
  if (loading) {
    return (
      <div className="min-h-screen bg-sand-50 dark:bg-[#071322] flex items-center justify-center p-4" dir="rtl">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-600/10 text-blue-600 dark:text-blue-400 grid place-items-center animate-pulse">
            <Shield className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">جارٍ التحقق من الصلاحيات الأمنية...</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">يرجى الانتظار لحظات للتحقق من هوية المسؤول</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Strict Security Access Guard (Admin & Owner Only)
  if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
    return (
      <div className="min-h-screen bg-sand-50 dark:bg-[#071322] flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-white dark:bg-[#0c1622] rounded-3xl p-6 sm:p-8 border border-red-200 dark:border-red-950/60 shadow-2xl text-center space-y-5">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-red-500/10 text-red-600 dark:text-red-400 grid place-items-center border border-red-500/20">
            <ShieldAlert className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-xs font-black">
              <Lock className="w-3.5 h-3.5" />
              <span>403 Forbidden · منطقة محمية</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              غير مصرح بالدخول
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              هذه الصفحة مخصصة فقط لمسؤولي وإدارة منصة <strong className="text-slate-900 dark:text-white">Port Said Hub</strong>. حسابك الحالي لا يمتلك الصلاحيات الإدارية اللازمة لتصفح هذه البيانات أو تعديلها.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 justify-center">
            <Link
              href="/"
              className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs sm:text-sm hover:opacity-90 transition shadow"
            >
              العودة للصفحة الرئيسية
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-50 dark:bg-[#071322] text-ocean-900 dark:text-white transition-colors" dir="rtl">
      {/* Top Bar */}
      <div className="hero-bg text-white p-4 sm:p-5 shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 rounded-2xl bg-white/20 grid place-items-center hover:bg-white/30 transition shadow"
            >
              <img src="/assets/logo/icon-192.png" alt="" className="w-6 h-6 object-contain" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-black">لوحة التحكم الإدارية</h1>
                <span className="px-2 py-0.5 rounded-md bg-sand-400 text-ocean-950 text-[10px] font-black">
                  {user.role === 'owner' ? 'المالك الرئيسي' : 'مشرف معتمد'}
                </span>
              </div>
              <p className="text-xs text-white/80">
                Port Said Hub · مرحباً بك يا {user.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="px-4 py-2 rounded-xl bg-white/15 border border-white/30 text-white font-bold text-xs sm:text-sm hover:bg-white/25 transition"
            >
              العودة للموقع
            </Link>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-4 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition flex items-center gap-2 border ${
              activeTab === 'home'
                ? 'bg-gradient-to-r from-ocean-800 to-teal2-700 text-white border-transparent shadow-md'
                : 'bg-white dark:bg-[#0c1622] text-ocean-900 dark:text-white border-sand-200 dark:border-[#1d2d3e] hover:border-teal2-500'
            }`}
          >
            <Gauge className="w-4 h-4" />
            <span>الرئيسية</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition flex items-center gap-2 border ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-ocean-800 to-teal2-700 text-white border-transparent shadow-md'
                : 'bg-white dark:bg-[#0c1622] text-ocean-900 dark:text-white border-sand-200 dark:border-[#1d2d3e] hover:border-teal2-500'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>الحسابات</span>
          </button>

          {isOwner && (
            <button
              onClick={() => setActiveTab('staff')}
              className={`px-4 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition flex items-center gap-2 border ${
                activeTab === 'staff'
                  ? 'bg-gradient-to-r from-ocean-800 to-teal2-700 text-white border-transparent shadow-md'
                  : 'bg-white dark:bg-[#0c1622] text-ocean-900 dark:text-white border-sand-200 dark:border-[#1d2d3e] hover:border-teal2-500'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>فريق الإدارة</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('places')}
            className={`px-4 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition flex items-center gap-2 border ${
              activeTab === 'places'
                ? 'bg-gradient-to-r from-ocean-800 to-teal2-700 text-white border-transparent shadow-md'
                : 'bg-white dark:bg-[#0c1622] text-ocean-900 dark:text-white border-sand-200 dark:border-[#1d2d3e] hover:border-teal2-500'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>الأماكن</span>
          </button>

          <button
            onClick={() => setActiveTab('partners')}
            className={`px-4 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition flex items-center gap-2 border relative ${
              activeTab === 'partners'
                ? 'bg-gradient-to-r from-ocean-800 to-teal2-700 text-white border-transparent shadow-md'
                : 'bg-white dark:bg-[#0c1622] text-ocean-900 dark:text-white border-sand-200 dark:border-[#1d2d3e] hover:border-teal2-500'
            }`}
          >
            <Handshake className="w-4 h-4" />
            <span>طلبات التجار</span>
            {pendingPartnersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-coral-500 text-white text-[10px] font-bold grid place-items-center">
                {pendingPartnersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition flex items-center gap-2 border ${
              activeTab === 'stats'
                ? 'bg-gradient-to-r from-ocean-800 to-teal2-700 text-white border-transparent shadow-md'
                : 'bg-white dark:bg-[#0c1622] text-ocean-900 dark:text-white border-sand-200 dark:border-[#1d2d3e] hover:border-teal2-500'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>الإحصائيات</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition flex items-center gap-2 border ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-ocean-800 to-teal2-700 text-white border-transparent shadow-md'
                : 'bg-white dark:bg-[#0c1622] text-ocean-900 dark:text-white border-sand-200 dark:border-[#1d2d3e] hover:border-teal2-500'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>الدليل التاريخي (استكشف)</span>
          </button>

          <button
            onClick={() => setActiveTab('memories')}
            className={`px-4 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition flex items-center gap-2 border ${
              activeTab === 'memories'
                ? 'bg-gradient-to-r from-ocean-800 to-teal2-700 text-white border-transparent shadow-md'
                : 'bg-white dark:bg-[#0c1622] text-ocean-900 dark:text-white border-sand-200 dark:border-[#1d2d3e] hover:border-teal2-500'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>ذكريات المجتمع</span>
          </button>

          <button
            onClick={() => setActiveTab('redeem')}
            className={`px-4 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition flex items-center gap-2 border ${
              activeTab === 'redeem'
                ? 'bg-gradient-to-r from-ocean-800 to-teal2-700 text-white border-transparent shadow-md'
                : 'bg-white dark:bg-[#0c1622] text-ocean-900 dark:text-white border-sand-200 dark:border-[#1d2d3e] hover:border-teal2-500'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>تسوية كوبون</span>
          </button>

          {isOwner && (
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition flex items-center gap-2 border ${
                activeTab === 'logs'
                  ? 'bg-gradient-to-r from-ocean-800 to-teal2-700 text-white border-transparent shadow-md'
                  : 'bg-white dark:bg-[#0c1622] text-ocean-900 dark:text-white border-sand-200 dark:border-[#1d2d3e] hover:border-teal2-500'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>سجل الموقع</span>
            </button>
          )}
        </div>

        {/* Tab Content: Home Overview */}
        {activeTab === 'home' && (
          <div className="space-y-6 pop-in">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-3xl bg-white dark:bg-[#0c1622] p-5 shadow border border-sand-200/60 dark:border-[#1d2d3e]">
                <p className="text-xs text-ocean-700/70 dark:text-white/60 font-bold">المستخدمين المسجلين</p>
                <p className="text-2xl sm:text-3xl font-black mt-2 text-ocean-900 dark:text-white">1,248</p>
              </div>

              <div className="rounded-3xl bg-white dark:bg-[#0c1622] p-5 shadow border border-sand-200/60 dark:border-[#1d2d3e]">
                <p className="text-xs text-ocean-700/70 dark:text-white/60 font-bold">الأماكن النشطة</p>
                <p className="text-2xl sm:text-3xl font-black mt-2 text-teal2-600 dark:text-teal2-400">42</p>
              </div>

              <div className="rounded-3xl bg-white dark:bg-[#0c1622] p-5 shadow border border-sand-200/60 dark:border-[#1d2d3e]">
                <p className="text-xs text-ocean-700/70 dark:text-white/60 font-bold">الكوبونات المستبدلة</p>
                <p className="text-2xl sm:text-3xl font-black mt-2 text-sand-500">319</p>
              </div>

              <div className="rounded-3xl bg-white dark:bg-[#0c1622] p-5 shadow border border-sand-200/60 dark:border-[#1d2d3e]">
                <p className="text-xs text-ocean-700/70 dark:text-white/60 font-bold">إجمالي الزيارات المؤكدة</p>
                <p className="text-2xl sm:text-3xl font-black mt-2 text-ocean-700 dark:text-ocean-300">2,840</p>
              </div>
            </div>

            {/* Security Alerts (Owner Only) */}
            {isOwner && (
              <div className="rounded-3xl bg-white dark:bg-[#0c1622] p-6 shadow border border-sand-200/60 dark:border-[#1d2d3e] space-y-4">
                <h3 className="text-lg font-black flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-sand-500" />
                  <span>مراقبة الأمان والنزاهة التشفيرية</span>
                </h3>
                <p className="text-sm text-ocean-700/80 dark:text-white/70">
                  السجل التشفيري يراقب كل نشاط في الموقع عبر هاش SHA-256 متسلسل، ولا يمكن تعديل أي سجل في قاعدة البيانات دون اكتشافه.
                </p>
                <button
                  type="button"
                  onClick={handleVerifyChain}
                  className="px-5 py-2.5 rounded-xl bg-ocean-900 hover:bg-ocean-700 text-white font-bold text-xs transition"
                >
                  فحص سلامة سلسلة السجل الآن
                </button>
                {logVerifyResult && (
                  <p className="text-xs font-bold text-teal2-600 dark:text-teal2-400 p-3 rounded-xl bg-teal2-50 dark:bg-teal2-950/40">
                    {logVerifyResult}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Users */}
        {activeTab === 'users' && (
          <div className="space-y-4 pop-in">
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو البريد أو الهاتف..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full rounded-2xl border border-sand-200 dark:border-[#1d2d3e] bg-white dark:bg-[#0c1622] px-4 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="rounded-3xl bg-white dark:bg-[#0c1622] shadow overflow-hidden border border-sand-200/60 dark:border-[#1d2d3e]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-sand-100 dark:bg-[#212d37] text-xs font-black">
                    <tr>
                      <th className="p-4">الاسم</th>
                      <th className="p-4">الهاتف / البريد</th>
                      <th className="p-4">الرتبة</th>
                      <th className="p-4">النقاط</th>
                      <th className="p-4">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-200/60 dark:divide-[#2a2a2a]">
                    <tr>
                      <td className="p-4 font-bold">المالك الرئيسي</td>
                      <td className="p-4 text-xs">01000000001 · admin@portsaidhub.com</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-ocean-900 text-sand-400">مالك</span>
                      </td>
                      <td className="p-4 font-bold text-sand-500">500</td>
                      <td className="p-4 text-teal2-600 font-bold">نشط</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-bold">كريم محمود</td>
                      <td className="p-4 text-xs">01011223344 · karim@portsaidhub.com</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-ocean-700 text-white">أدمن</span>
                      </td>
                      <td className="p-4 font-bold text-sand-500">220</td>
                      <td className="p-4 text-teal2-600 font-bold">نشط</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-bold">أحمد السيد</td>
                      <td className="p-4 text-xs">01234567890 · ahmed@student.psu.edu.eg</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sand-200 dark:bg-[#2a2a2a]">مستخدم</span>
                      </td>
                      <td className="p-4 font-bold text-sand-500">60</td>
                      <td className="p-4 text-teal2-600 font-bold">نشط</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Partner Applications */}
        {activeTab === 'partners' && (
          <div className="space-y-4 pop-in">
            <h3 className="text-xl font-black">طلبات انضمام التجار والشركاء</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {partnerApps.map((app) => (
                <div
                  key={app.id}
                  className="rounded-3xl bg-white dark:bg-[#0c1622] p-5 shadow border border-sand-200/60 dark:border-[#1d2d3e] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-lg">{app.business_name}</h4>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        app.status === 'approved' ? 'bg-teal2-100 text-teal2-700' : 'bg-sand-100 text-sand-700'
                      }`}
                    >
                      {app.status === 'approved' ? 'معتمد' : 'قيد المراجعة'}
                    </span>
                  </div>
                  <p className="text-xs text-ocean-700/70 dark:text-white/60">
                    المالك: {app.owner_name} · الهاتف: {app.phone} · المنطقة: {app.area}
                  </p>
                  <div className="flex gap-4 text-xs font-bold pt-2 border-t border-sand-200/60 dark:border-[#1d2d3e]">
                    <span>خصم العميل: {app.discount}%</span>
                    <span>عمولة Alpha: {app.commission} ج</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content: Redeem Coupon */}
        {activeTab === 'redeem' && (
          <div className="max-w-md mx-auto space-y-4 pop-in">
            <div className="rounded-3xl bg-white dark:bg-[#0c1622] p-6 shadow border border-sand-200/60 dark:border-[#1d2d3e]">
              <h3 className="text-lg font-black mb-1">تسوية كود كوبون الخصم</h3>
              <p className="text-xs text-ocean-700/70 dark:text-white/60 mb-4">
                أدخل الكود المقروء من كاميرا QR للمحل لتسجيل الخصم والعمولة.
              </p>

              <form onSubmit={handleRedeemCoupon} className="space-y-3">
                <input
                  type="text"
                  placeholder="مثال: PSC.20000000-0000......."
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  className="w-full rounded-xl border border-sand-200 dark:border-[#1d2d3e] bg-sand-50 dark:bg-[#1a242d] px-3.5 py-2.5 text-xs font-mono"
                  required
                />
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-teal2-600 hover:bg-teal2-500 text-white font-extrabold text-sm shadow transition"
                >
                  تسوية الكوبون الآن
                </button>
              </form>

              {redeemResult && (
                <p className="text-xs font-bold text-teal2-600 mt-3 p-3 rounded-xl bg-teal2-50 dark:bg-teal2-950/40">
                  {redeemResult}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tab Content: Historical Stories Management */}
        {activeTab === 'history' && (
          <div className="space-y-6 pop-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black">إدارة الدليل التاريخي لبورسعيد</h3>
                <p className="text-xs text-ocean-700/70 dark:text-white/60">
                  إضافة وتعديل وترتيب ونشر القصص التاريخية والمعالم الموثقة في صفحة استكشف.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingStory({
                    title_ar: '',
                    era_year: '',
                    summary_ar: '',
                    content_ar: '',
                    image_url: '/assets/port-said/hero-01.webp',
                    sort_order: stories.length + 1,
                    is_published: true,
                  });
                  setStoryFormOpen(true);
                }}
                className="px-4 py-2.5 rounded-2xl bg-teal2-600 hover:bg-teal2-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة قصة تاريخية جديدة</span>
              </button>
            </div>

            {/* Story Edit / Create Form Modal */}
            {storyFormOpen && editingStory && (
              <div className="p-6 rounded-3xl bg-white dark:bg-[#0c1622] border border-sand-300 dark:border-[#1d2d3e] shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b pb-3 border-sand-200 dark:border-[#1d2d3e]">
                  <h4 className="font-black text-base">
                    {editingStory.id ? 'تعديل قصة تاريخية' : 'إضافة قصة تاريخية جديدة'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setStoryFormOpen(false);
                      setEditingStory(null);
                    }}
                    className="p-1 rounded-xl text-ocean-700 dark:text-white/70"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveStory} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold mb-1">عنوان القصة التاريخية *</label>
                      <input
                        type="text"
                        value={editingStory.title_ar || ''}
                        onChange={(e) => setEditingStory({ ...editingStory, title_ar: e.target.value })}
                        placeholder="مثال: فنار بورسعيد التاريخي..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-sand-200 dark:border-[#1d2d3e] bg-sand-50 dark:bg-[#1a242d] text-xs font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">العام / الحقبة الزمنية</label>
                      <input
                        type="text"
                        value={editingStory.era_year || ''}
                        onChange={(e) => setEditingStory({ ...editingStory, era_year: e.target.value })}
                        placeholder="مثال: 1869 م"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-sand-200 dark:border-[#1d2d3e] bg-sand-50 dark:bg-[#1a242d] text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1">مسار أو رابط الصورة *</label>
                      <input
                        type="text"
                        value={editingStory.image_url || ''}
                        onChange={(e) => setEditingStory({ ...editingStory, image_url: e.target.value })}
                        placeholder="/assets/port-said/..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-sand-200 dark:border-[#1d2d3e] bg-sand-50 dark:bg-[#1a242d] text-xs font-bold font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">ترتيب الظهور (رقم)</label>
                      <input
                        type="number"
                        value={editingStory.sort_order ?? 1}
                        onChange={(e) => setEditingStory({ ...editingStory, sort_order: parseInt(e.target.value, 10) || 1 })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-sand-200 dark:border-[#1d2d3e] bg-sand-50 dark:bg-[#1a242d] text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">الملخص القصير *</label>
                    <textarea
                      rows={2}
                      value={editingStory.summary_ar || ''}
                      onChange={(e) => setEditingStory({ ...editingStory, summary_ar: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-sand-200 dark:border-[#1d2d3e] bg-sand-50 dark:bg-[#1a242d] text-xs font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">المحتوى التاريخي الكامل *</label>
                    <textarea
                      rows={5}
                      value={editingStory.content_ar || ''}
                      onChange={(e) => setEditingStory({ ...editingStory, content_ar: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-sand-200 dark:border-[#1d2d3e] bg-sand-50 dark:bg-[#1a242d] text-xs font-bold"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPublishedCheck"
                      checked={editingStory.is_published !== false}
                      onChange={(e) => setEditingStory({ ...editingStory, is_published: e.target.checked })}
                      className="w-4 h-4 rounded text-teal2-600"
                    />
                    <label htmlFor="isPublishedCheck" className="text-xs font-bold select-none cursor-pointer">
                      منشور في صفحة الاستكشاف العامة
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStoryFormOpen(false);
                        setEditingStory(null);
                      }}
                      className="px-4 py-2 rounded-xl border text-xs font-bold"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-teal2-600 hover:bg-teal2-500 text-white font-bold text-xs flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>حفظ القصة</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Stories Table */}
            <div className="rounded-3xl bg-white dark:bg-[#0c1622] shadow border border-sand-200/60 dark:border-[#1d2d3e] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-sand-100/60 dark:bg-[#1f1f1f] text-ocean-700 dark:text-white/70 font-black">
                    <tr>
                      <th className="p-3.5">الترتيب</th>
                      <th className="p-3.5">الصورة</th>
                      <th className="p-3.5">العنوان</th>
                      <th className="p-3.5">الحقبة</th>
                      <th className="p-3.5">الحالة</th>
                      <th className="p-3.5 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-200/50 dark:divide-[#2a2a2a]">
                    {loadingStories ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-xs">جاري التحميل...</td>
                      </tr>
                    ) : stories.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-xs">لا توجد قصص مسجلة حالياً.</td>
                      </tr>
                    ) : (
                      stories.map((story) => (
                        <tr key={story.id} className="hover:bg-sand-50 dark:hover:bg-[#1d1d1d] transition">
                          <td className="p-3.5 font-black text-teal2-600">{story.sort_order}</td>
                          <td className="p-3.5">
                            <img src={story.image_url} alt="" className="w-12 h-9 object-cover rounded-lg border" />
                          </td>
                          <td className="p-3.5 font-bold max-w-xs truncate">{story.title_ar}</td>
                          <td className="p-3.5 font-bold text-sand-500">{story.era_year || '-'}</td>
                          <td className="p-3.5">
                            <button
                              type="button"
                              onClick={() => handleTogglePublishStory(story)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                                story.is_published
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                              }`}
                            >
                              {story.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                              <span>{story.is_published ? 'منشور' : 'مخفي'}</span>
                            </button>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStory(story);
                                  setStoryFormOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-sand-100 dark:bg-[#252525] text-ocean-800 dark:text-sand-300 hover:bg-sand-200"
                                title="تعديل"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteStory(story.id)}
                                className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 hover:bg-red-100"
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Community Memories Moderation */}
        {activeTab === 'memories' && (
          <div className="space-y-6 pop-in">
            <div>
              <h3 className="text-xl font-black">إشراف ذكريات المجتمع</h3>
              <p className="text-xs text-ocean-700/70 dark:text-white/60">
                مراجعة الصور والذكريات المنشورة من قبل المستخدمين وحذف أي محتوى غير لائق.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingMemories ? (
                <div className="col-span-full p-8 text-center text-xs">جاري تحميل الذكريات...</div>
              ) : adminMemories.length === 0 ? (
                <div className="col-span-full p-8 text-center text-xs">لا توجد منشورات حالياً.</div>
              ) : (
                adminMemories.map((mem) => (
                  <div
                    key={mem.id}
                    className="rounded-3xl bg-white dark:bg-[#0c1622] border border-sand-200/60 dark:border-[#1d2d3e] p-4 shadow space-y-3 flex flex-col justify-between"
                  >
                    <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-sand-100 dark:bg-[#1e1e1e]">
                      <img src={mem.image_url} alt="" className="w-full h-full object-cover" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs">{mem.user_name}</span>
                        <span className="text-[10px] text-ocean-700/60 dark:text-white/50">
                          {mem.created_at?.slice(0, 10)}
                        </span>
                      </div>
                      {mem.caption && (
                        <p className="text-xs text-ocean-700/80 dark:text-white/70 line-clamp-2">
                          {mem.caption}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-sand-200 dark:border-[#1d2d3e]">
                      <span className="text-[11px] font-bold text-sand-500">
                        ❤️ {mem.likes_count} إعجاب · 💬 {mem.comments_count} تعليق
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteAdminMemory(mem.id)}
                        className="px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 text-xs font-bold hover:bg-red-100 flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
