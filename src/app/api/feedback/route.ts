import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { unsealSessionTokenAsync, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { checkRateLimit, getClientIp } from '@/lib/auth/rateLimit';
import { getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// إرسال ملاحظة/شكوى. أمان: الكتابة من الخادم بس — كانت بتتم مباشرة من
// المتصفح بالمفتاح العام (سياسة INSERT عامة)، فأي حد يقدر يغرق الجدول
// بصفوف مزيفة وبأي user_id وأي status. دلوقتي الجلسة هي اللي تحدد
// المستخدم، والحالة دائماً 'new'، وبحد طلبات ضد الإغراق.
export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await unsealSessionTokenAsync(token) : null;
    if (!session) {
      return NextResponse.json(
        { ok: false, message: 'سجّل الدخول أولاً لإرسال ملاحظتك.' },
        { status: 401 }
      );
    }

    const ip = getClientIp(req);
    const userLimit = checkRateLimit(`feedback_user:${session.userId}`, 5, 60 * 60);
    if (!userLimit.allowed) {
      return NextResponse.json(
        { ok: false, message: 'وصلت للحد المسموح به من الملاحظات — جرّب بعد ساعة.' },
        { status: 429 }
      );
    }
    const ipLimit = checkRateLimit(`feedback_ip:${ip}`, 10, 60 * 60);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { ok: false, message: 'تم تجاوز الحد المسموح به من هذا الجهاز — جرّب بعد ساعة.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const kind = body?.kind === 'complaint' ? 'complaint' : 'suggestion';
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (message.length < 5 || message.length > 2000) {
      return NextResponse.json(
        { ok: false, message: 'اكتب رسالة من 5 حروف على الأقل وبحد أقصى 2000 حرف.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, message: 'قاعدة البيانات غير متاحة حالياً.' },
        { status: 503 }
      );
    }

    const { error } = await supabase.from('feedback').insert({
      user_id: session.userId,
      kind,
      message,
      status: 'new',
    });
    if (error) {
      console.error('Feedback save error:', error);
      return NextResponse.json(
        { ok: false, message: 'فشل إرسال ملاحظتك، جرّب تاني.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Feedback route error:', error);
    return NextResponse.json(
      { ok: false, message: 'حدث خطأ غير متوقع.' },
      { status: 500 }
    );
  }
}
