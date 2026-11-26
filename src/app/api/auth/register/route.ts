import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServer } from '@/lib/supabase/server';
import { hashPasswordModern } from '@/lib/auth/password';
import { verifyGoogleAccessToken } from '@/lib/auth/google';
import { sealSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session';
import { logActivityServer } from '@/lib/activity';
import { checkRateLimit, getClientIp } from '@/lib/auth/rateLimit';
import { validateStrongPassword } from '@/lib/auth/admin';
import { normalizePhone } from '@/lib/auth/validation';
import { dbCreateUser, dbInsertPartnerApplication } from '@/lib/db/localDb';

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

    // 2. Anti-Bot Honeypot check
    if (body.website_url || body.hp_check) {
      return NextResponse.json({ ok: false, message: 'طلب غير صالح.' }, { status: 400 });
    }

    const {
      name,
      email,
      phone,
      password,
      // Password-less Google registration: a verified Google access token
      // proving ownership of the email below (see the validation below).
      googleAccessToken,
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

    if (!trimmedName || !trimmedEmail || !normalizedPhone) {
      return NextResponse.json(
        { ok: false, message: 'جميع الحقول الأساسية (الاسم، البريد، الهاتف) مطلوبة.' },
        { status: 400 }
      );
    }

    // Password-less registration is ONLY allowed for a Google-verified email:
    // the caller must attach a valid Google (Supabase Auth) access token and
    // its email must match the registration email. Anything else still needs
    // a strong password (12+ chars with upper + lower + digit + symbol).
    let isGoogleRegistration = false;
    if (!password) {
      if (!googleAccessToken || typeof googleAccessToken !== 'string') {
        return NextResponse.json(
          { ok: false, message: 'التسجيل بدون كلمة مرور متاح فقط عبر حساب Google موثّق.' },
          { status: 400 }
        );
      }
      const google = await verifyGoogleAccessToken(googleAccessToken);
      if (!google || google.email !== trimmedEmail) {
        return NextResponse.json(
          { ok: false, message: 'تعذّر التحقق من حساب Google. برجاء المحاولة مرة أخرى.' },
          { status: 401 }
        );
      }
      isGoogleRegistration = true;
    } else {
      const weakReason = validateStrongPassword(password);
      if (weakReason) {
        return NextResponse.json({ ok: false, message: weakReason }, { status: 400 });
      }
    }

    // 3. Hash password with modern Salted Scrypt. A Google-only account has
    // no usable password: store a scrypt hash of a random secret nobody
    // knows, so password login can never succeed for it (it signs in only
    // via Google, and /api/auth/login still rejects any password for it).
    const hashedPassword = password
      ? hashPasswordModern(password)
      : hashPasswordModern(crypto.randomUUID() + crypto.randomBytes(32).toString('hex'));
    const initialPoints = role === 'merchant' ? 0 : 20;

    const supabase = getSupabaseServer();
    if (!supabase) {
      // Local persistent database execution
      try {
        const newUser = dbCreateUser({
          name: trimmedName,
          email: trimmedEmail,
          phone: normalizedPhone,
          passwordHash: hashedPassword,
          gender: gender || 'male',
          role: role === 'merchant' ? 'merchant' : 'user',
          userType: user_type || 'student',
          governorate: governorate || 'بورسعيد',
          institution: institution || null,
          initialPoints,
        });

        if (role === 'merchant' && business_name) {
          dbInsertPartnerApplication({
            userId: newUser.id,
            businessName: business_name.trim(),
            areaAr: (area || 'بورسعيد').trim(),
            phone: normalizedPhone,
            discount: discount || 10,
            commission: commission || 5,
            notes: notes || '',
          });
        }

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
            type: newUser.user_type,
            gov: newUser.governorate,
            institution: newUser.institution,
            gender: newUser.gender,
            points: newUser.points_balance,
            email_verified: false,
            staff: false,
          },
        });
      } catch (err: any) {
        if (err.message && err.message.includes('UNIQUE constraint failed')) {
          return NextResponse.json(
            { ok: false, message: 'البريد الإلكتروني أو رقم الهاتف مسجل بالفعل مسبقاً.' },
            { status: 409 }
          );
        }
        console.error('LocalDb registration error:', err);
        return NextResponse.json({ ok: false, message: 'حدث خطأ أثناء حفظ الحساب الجديد.' }, { status: 500 });
      }
    }

    // 4. Remote Supabase execution
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

    const { data: newUser, error: insertErr } = await supabase
      .from('users')
      .insert({
        name: trimmedName,
        email: trimmedEmail,
        phone: normalizedPhone,
        password_hash: hashedPassword,
        // طريقة التسجيل الحقيقية — صفحة المسؤول بتقرأها بدل التخمين من وجود الهاش
        // (حسابات Google ليها هاش عشوائي برضه، فالتخمين كان بيطلعها "بريد").
        auth_provider: isGoogleRegistration ? 'google' : 'email',
        gender: gender || 'male',
        role_id: role === 'merchant' ? 3 : 4,
        user_type_id: userTypeId,
        governorate_id: governorateId,
        institution_id: institutionId,
        points_balance: initialPoints,
        status: 'active',
        // A Google-verified email is verified by definition.
        ...(isGoogleRegistration ? { email_verified_at: new Date().toISOString() } : {}),
      })
      .select('id, name, email, phone, gender, points_balance, created_at')
      .single();

    if (insertErr) {
      if (insertErr.code === '23505' || insertErr.message.includes('unique')) {
        // A returning Google user reaching the signup form: the verified
        // Google access token already proves ownership of this email (the
        // same proof /api/auth/google accepts), so log them into their
        // existing account instead of dead-ending with 409.
        if (isGoogleRegistration) {
          const { data: existingUser } = await supabase
            .from('users')
            .select('*, roles(code), user_types(code), governorates(name_ar), institutions(name_ar)')
            .eq('email', trimmedEmail)
            .eq('status', 'active')
            .is('deleted_at', null)
            .maybeSingle();

          if (existingUser) {
            if (existingUser.locked_until && new Date(existingUser.locked_until) > new Date()) {
              return NextResponse.json(
                { ok: false, message: 'هذا الحساب موقوف إدارياً. برجاء التواصل مع إدارة المنصة.' },
                { status: 403 }
              );
            }

            const existingRole = (existingUser.roles?.code || 'user') as 'owner' | 'admin' | 'merchant' | 'user';
            const existingSessionToken = sealSessionToken({
              userId: existingUser.id,
              name: existingUser.name,
              email: existingUser.email,
              phone: existingUser.phone,
              role: existingRole,
              sessionVersion: (existingUser as { session_version?: number }).session_version ?? 1,
            });

            cookies().set(SESSION_COOKIE_NAME, existingSessionToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
              maxAge: SESSION_MAX_AGE_SECONDS,
            });

            return NextResponse.json({
              ok: true,
              user: {
                id: existingUser.id,
                name: existingUser.name,
                email: existingUser.email,
                phone: existingUser.phone,
                role: existingRole,
                type: existingUser.user_types?.code,
                gov: existingUser.governorates?.name_ar,
                institution: existingUser.institutions?.name_ar,
                gender: existingUser.gender,
                points: existingUser.points_balance || 0,
                avatar: existingUser.avatar,
                email_verified: !!existingUser.email_verified_at,
                staff: existingRole === 'owner' || existingRole === 'admin',
                must_change_password: existingUser.must_change_password,
              },
            });
          }
          // No account with this email — the conflict was on the phone
          // number only, so the 409 stands.
        }
        return NextResponse.json(
          { ok: false, message: 'البريد الإلكتروني أو رقم الهاتف مسجل بالفعل مسبقاً.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ ok: false, message: insertErr.message }, { status: 400 });
    }

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

    // سجّل إنشاء الحساب في activity_log حتى يظهر في صفحة المسؤول.
    await logActivityServer(
      newUser.id,
      newUser.name,
      userRole,
      'تسجيل جديد',
      isGoogleRegistration ? 'أنشأ حساباً جديداً عبر Google' : 'أنشأ حساباً جديداً بالبريد الإلكتروني'
    );

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
        email_verified: isGoogleRegistration,
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
