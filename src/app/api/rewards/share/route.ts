import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  // تم إيقاف كسب النقاط العشوائي من مجرد الضغط على زر المشاركة بناءً على التوجيهات
  // النقاط تُكتسب حصرياً بالزيارات الفعلية المعتمدة للأماكن وهدية الترحيب
  return NextResponse.json(
    {
      ok: false,
      message: 'تم إيقاف كسب النقاط من المشاركة. يمكنك كسب النقاط بشكل فعلي عبر زيارة الأماكن ومعالم بورسعيد.',
    },
    { status: 400 }
  );
}
