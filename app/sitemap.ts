import type { MetadataRoute } from 'next';

const baseUrl = 'https://crazyoctagon.xyz';

const routes: Array<{ path: string; priority: number }> = [
  { path: '/', priority: 1 },
  { path: '/breed', priority: 0.8 },
  { path: '/bridge', priority: 0.7 },
  { path: '/burn', priority: 0.7 },
  { path: '/graveyard', priority: 0.6 },
  { path: '/info', priority: 0.6 },
  { path: '/stats', priority: 0.6 },
  { path: '/game', priority: 0.5 },
  { path: '/rewards', priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map(route => ({
    url: `${baseUrl}${route.path === '/' ? '' : route.path}`,
    lastModified,
    changeFrequency: route.path === '/' ? 'daily' : 'weekly',
    priority: route.priority,
  }));
}
