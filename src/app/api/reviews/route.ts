import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSupabaseAdmin, getSupabase } from '@/lib/supabase';

let inMemoryReviews: any[] = [];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get('place_id');
  if (!placeId) return NextResponse.json({ ok: false, error: { message: 'المكان مطلوب' } }, { status: 400 });

  const user = await getSessionUser();
  const supabase = getSupabase();

  if (supabase) {
    const { data } = await supabase
      .from('place_reviews')
      .select('*, users(name, email_verified_at)')
      .eq('place_id', placeId)
      .eq('status', 'visible')
      .order('created_at', { ascending: false });

    if (data) {
      const items = data.map(r => ({
        id: r.id,
        place_id: r.place_id,
        user_id: r.user_id,
        name: r.users?.name || 'مستخدم',
        rating: r.rating,
        comment: r.comment,
        date: r.created_at?.split('T')[0] || '',
        mine: user ? r.user_id === user.id : false,
        verified: Boolean(r.users?.email_verified_at)
      }));

      const count = items.length;
      const avg = count > 0 ? (items.reduce((s, x) => s + x.rating, 0) / count).toFixed(1) : null;

      return NextResponse.json({
        ok: true,
        data: {
          items,
          count,
          avg: avg ? Number(avg) : null,
          mine: items.find(x => x.mine) || null
        }
      });
    }
  }

  const items = inMemoryReviews.filter(r => r.place_id === placeId);
  return NextResponse.json({
    ok: true,
    data: {
      items,
      count: items.length,
      avg: items.length > 0 ? (items.reduce((s, x) => s + x.rating, 0) / items.length).toFixed(1) : null,
      mine: user ? items.find(x => x.user_id === user.id) : null
    }
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: { message: 'سجل دخولك لكتابة تقييم' } }, { status: 401 });
  }

  const { place_id, rating, comment } = await req.json();
  const rNum = Number(rating);
  if (!place_id || rNum < 1 || rNum > 5) {
    return NextResponse.json({ ok: false, error: { message: 'يرجى اختيار تقييم من 1 إلى 5 نجوم' } }, { status: 422 });
  }

  const newReview = {
    id: crypto.randomUUID(),
    place_id,
    user_id: user.id,
    name: user.name,
    rating: rNum,
    comment: String(comment || '').trim(),
    status: 'visible',
    date: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    mine: true
  };

  const supabase = getSupabaseAdmin();
  if (supabase) {
    await supabase.from('place_reviews').upsert({
      place_id,
      user_id: user.id,
      rating: rNum,
      comment: newReview.comment,
      status: 'visible'
    }, { onConflict: 'place_id,user_id' });
  }

  inMemoryReviews = inMemoryReviews.filter(r => !(r.place_id === place_id && r.user_id === user.id));
  inMemoryReviews.unshift(newReview);

  return NextResponse.json({ ok: true, data: { saved: true } });
}
