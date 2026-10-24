import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `
إنت "مساعد بورسعيد"، مساعد ذكي جوه موقع Port Said Hub (تطبيق سياحة وتخفيضات لمدينة بورسعيد، صممه فريق Alpha).
اتكلم باللهجة المصرية العامية، بشكل ودود ومباشر ومختصر (سطرين لتلاتة عادةً).
الموقع بيدي للمستخدم: نقاط لما يزور أماكن (+50 أو +20 نقطة)، ونقاط لما يشارك الموقع مع صحابه (+40 نقطة)، وكوبونات خصم بالـ QR يستبدلها بالنقط،
وقسم استكشف بورسعيد، وقسم سكن، وقسم مواصلات فيه خطوط المينى باص بين أحياء بورسعيد.
أصحاب المحلات يقدروا يسجلوا كتاجر ويحصلوا على لوحة تحكم خاصة لإدارة الخصم والعمولة.
جاوب بإيجاز وود وساعد المستخدم يوصل لأي معلومة في بورسعيد.
`;

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: true, ai_enabled: false, reply: null });
    }

    const messages = [];
    if (Array.isArray(history)) {
      for (const turn of history.slice(-6)) {
        if (turn.text && turn.role) {
          messages.push({
            role: turn.role === 'me' ? 'user' : 'assistant',
            content: turn.text,
          });
        }
      }
    }
    messages.push({ role: 'user', content: message });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 350,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ ok: true, ai_enabled: false, reply: null });
    }

    const data = await response.json();
    let reply = '';
    if (data.content && Array.isArray(data.content)) {
      for (const b of data.content) {
        if (b.type === 'text') reply += b.text;
      }
    }

    return NextResponse.json({ ok: true, ai_enabled: true, reply: reply.trim() });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
