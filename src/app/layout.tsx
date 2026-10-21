import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Port Said Hub | دليلك في بورسعيد',
  description: 'Port Said Hub | دليلك في بورسعيد - كل بورسعيد في مكان واحد: مواصلات، مطاعم، فنادق، وأماكن تستاهل تزورها.',
  icons: {
    icon: '/assets/logo/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
        <script
          src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"
          defer
        ></script>
      </head>
      <body className="bg-sand-50 text-ocean-900 leading-relaxed antialiased">
        {children}
      </body>
    </html>
  );
}
