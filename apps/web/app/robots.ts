import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/panel/', '/login', '/rejestracja', '/api/'],
      },
    ],
    sitemap: 'https://ewrozka.online/sitemap.xml',
  };
}
