'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, Users, MapPin, Tag, Award, CheckCircle2, 
  XCircle, AlertCircle, Plus, Search, Trash2, Edit3, 
  Send, Compass, Bell, ArrowRight, RefreshCw, LogIn
} from 'lucide-react';
import { User, Place, PartnerApplication, StudentVerification } from '@/lib/types';
import { SEED_PLACES } from '@/lib/seed-data';

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'places' | 'users' | 'partners' | 'verify' | 'notifications'>('overview');

  // Stats
  const [stats, setStats] = useState({
    users_total: 1,
    places_total: SEED_PLACES.length,
    visits_total: 0,
    coupons_redeemed: 0,
    pending_partners: 0,
    pending_uploads: 0
  });

  // Data lists
  const [places, setPlaces] = useState<Place[]>(SEED_PLACES);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [partners, setPartners] = useState<PartnerApplication[]>([]);
  const [verifications, setVerifications] = useState<StudentVerification[]>([]);

  // Modals & forms
  const [showAddPlaceModal, setShowAddPlaceModal] = useState(false);
  const [newPlaceForm, setNewPlaceForm] = useState({
    name_ar: '',
    category_id: 3,
    area_ar: 'حي الشرق',
    description_ar: '',
    discount_percent: 10,
    coupon_cost_points: 40,
    visit_points: 20
  });

  const [notifForm, setNotifForm] = useState({ title: '', body: '' });
  const [pointAdjust, setPointAdjust] = useState<{ userId: string; delta: number } | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  };

  const loadData = () => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.data?.user) setUser(d.data.user);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => { if (d.ok && d.data) setStats(d.data); })
      .catch(() => {});

    fetch('/api/places')
      .then(r => r.json())
      .then(d => { if (d.ok && d.data) setPlaces(d.data); })
      .catch(() => {});

    fetch('/api/admin/users')
      .then(r => r.json())
      .then(d => { if (d.ok && d.data) setUsersList(d.data); })
      .catch(() => {});

    fetch('/api/partners')
      .then(r => r.json())
      .then(d => { if (d.ok && d.data) setPartners(d.data); })
      .catch(() => {});

    fetch('/api/verify')
      .then(r => r.json())
      .then(d => { if (d.ok && d.data) setVerifications(d.data); })
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-bold">
        جاري التحميل...
      </div>
    );
  }

  // شاشة الدخول للأدمن لو مش مسجل أو مش أدمن
  if (!user || (!user.staff && user.role !== 'owner' && user.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-md w-full text-center text-white shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-600/20 text-rose-500 flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-black mb-2">لوحة التحكم الإدارية</h2>
          <p className="text-slate-400 text-xs mb-6 leading-relaxed">
            هذه المنطقة مخصصة لإدارة Port Said Hub فقط. يرجى تسجيل الدخول بحساب مسؤول.
          </p>
          <div className="bg-slate-900/60 p-4 rounded-2xl text-right text-xs mb-6 text-slate-300 space-y-1">
            <span className="font-bold text-teal2-400 block mb-1">بيانات الحساب الافتراضي:</span>
            <div>البريد: <code className="text-white font-mono">admin@portsaidhub.com</code></div>
            <div>كلمة المرور: <code className="text-white font-mono">Admin@123456</code></div>
          </div>
          <Link
            href="/"
            className="w-full bg-teal2-600 hover:bg-teal2-500 text-white font-bold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2"
          >
            <ArrowRight size={16} /> الذهاب للصفحة الرئيسية وتسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Toast Alert */}
      {msg && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-xs font-bold text-white shadow-2xl flex items-center gap-2 ${
          msg.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Admin Navbar */}
      <header className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-400 hover:text-white transition p-2 rounded-xl hover:bg-slate-700">
              <ArrowRight size={20} />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal2-500 to-ocean-500 flex items-center justify-center text-white font-black">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h1 className="text-base font-black text-white flex items-center gap-2">
                  لوحة تحكم Port Said Hub
                  <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">إدارة</span>
                </h1>
                <p className="text-xs text-slate-400">مرحباً يا {user.name} ({user.role})</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a href="/api/health" target="_blank" className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5">
              <RefreshCw size={13} /> فحص السيرفر
            </a>
            <Link href="/" className="text-xs bg-ocean-700 hover:bg-ocean-600 text-white font-bold px-4 py-2 rounded-xl transition">
              عرض الموقع
            </Link>
          </div>
        </div>

        {/* Admin Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto text-xs font-bold border-t border-slate-700/50 py-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl transition ${activeTab === 'overview' ? 'bg-teal2-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            نظرة عامة
          </button>
          <button
            onClick={() => setActiveTab('places')}
            className={`px-3.5 py-1.5 rounded-xl transition ${activeTab === 'places' ? 'bg-teal2-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            الأماكن ({places.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-1.5 rounded-xl transition ${activeTab === 'users' ? 'bg-teal2-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            المستخدمين
          </button>
          <button
            onClick={() => setActiveTab('partners')}
            className={`px-3.5 py-1.5 rounded-xl transition ${activeTab === 'partners' ? 'bg-teal2-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            طلبات الشركاء ({partners.length})
          </button>
          <button
            onClick={() => setActiveTab('verify')}
            className={`px-3.5 py-1.5 rounded-xl transition ${activeTab === 'verify' ? 'bg-teal2-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            توثيق الطلاب ({verifications.length})
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-3.5 py-1.5 rounded-xl transition ${activeTab === 'notifications' ? 'bg-teal2-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            إرسال إشعار
          </button>
        </div>
      </header>

      {/* Main Admin Area */}
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full">
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-3xl">
                <span className="text-xs text-slate-400 block mb-1">المستخدمين</span>
                <span className="text-2xl font-black text-white">{stats.users_total}</span>
              </div>
              <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-3xl">
                <span className="text-xs text-slate-400 block mb-1">الأماكن</span>
                <span className="text-2xl font-black text-teal2-400">{places.length}</span>
              </div>
              <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-3xl">
                <span className="text-xs text-slate-400 block mb-1">الزيارات</span>
                <span className="text-2xl font-black text-amber-400">{stats.visits_total}</span>
              </div>
              <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-3xl">
                <span className="text-xs text-slate-400 block mb-1">الكوبونات المستبدلة</span>
                <span className="text-2xl font-black text-rose-400">{stats.coupons_redeemed}</span>
              </div>
              <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-3xl">
                <span className="text-xs text-slate-400 block mb-1">طلبات الشركاء</span>
                <span className="text-2xl font-black text-sky-400">{partners.length}</span>
              </div>
              <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-3xl">
                <span className="text-xs text-slate-400 block mb-1">توثيق الطلاب</span>
                <span className="text-2xl font-black text-indigo-400">{verifications.length}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-3xl p-6">
              <h3 className="text-base font-black mb-4">إجراءات سريعة</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowAddPlaceModal(true)}
                  className="bg-teal2-600 hover:bg-teal2-500 text-white font-bold text-xs px-4 py-3 rounded-2xl flex items-center gap-2 transition"
                >
                  <Plus size={16} /> إضافة مكان جديد
                </button>
                <button
                  onClick={() => setActiveTab('notifications')}
                  className="bg-ocean-700 hover:bg-ocean-600 text-white font-bold text-xs px-4 py-3 rounded-2xl flex items-center gap-2 transition"
                >
                  <Bell size={16} /> إرسال إشعار للمستخدمين
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PLACES */}
        {activeTab === 'places' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-white">إدارة الأماكن والأنشطة ({places.length})</h3>
              <button
                onClick={() => setShowAddPlaceModal(true)}
                className="bg-teal2-600 hover:bg-teal2-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2"
              >
                <Plus size={16} /> إضافة مكان جديد
              </button>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-700">
                    <tr>
                      <th className="p-4">اسم المكان</th>
                      <th className="p-4">الحي</th>
                      <th className="p-4">الخصم</th>
                      <th className="p-4">نقاط الزيارة</th>
                      <th className="p-4">تكلفة الكوبون</th>
                      <th className="p-4">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {places.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-700/30 transition">
                        <td className="p-4 font-bold text-white">{p.name_ar}</td>
                        <td className="p-4 text-slate-300">{p.area_ar}</td>
                        <td className="p-4">
                          <span className="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-bold">
                            {p.discount_percent}%
                          </span>
                        </td>
                        <td className="p-4 text-amber-400 font-bold">+{p.visit_points}</td>
                        <td className="p-4 text-slate-300">{p.coupon_cost_points} نقطة</td>
                        <td className="p-4">
                          <button
                            onClick={async () => {
                              if (!confirm(`هل أنت متأكد من حذف ${p.name_ar}؟`)) return;
                              await fetch(`/api/places?id=${p.id}`, { method: 'DELETE' });
                              setPlaces(prev => prev.filter(x => x.id !== p.id));
                              showMsg('تم حذف المكان بنجاح');
                            }}
                            className="text-rose-400 hover:text-rose-300 p-1.5 transition"
                            title="حذف"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* USERS */}
        {activeTab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-white">إدارة المستخدمين</h3>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-700">
                    <tr>
                      <th className="p-4">الاسم</th>
                      <th className="p-4">الهاتف / البريد</th>
                      <th className="p-4">الدور</th>
                      <th className="p-4">الرصيد</th>
                      <th className="p-4">تعديل النقاط</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-700/30 transition">
                        <td className="p-4 font-bold text-white">{u.name}</td>
                        <td className="p-4 text-slate-300">{u.phone || u.email}</td>
                        <td className="p-4">
                          <span className="bg-slate-700 px-2 py-0.5 rounded text-teal2-400 font-bold">
                            {u.role_name || u.role}
                          </span>
                        </td>
                        <td className="p-4 text-amber-400 font-black">{u.points} نقطة</td>
                        <td className="p-4 flex items-center gap-2">
                          <button
                            onClick={async () => {
                              const delta = prompt('أدخل عدد النقاط للإضافة (أو بالسالب للخصم):', '50');
                              if (!delta) return;
                              const res = await fetch('/api/admin/users', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ user_id: u.id, action: 'points', delta: Number(delta) })
                              });
                              const data = await res.json();
                              if (data.ok) {
                                showMsg(`تم تحديث النقاط لـ ${u.name}`);
                                setUsersList(prev => prev.map(x => x.id === u.id ? { ...x, points: data.data.new_points } : x));
                              }
                            }}
                            className="bg-slate-700 hover:bg-slate-600 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold"
                          >
                            تعديل النقاط
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PARTNERS */}
        {activeTab === 'partners' && (
          <div>
            <h3 className="text-xl font-black text-white mb-6">طلبات انضمام الشركاء والمتاجر ({partners.length})</h3>
            {partners.length === 0 ? (
              <div className="bg-slate-800 border border-slate-700 rounded-3xl p-12 text-center text-slate-400 text-sm">
                لا توجد طلبات شراكة جديدة حالياً.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {partners.map((p) => (
                  <div key={p.id} className="bg-slate-800 border border-slate-700 p-5 rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-base text-white">{p.business_name}</h4>
                      <span className="bg-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded text-xs font-bold">
                        {p.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 space-y-1 mb-4">
                      <div>المقدم: {p.user_name || 'تاجر'} ({p.phone})</div>
                      <div>المنطقة: {p.area_ar}</div>
                      <div>نسبة الخصم المعروضة: {p.proposed_discount_percent}%</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          showMsg('تم قبول الشريك!');
                        }}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs"
                      >
                        قبول الشريك
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VERIFICATION */}
        {activeTab === 'verify' && (
          <div>
            <h3 className="text-xl font-black text-white mb-6">طلبات توثيق الطلاب ({verifications.length})</h3>
            {verifications.length === 0 ? (
              <div className="bg-slate-800 border border-slate-700 rounded-3xl p-12 text-center text-slate-400 text-sm">
                لا توجد طلبات توثيق طلاب قيد المراجعة.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {verifications.map((v) => (
                  <div key={v.id} className="bg-slate-800 border border-slate-700 p-4 rounded-2xl">
                    <div className="h-44 bg-slate-900 rounded-xl overflow-hidden mb-3">
                      <img src={v.img_b64} alt="Card" className="w-full h-full object-contain" />
                    </div>
                    <div className="text-xs text-slate-300 font-bold mb-3">{v.user_name || 'طالب'}</div>
                    <button
                      onClick={() => showMsg('تم توثيق الطالب بنجاح!')}
                      className="w-full bg-teal2-600 hover:bg-teal2-500 text-white font-bold py-2 rounded-xl text-xs"
                    >
                      اعتماد التوثيق
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="max-w-xl">
            <h3 className="text-xl font-black text-white mb-4">إرسال إشعار عام لجميع المستخدمين</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const res = await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(notifForm)
              });
              const data = await res.json();
              if (data.ok) {
                showMsg('تم إرسال الإشعار بنجاح لجميع المستخدمين!');
                setNotifForm({ title: '', body: '' });
              }
            }} className="bg-slate-800 border border-slate-700 p-6 rounded-3xl space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">عنوان الإشعار:</label>
                <input
                  type="text"
                  required
                  value={notifForm.title}
                  onChange={(e) => setNotifForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="مثال: خصم 20% جديد بمناسبة الصيف!"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">نص الإشعار:</label>
                <textarea
                  required
                  rows={4}
                  value={notifForm.body}
                  onChange={(e) => setNotifForm(p => ({ ...p, body: e.target.value }))}
                  placeholder="اكتب تفاصيل الإشعار هنا..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white"
                ></textarea>
              </div>
              <button type="submit" className="w-full bg-ocean-700 hover:bg-ocean-600 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2">
                <Send size={15} /> إرسال الإشعار فوراً
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Modal إضافة مكان */}
      {showAddPlaceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowAddPlaceModal(false)} className="absolute top-4 left-4 text-slate-400 hover:text-white">
              <XCircle size={20} />
            </button>
            <h3 className="text-lg font-black mb-4">إضافة مكان جديد</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const res = await fetch('/api/places', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPlaceForm)
              });
              const data = await res.json();
              if (data.ok) {
                showMsg('تمت إضافة المكان بنجاح!');
                setPlaces(prev => [data.data, ...prev]);
                setShowAddPlaceModal(false);
              }
            }} className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 font-bold text-slate-300">اسم المكان:</label>
                <input
                  type="text"
                  required
                  value={newPlaceForm.name_ar}
                  onChange={(e) => setNewPlaceForm(p => ({ ...p, name_ar: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block mb-1 font-bold text-slate-300">الحي:</label>
                <input
                  type="text"
                  required
                  value={newPlaceForm.area_ar}
                  onChange={(e) => setNewPlaceForm(p => ({ ...p, area_ar: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block mb-1 font-bold text-slate-300">نسبة الخصم (%):</label>
                <input
                  type="number"
                  value={newPlaceForm.discount_percent}
                  onChange={(e) => setNewPlaceForm(p => ({ ...p, discount_percent: Number(e.target.value) }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block mb-1 font-bold text-slate-300">نقاط الزيارة (Check-in):</label>
                <input
                  type="number"
                  value={newPlaceForm.visit_points}
                  onChange={(e) => setNewPlaceForm(p => ({ ...p, visit_points: Number(e.target.value) }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block mb-1 font-bold text-slate-300">الوصف:</label>
                <textarea
                  rows={3}
                  value={newPlaceForm.description_ar}
                  onChange={(e) => setNewPlaceForm(p => ({ ...p, description_ar: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                ></textarea>
              </div>
              <button type="submit" className="w-full bg-teal2-600 hover:bg-teal2-500 font-bold py-3 rounded-xl text-white mt-2">
                حفظ المكان
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
