import type { Metadata } from 'next';

const SITE_URL = 'https://www.port-said-hub.site';
const PAGE_TITLE = 'ذكرياتي في بورسعيد | Port Said Hub';
const PAGE_DESCRIPTION = 'ذكرياتك في بورسعيد: احفظ أماكنك المفضلة وذكرياتك في بورسعيد في مكان واحد، وارجع لها في أي وقت.';
const PAGE_URL = `${SITE_URL}/memories`;
const SITE_IMAGE = `${SITE_URL}/assets/logo/icon-192.png`;

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    'ذكريات بورسعيد',
    'ذكرياتي في بورسعيد',
    'أماكني المفضلة بورسعيد',
    'ذكريات في بورسعيد',
    'Port Said Hub',
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
      name: 'ذكرياتي في بورسعيد',
      item: PAGE_URL,
    },
  ],
};

export default function MemoriesLayout({
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
