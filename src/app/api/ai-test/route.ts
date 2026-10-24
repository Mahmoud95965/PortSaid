import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { apiKey, model = 'openai/gpt-4.1-nano' } = body;

    const keyToTest = (apiKey && apiKey.trim().length > 5)
      ? apiKey.trim()
      : (process.env.OPENROUTER_API_KEY || '');

    if (!keyToTest) {
      return NextResponse.json({
        ok: false,
        error: 'لم يتم توفير مفتاح OpenRouter. يرجى إدخال المفتاح أولاً (يبدأ بـ sk-or-...).',
      }, { status: 400 });
    }

    const testRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${keyToTest}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Port Said Hub Key Verification',
      },
      body: JSON.stringify({
        model: model || 'openai/gpt-4.1-nano',
        messages: [{ role: 'user', content: 'Say "OK"' }],
        max_tokens: 5,
      }),
    });

    if (!testRes.ok) {
      const errData = await testRes.json().catch(() => null);
      const code = testRes.status;
      let userFriendlyMsg = errData?.error?.message || `كود الخطأ: ${code}`;

      if (code === 401) {
        userFriendlyMsg = 'مفتاح OpenRouter غير صالح أو تم إلغاؤه (401 Unauthorized). تحقق من نسخه بشكل صحيح.';
      } else if (code === 402) {
        userFriendlyMsg = 'رصيد الحساب غير كافٍ في OpenRouter (402 Payment Required). يمكنك استخدام النماذج المجانية (مثل :free).';
      } else if (code === 404) {
        userFriendlyMsg = `الموديل المختار (${model}) غير متاح أو تم تغيير اسمه في OpenRouter (404 Not Found).`;
      } else if (code === 429) {
        userFriendlyMsg = 'تم تجاوز حد الطلبات في OpenRouter مؤقتاً (429 Rate Limit). جرب بعد قليل.';
      }

      return NextResponse.json({
        ok: false,
        statusCode: code,
        error: userFriendlyMsg,
        rawError: errData?.error,
      }, { status: 400 });
    }

    const data = await testRes.json();
    return NextResponse.json({
      ok: true,
      message: `تم التحقق بنجاح! المفتاح صالح وموديل (${model}) جاهز للعمل.`,
      model,
      sampleResponse: data.choices?.[0]?.message?.content,
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: `فشل الاتصال بخوادم OpenRouter: ${error?.message || 'خطأ في الشبكة'}`,
    }, { status: 500 });
  }
}
