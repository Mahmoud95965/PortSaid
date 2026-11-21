import type { Metadata, Viewport } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-cairo',
  display: 'swap',
});

const SITE_URL = 'https://www.port-said-hub.site';
const SITE_TITLE = 'Port Said Hub | دليل بورسعيد - مطاعم ومواصلات وسكن';
const SITE_DESCRIPTION =
  'دليلك الشامل في بورسعيد: اكتشف أفضل المطاعم والكافيهات، مواصلات بورسعيد، سكن وفنادق، وأماكن الخروج والترفيه، واجمع النقاط والمكافآت في مكان واحد.';
const SITE_IMAGE = `${SITE_URL}/assets/logo/icon-192.png`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  keywords: [
    'دليل بورسعيد',
    'دليل بورسعيد السياحي',
    'مطاعم بورسعيد',
    'أفضل مطاعم بورسعيد',
    'كافيهات بورسعيد',
    'مواصلات بورسعيد',
    'سكن في بورسعيد',
    'سكن بورسعيد',
    'فنادق بورسعيد',
    'فنادق في بورسعيد',
    'أماكن سياحية في بورسعيد',
    'أماكن الخروج في بورسعيد',
    'خريطة بورسعيد',
    'تسوق في بورسعيد',
    'ملابس بورسعيد',
    'حلويات بورسعيد',
    'رياضة في بورسعيد',
    'ذكريات بورسعيد',
    'بورسعيد مصر',
    'Port Said Hub',
    'Port Said',
    'بورسعيد',
  ],
  authors: [{ name: 'Port Said Hub' }],
  creator: 'Port Said Hub',
  publisher: 'Port Said Hub',
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    url: SITE_URL,
    siteName: 'Port Said Hub',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: SITE_IMAGE,
        width: 192,
        height: 192,
        alt: 'Port Said Hub - دليلك في بورسعيد',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SITE_IMAGE],
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Port Said Hub',
    statusBarStyle: 'default',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: 'Port Said Hub',
      alternateName: 'دليل بورسعيد',
      description: SITE_DESCRIPTION,
      inLanguage: 'ar-EG',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Port Said Hub',
      url: `${SITE_URL}/`,
      logo: SITE_IMAGE,
      description: SITE_DESCRIPTION,
    },
  ],
};

export const viewport: Viewport = {
  themeColor: '#0b2a5b',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable} suppressHydrationWarning>
      <body className={`${cairo.className} bg-sand-50 dark:bg-[#07162b] text-ocean-900 dark:text-[#eaf4ff] min-h-screen transition-colors antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
