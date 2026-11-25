import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { getAdminSession } from '@/lib/auth/requireAdmin';
import { getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'بيانات المستخدم | Port Said Hub',
  description: 'صفحة بيانات مستخدم كاملة للمسؤول فقط',
};

/**
 * GET /admin/users/[id] — admin-only user detail page.
 *
 * Shows literally every field stored for the user EXCEPT the password:
 * - The registration method comes from the auth_provider column, written
 *   at signup (migration 13). It is NOT inferred from password_hash —
 *   Google accounts also carry a random hash, so that guess was wrong.
 *   password_hash is never selected, rendered, or logged by this page.
 * - Access: ONLY the single admin account (portsaidhub@gmail.com),
 *   enforced server-side before any data is fetched — the same gate as
 *   /admin (see src/lib/auth/requireAdmin). The page fetches with the
 *   service-role client, server-side only; the browser never queries
 *   these tables directly.
 */

const ROLE_LABELS: Record<string, string> = {
  owner: 'المالك',
  admin: 'مشرف',
  merchant: 'تاجر',
  user: 'مستخدم',
};

const TYPE_LABELS: Record<string, string> = {
  student: 'طالب',
  visitor: 'زائر',
  local: 'بورسعيدي',
};

function fmtDate(v: string | null | undefined): string {
  if (!v) return '—';
  return v.slice(0, 10);
}

function fmtDateTime(v: string | null | undefined): string {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v.slice(0, 10);
  return d.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
}

function Field({ label, children, ltr }: { label: string; children: React.ReactNode; ltr?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-line last:border-b-0">
      <span className="text-xs font-bold text-muted shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-bold text-right break-words" dir={ltr ? 'ltr' : undefined}>
        {children}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-surface shadow border border-line overflow-hidden">
      <h2 className="px-5 py-4 text-base font-black border-b border-line bg-surface-2">{title}</h2>
      <div className="px-5 py-1">{children}</div>
    </section>
  );
}

function NotFoundCard({ message }: { message: string }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
      <Link href="/admin" className="inline-block text-sm font-black text-teal2-600 hover:underline">
        العودة للوحة التحكم ‹
      </Link>
      <div className="rounded-3xl bg-surface shadow border border-line p-8 text-center">
        <p className="text-lg font-black">{message}</p>
        <p className="text-sm text-muted font-medium mt-2">تأكد من الرابط أو اختر مستخدماً آخر من جدول المستخدمين.</p>
      </div>
    </div>
  );
}

