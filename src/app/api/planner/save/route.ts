import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServer } from '@/lib/supabase/server';
import { unsealSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ ok: false, message: 'يجب تسجيل الدخول.' }, { status: 401 });
    }

    const session = unsealSessionToken(token);
    if (!session || !session.userId) {
      return NextResponse.json({ ok: false, message: 'جلسة الدخول غير صالحة.' }, { status: 401 });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ ok: true, itineraries: [] });
    }

    const { data, error } = await supabase
      .from('saved_itineraries')
      .select('*')
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, itineraries: data || [] });
  } catch (err: any) {
    console.error('Fetch itineraries error:', err);
    return NextResponse.json({ ok: false, message: 'فشل استرجاع الخطط المحفوظة.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ ok: false, message: 'يجب تسجيل الدخول لحفظ خطة الخروجة.' }, { status: 401 });
    }

    const session = unsealSessionToken(token);
    if (!session || !session.userId) {
      return NextResponse.json({ ok: false, message: 'جلسة الدخول غير صالحة.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      summary,
      budgetEgp,
      totalCost,
      partySize,
      durationHours,
      transportMode = 'driving',
      stops,
      routeGeoJSON,
    } = body;

    if (!title || !stops) {
      return NextResponse.json({ ok: false, message: 'بيانات الخطة غير مكتملة.' }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ ok: true, message: 'تم حفظ الخطة محلياً.' });
    }

    const { data, error } = await supabase
      .from('saved_itineraries')
      .insert({
        user_id: session.userId,
        title: title.trim(),
        summary: summary || '',
        budget_egp: budgetEgp || 500,
        total_cost: totalCost || 0,
        party_size: partySize || 2,
        duration_hours: durationHours || 4,
        transport_mode: transportMode,
        stops_json: stops,
        route_geojson: routeGeoJSON || null,
      })
      .select('id, created_at')
      .single();

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      id: data.id,
      message: 'تم حفظ الخطة بنجاح في حسابك السحابي! 🎉',
    });
  } catch (err: any) {
    console.error('Save itinerary error:', err);
    return NextResponse.json({ ok: false, message: 'حدث خطأ في حفظ الخطة.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ ok: false, message: 'يجب تسجيل الدخول.' }, { status: 401 });
    }

    const session = unsealSessionToken(token);
    if (!session || !session.userId) {
      return NextResponse.json({ ok: false, message: 'جلسة الدخول غير صالحة.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: false, message: 'معرف الخطة مطلوب.' }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ ok: true });
    }

    await supabase
      .from('saved_itineraries')
      .delete()
      .eq('id', id)
      .eq('user_id', session.userId);

    return NextResponse.json({ ok: true, message: 'تم حذف الخطة بنجاح.' });
  } catch (err: any) {
    console.error('Delete itinerary error:', err);
    return NextResponse.json({ ok: false, message: 'فشل حذف الخطة.' }, { status: 500 });
  }
}
