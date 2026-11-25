import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getAdminSession } from '@/lib/auth/requireAdmin';
import { getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * POST /api/admin/upload-image — رفع صورة من جهاز المسؤول إلى Supabase Storage.
 *
 * admin-only (portsaidhub@gmail.com، نفس بوابة /admin) — أي طلب بدون جلسة
 * مسؤول مرفوض قبل أي قراءة للملف. الرفع يتم بمفتاح الخدمة من جهة الخادم،
 * فلا يحتاج المتصفح أي صلاحية كتابة على التخزين.
 *
 * المدخلات (multipart/form-data): file (صورة) + folder (مجلد مسموح به).
 * المخرجات: { ok: true, url, path } — الرابط العام يُحفظ في حقل الصورة.
 */

const BUCKET = 'site-images';
const ALLOWED_FOLDERS = ['guides'] as const;
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  try {
    // البوابة أولاً: بدون جلسة مسؤول لا يُقرأ أي ملف.
    const adminSession = getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ ok: false, message: 'هذه العملية تتطلب صلاحيات المسؤول.' }, { status: 403 });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ ok: false, message: 'تعذر الاتصال بقاعدة البيانات.' }, { status: 500 });
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ ok: false, message: 'بيانات الرفع غير صالحة.' }, { status: 400 });
    }

    const folder = String(form.get('folder') || 'guides');
    if (!(ALLOWED_FOLDERS as readonly string[]).includes(folder)) {
      return NextResponse.json({ ok: false, message: 'المجلد غير مسموح به.' }, { status: 400 });
    }

    const file = form.get('file');
    if (!file || typeof file === 'string' || typeof (file as File).arrayBuffer !== 'function') {
      return NextResponse.json({ ok: false, message: 'اختر ملف صورة أولاً.' }, { status: 400 });
    }

    const blob = file as File;
    const ext = ALLOWED_TYPES[blob.type];
    if (!ext) {
      return NextResponse.json(
        { ok: false, message: 'نوع الصورة غير مدعوم — استخدم JPG أو PNG أو WebP أو GIF.' },
        { status: 400 }
      );
    }
    if (blob.size <= 0 || blob.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, message: 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت.' }, { status: 400 });
    }

    // اسم ملف عشوائي — لا يُستخدم اسم الملف الأصلي أبداً (يمنع التلاعب بالمسار).
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const bytes = Buffer.from(await blob.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: blob.type, upsert: false });
    if (uploadError) {
      console.error('Admin image upload failed:', uploadError.message);
      return NextResponse.json({ ok: false, message: 'فشل رفع الصورة إلى التخزين.' }, { status: 500 });
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ ok: true, url: data.publicUrl, path });
  } catch (err: unknown) {
    console.error('Server /api/admin/upload-image error:', err);
    return NextResponse.json({ ok: false, message: 'حدث خطأ أثناء رفع الصورة.' }, { status: 500 });
  }
}