export default async function AdminUserPage({ params }: { params: { id: string } }) {
  // Server-side gate FIRST: no session check means no data, no render.
  const adminSession = getAdminSession();
  if (!adminSession) {
    redirect('/');
  }

  const id = params.id;
  if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) {
    return <NotFoundCard message="معرّف مستخدم غير صالح." />;
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return <NotFoundCard message="قاعدة البيانات غير مهيأة على الخادم." />;
  }

  const { data: row } = await supabase
    .from('users')
    .select(
      'id, name, email, phone, gender, role_id, user_type_id, governorate_id, institution_id, points_balance, status, email_verified_at, created_at, deleted_at, locked_until, auth_provider, roles(code), user_types(code), governorates(name_ar), institutions(name_ar)'
    )
    .eq('id', id)
    .maybeSingle();

  if (!row) {
    return <NotFoundCard message="المستخدم غير موجود." />;
  }

  // طريقة التسجيل مسجلة في قاعدة البيانات عند إنشاء الحساب (عمود
  // auth_provider) — لا تُستدل من وجود كلمة مرور، لأن حسابات Google
  // متسجلة هي كمان بهاش عشوائي. كلمة المرور لا تُقرأ هنا أصلاً.
  const user = {
    id: String(row.id),
    name: row.name || '',
    email: row.email || '',
    phone: row.phone || '',
    gender: row.gender || '',
    role: (row as any).roles?.code || 'user',
    userType: (row as any).user_types?.code || '',
    governorate: (row as any).governorates?.name_ar || '',
    institution: (row as any).institutions?.name_ar || '',
    pointsBalance: row.points_balance ?? 0,
    status: row.status || 'active',
    emailVerifiedAt: row.email_verified_at || null,
    createdAt: row.created_at || '',
    deletedAt: row.deleted_at || null,
    lockedUntil: row.locked_until || null,
    authMethod: (row as any).auth_provider === 'google' ? ('google' as const) : ('email' as const),
  };

  // النشاط الحقيقي للحساب: سجل الأحداث + الزيارات المسجلة (آخر 10 لكل منهما).
  const [visitsRes, visitsListRes, activityRes, appsRes] = await Promise.all([
    supabase.from('visits').select('*', { count: 'exact', head: true }).eq('user_id', id),
    supabase
      .from('visits')
      .select('id, place_id, points_awarded, created_at, places(name_ar)')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('activity_log')
      .select('id, tag, description, created_at')
      .eq('actor_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('partner_applications')
      .select('business_name, area_ar, phone, proposed_discount_percent, proposed_commission_amount, status, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
  ]);

  const visitsCount = visitsRes.count ?? 0;
  const visitsList = visitsListRes.data || [];
  const activityList = activityRes.data || [];
  const apps = appsRes.data || [];
  const latestApp = apps[0] || null;
  const lockedUntilDate = user.lockedUntil ? new Date(user.lockedUntil) : null;
  const isLocked = lockedUntilDate !== null && !Number.isNaN(lockedUntilDate.getTime()) && lockedUntilDate.getTime() > Date.now();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <Link href="/admin" className="inline-block text-sm font-black text-teal2-600 hover:underline">
        العودة للوحة التحكم ‹
      </Link>

      {user.deletedAt && (
        <div className="rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 px-5 py-4 text-sm font-bold">
          هذا الحساب محذوف (حذف ناعم) بتاريخ {fmtDateTime(user.deletedAt)}.
        </div>
      )}

      {/* Header: identity + status badges */}
      <div className="rounded-3xl bg-surface shadow border border-line p-5 sm:p-6 flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-ocean-900 dark:bg-surface-2 text-white dark:text-ink grid place-items-center text-2xl font-black shrink-0">
          {(user.name || user.email || '?').trim().charAt(0) || '?'}
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black break-words">{user.name || 'بدون اسم'}</h1>
          <p className="text-sm text-muted font-bold mt-1 break-words" dir="ltr">
            {user.email || '—'}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal2-100 dark:bg-teal2-950/60 text-teal2-700 dark:text-teal2-300">
              {ROLE_LABELS[user.role] || user.role}
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                user.status === 'active'
                  ? 'bg-teal2-100 dark:bg-teal2-950/60 text-teal2-700 dark:text-teal2-300'
                  : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
              }`}
            >
              {user.status === 'active' ? 'نشط' : 'موقوف'}
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sand-100 dark:bg-surface-2 text-ocean-900 dark:text-ink">
              {user.authMethod === 'google' ? 'التسجيل عبر Google' : 'التسجيل بالبريد وكلمة مرور'}
            </span>
          </div>
        </div>
      </div>

      <Section title="بيانات الحساب">
        <Field label="الاسم">{user.name || '—'}</Field>
        <Field label="البريد الإلكتروني" ltr>
          {user.email || '—'}
        </Field>
        <Field label="الهاتف" ltr>
          {user.phone || '—'}
        </Field>
        <Field label="النوع">{user.gender === 'female' ? 'أنثى' : user.gender === 'male' ? 'ذكر' : user.gender || '—'}</Field>
        <Field label="نوع الحساب">{TYPE_LABELS[user.userType] || user.userType || '—'}</Field>
        <Field label="المحافظة">{user.governorate || '—'}</Field>
        <Field label="الكلية / المعهد">{user.institution || '—'}</Field>
      </Section>

      <Section title="التسجيل والدخول">
        <Field label="طريقة التسجيل">
          {user.authMethod === 'google' ? 'Google' : 'البريد الإلكتروني وكلمة مرور'}
          <span className="block text-xs text-muted font-medium mt-1">
            تُسجَّل عند إنشاء الحساب (Google أو البريد الإلكتروني).
          </span>
        </Field>
        <Field label="تأكيد البريد الإلكتروني">
          {user.emailVerifiedAt ? `موثّق — ${fmtDateTime(user.emailVerifiedAt)}` : 'غير موثّق'}
        </Field>
        <Field label="تاريخ التسجيل">{fmtDateTime(user.createdAt)}</Field>
        <Field label="معرّف المستخدم" ltr>
          <span className="text-xs break-all">{user.id}</span>
        </Field>
      </Section>

      <Section title="الحالة والأمان">
        <Field label="حالة الحساب">{user.status === 'active' ? 'نشط' : user.status === 'suspended' ? 'موقوف' : user.status}</Field>
        <Field label="القفل المؤقت">
          {isLocked ? (
            <span className="text-red-600 dark:text-red-400">مقفل حتى {fmtDateTime(user.lockedUntil)}</span>
          ) : (
            'لا يوجد قفل'
          )}
        </Field>
        <Field label="الحذف">{user.deletedAt ? `محذوف بتاريخ ${fmtDateTime(user.deletedAt)}` : 'الحساب موجود'}</Field>
        <Field label="رصيد النقاط">
          {Number(user.pointsBalance).toLocaleString('ar-EG')}
          <span className="block text-xs text-muted font-medium mt-1">قيمة خام من قاعدة البيانات — نظام النقاط موقوف من واجهة المستخدم.</span>
        </Field>
      </Section>

      <Section title="النشاط">
        <Field label="عدد الزيارات المسجلة">{visitsCount.toLocaleString('ar-EG')}</Field>
        <Field label="أحدث الزيارات">
          {visitsList.length === 0 ? (
            'لا توجد زيارات مسجلة بعد'
          ) : (
            <ul className="mt-1 space-y-1.5">
              {visitsList.map((v: any) => (
                <li key={String(v.id)} className="text-sm font-bold">
                  {v.places?.name_ar || 'مكان غير معروف'}
                  <span className="block text-xs text-muted font-medium mt-0.5">
                    {fmtDateTime(v.created_at)}
                    {v.points_awarded != null ? ` — ${Number(v.points_awarded).toLocaleString('ar-EG')} نقطة` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Field>
        <Field label="سجل النشاط">
          {activityList.length === 0 ? (
            'لا يوجد نشاط مسجل بعد — يُسجَّل الدخول والتسجيل الجديد من الآن فصاعداً'
          ) : (
            <ul className="mt-1 space-y-1.5">
              {activityList.map((a: any) => (
                <li key={String(a.id)} className="text-sm font-bold">
                  {a.tag}
                  {a.description ? ` — ${a.description}` : ''}
                  <span className="block text-xs text-muted font-medium mt-0.5">{fmtDateTime(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Field>
        <Field label="طلب شراكة">
          {latestApp ? (
            <>
              {latestApp.business_name || '—'}
              <span className="block text-xs text-muted font-medium mt-1">
                الحالة: {latestApp.status === 'approved' ? 'مقبول' : latestApp.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                {latestApp.area_ar ? ` — ${latestApp.area_ar}` : ''}
                {latestApp.proposed_discount_percent != null ? ` — خصم مقترح ${latestApp.proposed_discount_percent}%` : ''}
                {apps.length > 1 ? ` — و${apps.length - 1} طلب آخر` : ''}
              </span>
            </>
          ) : (
            'لا يوجد طلب شراكة'
          )}
        </Field>
      </Section>

      <div className="rounded-2xl bg-surface-2 border border-line px-5 py-4 text-xs text-muted font-bold leading-relaxed">
        كلمة المرور لا تظهر في هذه الصفحة أبداً — هي مخزنة بصيغة مشفرة (hash) لا يمكن استرجاعها أو عرضها،
        وطريقة التسجيل تُقرأ من حقل مخصص في قاعدة البيانات. هذه الصفحة متاحة فقط لحساب المسؤول (portsaidhub@gmail.com).
      </div>
    </div>
  );
}
