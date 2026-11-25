/**
 * تسجيل النشاط من جهة الخادم (server-side) في جدول activity_log.
 *
 * يُستخدم من مسارات المصادقة (دخول / تسجيل) حتى يظهر النشاط الحقيقي
 * لكل حساب في صفحة المسؤول. لا يرمي أي خطأ أبداً ولا يعطّل المصادقة:
 * لو قاعدة البيانات غير مهيأة أو الـ insert اترفض (RLS)، يتسجل في
 * الـ console بس وتكمل العملية عادي.
 */
import { getSupabaseServer } from '@/lib/supabase/server';

export async function logActivityServer(
  actorId: string | null,
  actorName: string,
  actorRole: string,
  tag: string,
  description: string
): Promise<void> {
  try {
    const supabase = getSupabaseServer();
    if (!supabase) return;
    const { error } = await supabase.from('activity_log').insert({
      actor_id: actorId,
      actor_name: actorName || 'زائر',
      actor_role: actorRole || 'user',
      tag,
      severity: 'info',
      description,
      meta: {},
    });
    if (error) {
      console.error('logActivityServer insert failed:', error.message);
    }
  } catch (e) {
    console.error('logActivityServer failed:', e);
  }
}
