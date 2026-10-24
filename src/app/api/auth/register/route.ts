import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServer } from '@/lib/supabase/server';
import { hashPasswordModern } from '@/lib/auth/password';
import { sealSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session';
import { checkRateLimit, getClientIp } from '@/lib/auth/rateLimit';
import { normalizePhone } from '@/lib/auth/validation';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    // 1. IP-level rate limiting: max 5 registrations per hour per IP
    const regRate = checkRateLimit(`register:${ip}`, 5, 60 * 60);
    if (!regRate.allowed) {
      return NextResponse.json(
        { ok: false, message: 'تم تجاوز الحد الأقصى لمحاولات التسجيل من هذا الجهاز. برجاء المحاولة بعد ساعة.' },
        { status: 429 }
      );
    }

    const body = await req.json();

    // 2. Anti-Bot Honeypot check: If the hidden honeypot field is filled, reject silently
    if (body.website_url || body.hp_check) {
      return NextResponse.json({ ok: false, message: 'طلب غير صالح.' }, { status: 400 });
    }

    const {
      name,
      email,
      phone,
      password,
      gender,
      user_type,
      governorate,
      institution,
      role = 'user',
      // Merchant specific
      business_name,
      area,
      discount,
      commission,
      notes,
    } = body;

    const trimmedName = (name || '').trim();
    const trimmedEmail = (email || '').toLowerCase().trim();
    const normalizedPhone = normalizePhone((phone || '').trim());

    if (!trimmedName || !trimmedEmail || !normalizedPhone || !password) {
      return NextResponse.json(
        { ok: false, message: 'جميع الحقول الأساسية (الاسم، البريد، الهاتف، كلمة المرور) مطلوبة.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.' },
        { status: 400 }
      );
    }

    // 3. Hash password with modern Salted Scrypt
    const hashedPassword = hashPasswordModern(password);

    const supabase = getSupabaseServer();
    if (!supabase) {
      // Local dev fallback
      const mockId = crypto.randomUUID();
      const token = sealSessionToken({
        userId: mockId,
        name: trimmedName,
        email: trimmedEmail,
        phone: normalizedPhone,
        role: role === 'merchant' ? 'merchant' : 'user',
      });

      cookies().set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
      });

      return NextResponse.json({
        ok: true,
        user: {
          id: mockId,
          name: trimmedName,
          email: trimmedEmail,
          phone: normalizedPhone,
          role: role === 'merchant' ? 'merchant' : 'user',
          points: role === 'merchant' ? 0 : 20,
          email_verified: false,
          staff: false,
        },
      });
    }

    // 4. Resolve metadata IDs
    let userTypeId: number | null = null;
    let governorateId: number | null = null;
    let institutionId: number | null = null;

    if (user_type) {
      const typeMap: Record<string, number> = { student: 1, visitor: 2, local: 3 };
      userTypeId = typeMap[user_type] || null;
    }

    if (governorate) {
      const { data: gov } = await supabase
        .from('governorates')
        .select('id')
        .eq('name_ar', governorate.trim())
        .maybeSingle();
      if (gov?.id) governorateId = gov.id;
    }

    if (institution) {
      const { data: inst } = await supabase
        .from('institutions')
        .select('id')
        .eq('name_ar', institution.trim())
        .maybeSingle();
      if (inst?.id) institutionId = inst.id;
    }

    const initialPoints = role === 'merchant' ? 0 : 20;

    // 5. Insert user into DB
    const { data: newUser, error: insertErr } = await supabase
      .from('users')
      .insert({
        name: trimmedName,
        email: trimmedEmail,
        phone: normalizedPhone,
        password_hash: hashedPassword,
        gender: gender || 'male',
        role_id: role === 'merchant' ? 3 : 4,
        user_type_id: userTypeId,
        governorate_id: governorateId,
        institution_id: institutionId,
        points_balance: initialPoints,
        status: 'active',
      })
      .select('id, name, email, phone, gender, points_balance, created_at')
      .single();

    if (insertErr) {
      if (insertErr.code === '23505' || insertErr.message.includes('unique')) {
        return NextResponse.json(
          { ok: false, message: 'البريد الإلكتروني أو رقم الهاتف مسجل بالفعل مسبقاً.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ ok: false, message: insertErr.message }, { status: 400 });
    }

    // 6. Handle merchant partner application if applicable
    if (role === 'merchant' && business_name) {
      await supabase.from('partner_applications').insert({
        user_id: newUser.id,
        business_name: business_name.trim(),
        area_ar: (area || 'بورسعيد').trim(),
        phone: normalizedPhone,
        proposed_discount_percent: discount || 10,
        proposed_commission_amount: commission || 5,
        promo_notes: notes || '',
        status: 'pending',
      });
    }

    // 7. Record welcome ledger entry if points awarded
    if (initialPoints > 0) {
      try {
        await supabase.from('points_ledger').insert({
          user_id: newUser.id,
          delta: initialPoints,
          balance_after: initialPoints,
          reason: 'هدية إنشاء الحساب الجديد والترحيب في بورسعيد',
          ref_type: 'welcome_gift',
          ref_id: 'welcome_bonus',
        });
      } catch (subErr) {
        console.warn('Welcome points ledger entry notice:', subErr);
      }
    }

    // 8. Issue HttpOnly Session Cookie
    const userRole = role === 'merchant' ? 'merchant' : 'user';
    const sessionToken = sealSessionToken({
      userId: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: userRole,
    });

    cookies().set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: userRole,
        type: user_type,
        gov: governorate || 'بورسعيد',
        institution,
        gender: newUser.gender,
        points: initialPoints,
        email_verified: false,
        staff: false,
      },
    });
  } catch (err: any) {
    console.error('Server register error:', err);
    return NextResponse.json(
      { ok: false, message: 'حدث خطأ في معالجة التسجيل على الخادم.' },
      { status: 500 }
    );
  }
}
