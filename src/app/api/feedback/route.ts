import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

let inMemoryFeedback: any[] = [];

export async function POST(req: Request) {
  const user = await getSessionUser();
  const body = await req.json();
  const { kind, message } = body;

  if (!message || message.trim().length < 3) {
    return NextResponse.json({ ok: false, error: { message: 'نص الرسالة مطلوب' } }, { status: 422 });
  }

  const newFeedback = {
    id: crypto.randomUUID(),
    user_id: user?.id || null,
    kind: kind === 'complaint' ? 'complaint' : 'suggestion',
    message: String(message).trim(),
    status: 'new',
    created_at: new Date().toISOString()
  };

  const supabase = getSupabaseAdmin();
  if (supabase && user) {
    await supabase.from('feedback').insert([newFeedback]);
  }

  inMemoryFeedback.unshift(newFeedback);
  return NextResponse.json({
    ok: true,
    data: {
      received: true,
      message: 'شكراً لك! تم استلام رسالتك وسيتم مراجعتها من إدارة المنصة.'
    }
  });
}
