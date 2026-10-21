import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      hero: [
        { src: '/assets/port-said/hero-01.webp' },
        { src: '/assets/port-said/hero-02.webp' },
        { src: '/assets/port-said/hero-03.webp' },
      ],
      gallery: [
        { src: '/assets/port-said/gallery/balconies-street.webp', cap: 'شرفات الحي الإفرنجي الخشبية' },
        { src: '/assets/port-said/gallery/martyrs-square.webp', cap: 'ميدان الشهداء والمسلة' },
        { src: '/assets/port-said/gallery/ship.webp', cap: 'سفن قناة السويس والممشى السياحي' },
        { src: '/assets/port-said/port-said-lighthouse.webp', cap: 'فنار بورسعيد التاريخي' },
        { src: '/assets/port-said/port-said-mosque.webp', cap: 'مسجد السلام الكبير' },
        { src: '/assets/port-said/port-said-port-night.webp', cap: 'ميناء بورسعيد ليلًا' },
      ],
    },
  });
}
