import type { Metadata } from 'next';

const SITE_URL = 'https://www.port-said-hub.site';
const PAGE_TITLE = 'شروط الاستخدام | Port Said Hub';
const PAGE_DESCRIPTION =
  'شروط استخدام Port Said Hub: قواعد استخدام حسابك والخدمة، ودقة المعلومات، وحدود المسؤولية.';
const PAGE_URL = `${SITE_URL}/terms`;
const SITE_IMAGE = `${SITE_URL}/og-image.jpg`;

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    'شروط الاستخدام',
    'شروط بورسعيد هاب',
    'Port Said Hub',
    'بورسعيد',
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
        width: 1200,
        height: 630,
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
      name: 'شروط الاستخدام',
      item: PAGE_URL,
    },
  ],
};

export default function TermsLayout({
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
