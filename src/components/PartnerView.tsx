'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { ArrowRight, Store, Briefcase, CheckCircle, Clock, AlertCircle, Save, Sparkles, Loader2 } from 'lucide-react';
import { PartnerApplication } from '@/types';
import { AREAS } from '@/lib/constants';

interface PartnerViewProps {
  onBack: () => void;
}

export const PartnerView: React.FC<PartnerViewProps> = ({ onBack }) => {
  const { user, registerMerchant } = useAuth();

  const isMerchant = user?.role === 'merchant';

  // Merchant Application / Offer State
  const [appData, setAppData] = useState<PartnerApplication>({
    id: 'pa-1',
    business_name: 'مطعم كاستن للأسماك',
    area: 'حي الشرق',
    phone: user?.phone || '01012345678',
    discount: 15,
    commission: 10,
    notes: 'كوبون صالح لجميع الطلبات داخل الصالة',
    status: 'approved',
    place_linked: true,
  });

  const [bizName, setBizName] = useState(appData.business_name);
  const [area, setArea] = useState(appData.area);
  const [discount, setDiscount] = useState(appData.discount);
  const [commission, setCommission] = useState(appData.commission);
  const [notes, setNotes] = useState(appData.notes || '');

  const [saveMsg, setSaveMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // جلب طلب التاجر الحقيقي من Supabase
  useEffect(() => {
    async function loadMerchantApp() {
      if (isSupabaseConfigured() && supabase && user?.id) {
        try {
          const { data } = await supabase
            .from('partner_applications')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (data) {
            setAppData({
              id: data.id,
              business_name: data.business_name,
              area: data.area_ar,
              phone: data.phone || user.phone || '',
              discount: data.proposed_discount_percent,
              commission: data.proposed_commission_amount,
              notes: data.promo_notes || '',
              status: data.status,
              place_linked: !!data.place_id,
            });
            setBizName(data.business_name);
            setArea(data.area_ar);
            setDiscount(data.proposed_discount_percent);
            setCommission(data.proposed_commission_amount);
            setNotes(data.promo_notes || '');
          }
        } catch (e) {
          console.error('Error fetching merchant application:', e);
        }
      }
    }
    loadMerchantApp();
  }, [user?.id]);

  // Non-merchant registration state
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerPass, setOwnerPass] = useState('');
  const [newBizName, setNewBizName] = useState('');
  const [newCategory, setNewCategory] = useState('food');
  const [newArea, setNewArea] = useState(AREAS[0]);
  const [newDiscount, setNewDiscount] = useState(10);
  const [newCommission, setNewCommission] = useState(5);
  const [newNotes, setNewNotes] = useState('');
  const [regErr, setRegErr] = useState('');

  const handleUpdateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveMsg('');

    if (isSupabaseConfigured() && supabase && user?.id) {
      try {
        await supabase
          .from('partner_applications')
          .update({
            business_name: bizName,
            area_ar: area,
            proposed_discount_percent: discount,
            proposed_commission_amount: commission,
            promo_notes: notes,
            status: 'pending',
          })
          .eq('user_id', user.id);

        setAppData((prev) => ({
          ...prev,
          business_name: bizName,
          area,
          discount,
          commission,
          notes,
          status: 'pending',
        }));
        setLoading(false);
        setSaveMsg('تم حفظ التعديلات وإرسالها للمراجعة في Supabase بنجاح ✓');
        return;
      } catch (err: any) {
        console.error(err);
      }
    }

    setTimeout(() => {
      setAppData({
        ...appData,
        business_name: bizName,
        area,
        discount,
        commission,
        notes,
        status: 'pending',
      });
      setLoading(false);
      setSaveMsg('تم حفظ التعديلات وإرسالها للمراجعة.');
    }, 400);
  };

  const handleRegisterMerchantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName || !ownerName || !ownerEmail || !ownerPass) {
      setRegErr('برجاء ملء جميع الحقول المطلوبة.');
      return;
    }

    setLoading(true);
    setRegErr('');

    const res = await registerMerchant({
      name: ownerName,
      email: ownerEmail,
      phone: ownerPhone,
      password: ownerPass,
      business_name: newBizName,
      category: newCategory,
      area: newArea,
      discount: newDiscount,
      commission: newCommission,
      notes: newNotes,
    });

    setLoading(false);
    if (!res.ok) {
      setRegErr(res.message || 'حدث خطأ أثناء التسجيل.');
    }
  };

  return (
    <motion.div
      className="space-y-6 max-w-3xl mx-auto"
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

      {isMerchant ? (
        /* Merchant Dashboard */
        <div className="space-y-6">
          <motion.div
            className="rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden"
            style={{ background: 'linear-gradient(120deg, #3a2a6d, #5b2a86 45%, #b4542b)' }}
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/20 border border-white/30 backdrop-blur">
              <Briefcase className="w-3.5 h-3.5 text-sand-400" />
              <span>حساب تاجر معتمد</span>
            </span>

            <h2 className="mt-3 text-2xl sm:text-3xl font-black">لوحة التاجر والشركاء</h2>
            <p className="mt-1 text-xs sm:text-sm text-white/85 font-medium">
              تابع من هنا حالة مكانك وعروضك والخصومات الموجهة لزوار وطلاب بورسعيد.
            </p>
          </motion.div>

          <div className="rounded-3xl bg-white dark:bg-[#0f1a28] p-6 sm:p-7 shadow-xl border border-sand-200/80 dark:border-[#1d2d3e] space-y-5">
            {/* Status Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap pb-4 border-b border-sand-200 dark:border-[#1d2d3e]">
              <div>
                <h3 className="text-xl font-black text-ocean-900 dark:text-white">{appData.business_name}</h3>
                <p className="text-xs text-ocean-700/70 dark:text-white/60 mt-0.5 font-semibold">
                  المنطقة: {appData.area}
                </p>
              </div>

              {appData.status === 'approved' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-teal2-100 text-teal2-700 dark:bg-teal2-950/50 dark:text-teal2-300">
                  <CheckCircle className="w-4 h-4" />
                  <span>متوافق عليه ومفعل في الموقع</span>
                </span>
              )}
              {appData.status === 'pending' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                  <Clock className="w-4 h-4" />
                  <span>قيد المراجعة من الإدارة</span>
                </span>
              )}
              {appData.status === 'rejected' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span>مرفوض حالياً</span>
                </span>
              )}
            </div>

            {/* Offer Edit Form */}
            <form onSubmit={handleUpdateOffer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5">اسم المتجر</label>
                  <input
                    type="text"
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                    className="w-full rounded-2xl border border-sand-200 dark:border-[#22354a] bg-sand-50 dark:bg-[#142232] px-4 py-2.5 text-sm font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5">المنطقة</label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full rounded-2xl border border-sand-200 dark:border-[#22354a] bg-sand-50 dark:bg-[#142232] px-4 py-2.5 text-sm font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5">نسبة الخصم للعميل %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discount}
                    onChange={(e) => setDiscount(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-2xl border border-sand-200 dark:border-[#22354a] bg-sand-50 dark:bg-[#142232] px-4 py-2.5 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5">عمولة فريق TOLZY (ج/عميل)</label>
                  <input
                    type="number"
                    min="0"
                    value={commission}
                    onChange={(e) => setCommission(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-2xl border border-sand-200 dark:border-[#22354a] bg-sand-50 dark:bg-[#142232] px-4 py-2.5 text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5">شروط العرض أو تفاصيل الكوبون</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-2xl border border-sand-200 dark:border-[#22354a] bg-sand-50 dark:bg-[#142232] px-4 py-2.5 text-sm font-semibold"
                />
              </div>

              <p className="text-xs text-ocean-700/60 dark:text-white/50 font-medium">
                ملاحظة: أي تعديل في نسب الخصم أو العرض قد يعيد الطلب للمراجعة السريعة من الإدارة.
              </p>

              {saveMsg && (
                <p className="text-xs font-bold text-teal2-600 dark:text-teal2-400">{saveMsg}</p>
              )}

              <motion.button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-teal2-600 hover:bg-teal2-500 text-white font-black text-sm shadow-lg shadow-teal2-600/30 transition flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{loading ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</span>
              </motion.button>
            </form>
          </div>
        </div>
      ) : (
        /* Partner Registration View */
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-ocean-900 dark:text-white flex items-center gap-2.5">
              <Store className="w-7 h-7 text-teal2-600" />
              <span>سجّل متجرك وانضم لشركاء بورسعيد</span>
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-ocean-700/80 dark:text-ocean-100/70 font-semibold">
              وصّل مطعمك أو كافيهك لآلاف الزوار والطلاب، واحصل على حساب تاجر مخصص لمتابعة كوبونات العملاء.
            </p>
          </div>

          <motion.div
            className="rounded-3xl bg-white dark:bg-[#0f1a28] p-6 sm:p-7 shadow-xl border border-sand-200/80 dark:border-[#1d2d3e]"
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <form onSubmit={handleRegisterMerchantSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5">اسم المتجر / النشاط</label>
                  <input
                    type="text"
                    placeholder="مثال: مطعم بحريات القناة"
                    value={newBizName}
                    onChange={(e) => setNewBizName(e.target.value)}
                    className="w-full rounded-2xl border border-sand-200 dark:border-[#22354a] bg-sand-50 dark:bg-[#142232] px-4 py-2.5 text-sm font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5">نوع النشاط</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-2xl border border-sand-200 dark:border-[#22354a] bg-sand-50 dark:bg-[#142232] px-4 py-2.5 text-sm font-semibold"
                  >
                    <option value="food">مطاعم</option>
                    <option value="cafe">كافيهات</option>
                    <option value="sweets">حلويات</option>
                    <option value="shop">تسوق</option>
                    <option value="sport">رياضة</option>
                    <option value="fun">معالم وترفيه</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5">المنطقة</label>
                  <select
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    className="w-full rounded-2xl border border-sand-200 dark:border-[#22354a] bg-sand-50 dark:bg-[#142232] px-4 py-2.5 text-sm font-semibold"
                  >
                    {AREAS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5">رقم هاتف المتجر</label>
                  <input
                    type="tel"
                    dir="ltr"
                    placeholder="01xxxxxxxxx"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    className="w-full rounded-2xl border border-sand-200 dark:border-[#22354a] bg-sand-50 dark:bg-[#142232] px-4 py-2.5 text-sm font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5">اسمك (صاحب المتجر)</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full rounded-2xl border border-sand-200 dark:border-[#22354a] bg-sand-50 dark:bg-[#142232] px-4 py-2.5 text-sm font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5">البريد الإلكتروني للدخول</label>
                  <input
                    type="email"
                    dir="ltr"
                    placeholder="owner@example.com"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="w-full rounded-2xl border border-sand-200 dark:border-[#22354a] bg-sand-50 dark:bg-[#142232] px-4 py-2.5 text-sm font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5">كلمة مرور الحساب (8 أحرف على الأقل)</label>
                <input
                  type="password"
                  dir="ltr"
                  value={ownerPass}
                  onChange={(e) => setOwnerPass(e.target.value)}
                  className="w-full rounded-2xl border border-sand-200 dark:border-[#22354a] bg-sand-50 dark:bg-[#142232] px-4 py-2.5 text-sm font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5">نسبة الخصم المقترحة %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newDiscount}
                    onChange={(e) => setNewDiscount(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-2xl border border-sand-200 dark:border-[#22354a] bg-sand-50 dark:bg-[#142232] px-4 py-2.5 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5">العمولة لفريق TOLZY (ج/عميل)</label>
                  <input
                    type="number"
                    min="0"
                    value={newCommission}
                    onChange={(e) => setNewCommission(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-2xl border border-sand-200 dark:border-[#22354a] bg-sand-50 dark:bg-[#142232] px-4 py-2.5 text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5">أكواد خصم أو ملاحظات إضافية (اختياري)</label>
                <input
                  type="text"
                  placeholder="مثال: خصم خاص أيام الدراسة"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full rounded-2xl border border-sand-200 dark:border-[#22354a] bg-sand-50 dark:bg-[#142232] px-4 py-2.5 text-sm font-semibold"
                />
              </div>

              {regErr && <p className="text-xs font-bold text-red-600">{regErr}</p>}

              <motion.button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-teal2-600 hover:bg-teal2-500 text-white font-black text-sm shadow-lg shadow-teal2-600/30 transition flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Store className="w-4 h-4" />}
                <span>{loading ? 'جارٍ تسجيل المتجر...' : 'سجّل متجرك الآن'}</span>
              </motion.button>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
