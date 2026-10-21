import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { hashPassword, createSessionToken } from '@/lib/auth';
import { saveLocalUser } from '@/lib/local-db';
import { User } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      password,
      phone,
      business_name,
      category,
      area,
      discount,
      commission,
      notes,
      tax_number
    } = body;

    const trimmedName = String(name || business_name || 'صاحب المتجر').trim();
    const trimmedEmail = email ? String(email).trim().toLowerCase() : null;
    const trimmedPhone = phone ? String(phone).trim() : null;
    const userId = crypto.randomUUID();
    const hashed = password ? await hashPassword(password) : await hashPassword('Admin@123456');

    const newUser: User = {
      id: userId,
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      role: 'merchant',
      points: 100,
      gov: 'بورسعيد',
      staff: false,
    };

    // Save locally
    saveLocalUser({
      ...newUser,
      password_hash: hashed,
      created_at: new Date().toISOString()
    });

    // Save to Supabase if configured
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('users').insert([{
          id: userId,
          uuid: userId,
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
          password_hash: hashed,
          role_id: 3, // merchant
          points_balance: 100
        }]);

        await supabase.from('partner_applications').insert([{
          id: crypto.randomUUID(),
          user_id: userId,
          business_name: String(business_name || trimmedName).trim(),
          area_ar: String(area || 'حي الشرق').trim(),
          phone: trimmedPhone,
          proposed_discount_percent: Number(discount) || 10,
          proposed_commission_amount: Number(commission) || 5,
          promo_notes: notes || null,
          tax_number: tax_number || null,
          status: 'pending'
        }]);
      } catch (err) {
        console.error('Supabase partner insert error:', err);
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
    return NextResponse.json({ ok: false, error: { message: err.message || 'خطأ في تقديم طلب الشريك' } }, { status: 500 });
  }
}
