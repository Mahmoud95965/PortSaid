import type { Metadata } from 'next';

const SITE_URL = 'https://www.port-said-hub.site';
const PAGE_TITLE = 'رياضة في بورسعيد | Port Said Hub';
const PAGE_DESCRIPTION = 'رياضة في بورسعيد: اعرف الأماكن والأنشطة الرياضية في بورسعيد، وأماكن ممارسة الرياضة في المدينة.';
const PAGE_URL = `${SITE_URL}/sport`;
const SITE_IMAGE = `${SITE_URL}/assets/logo/icon-192.png`;

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    'رياضة في بورسعيد',
    'أنشطة رياضية في بورسعيد',
    'أماكن رياضية في بورسعيد',
    'رياضة بورسعيد',
    'دليل الرياضة بورسعيد',
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
      name: 'رياضة في بورسعيد',
      item: PAGE_URL,
    },
  ],
};

export default function SportLayout({
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
