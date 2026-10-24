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

export const metadata: Metadata = {
  title: 'Port Said Hub | دليلك في بورسعيد',
  description: 'كل بورسعيد في مكان واحد: مواصلات، مطاعم، سكن، ونقاط ومكافآت. بورسعيد.. المدينة الباسلة.',
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
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
