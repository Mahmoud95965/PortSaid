import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { hashPassword, createSessionToken } from '@/lib/auth';
import { User } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, password, user_type_id, governorate_id, institution_id, gender } = body;

    if (!name || !password || (!email && !phone)) {
      return NextResponse.json({ ok: false, error: { message: 'الاسم وكلمة المرور ورقم الهاتف أو البريد حقول مطلوبة' } }, { status: 422 });
    }

    const hashed = await hashPassword(password);
    const userId = crypto.randomUUID();

    const newUser: User = {
      id: userId,
      name: String(name).trim(),
      email: email ? String(email).trim().toLowerCase() : null,
      phone: phone ? String(phone).trim() : null,
      role: 'user',
      points: 20, // ترحيب
      gender: gender || 'male',
      staff: false,
    };

    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { error } = await supabase.from('users').insert([{
        id: userId,
        uuid: userId,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        password_hash: hashed,
        role_id: 4, // user
        user_type_id: user_type_id ? Number(user_type_id) : 3,
        governorate_id: governorate_id ? Number(governorate_id) : null,
        institution_id: institution_id ? Number(institution_id) : null,
        gender: newUser.gender,
        points_balance: 20
      }]);

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json({ ok: false, error: { message: 'رقم الهاتف أو البريد مسجل مسبقاً' } }, { status: 409 });
        }
        console.error('Supabase register error:', error);
      }
    }

    const token = await createSessionToken(newUser);
    const res = NextResponse.json({ ok: true, data: { user: newUser } }, { status: 201 });
    res.cookies.set('psid_next', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    });
    return res;
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: { message: err.message || 'خطأ في إنشاء الحساب' } }, { status: 500 });
  }
}
