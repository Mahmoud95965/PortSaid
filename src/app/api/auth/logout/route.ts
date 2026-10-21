import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ ok: true, data: { logged_out: true } });
  res.cookies.set('psid_next', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/'
  });
  return res;
}
