import type { Metadata } from 'next';

const SITE_URL = 'https://www.port-said-hub.site';
const PAGE_TITLE = 'مواصلات بورسعيد | Port Said Hub';
const PAGE_DESCRIPTION = 'مواصلات بورسعيد: اعرف وسائل النقل والمواصلات المتاحة في بورسعيد وخطوطها، وخطط تنقلك داخل المدينة بسهولة.';
const PAGE_URL = `${SITE_URL}/transport`;
const SITE_IMAGE = `${SITE_URL}/assets/logo/icon-192.png`;

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    'مواصلات بورسعيد',
    'النقل في بورسعيد',
    'أتوبيس بورسعيد',
    'مواصلات في بورسعيد',
    'خطوط المواصلات بورسعيد',
  ],
  alternates: {
    canonical: PAGE_URL,
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
    url: PAGE_URL,
    siteName: 'Port Said Hub',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
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
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [SITE_IMAGE],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Port Said Hub',
      item: `${SITE_URL}/`,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'مواصلات بورسعيد',
      item: PAGE_URL,
    },
  ],
};

export default function TransportLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
