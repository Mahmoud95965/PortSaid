import type { MetadataRoute } from 'next';

const SITE_URL = 'https://www.port-said-hub.site';
const LAST_MODIFIED = new Date('2026-11-21');

const ROUTES: { path: string; changeFrequency: 'weekly' | 'monthly'; priority: number }[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/explore', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/food', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/transport', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/housing', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/hotels', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/cafe', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/map', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/shop', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/clothes', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/fun', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/sport', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/sweets', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/memories', changeFrequency: 'monthly', priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: LAST_MODIFIED,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
