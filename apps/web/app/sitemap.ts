import type { MetadataRoute } from 'next';

const BASE_URL = 'https://ewrozka.online';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/ogloszenia`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/kontakt`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/regulamin`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/polityka-prywatnosci`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/polityka-cookies`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/rodo`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // Dynamiczne strony specjalistów
  let wizardPages: MetadataRoute.Sitemap = [];
  try {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.ewrozka.online').replace(/\/+$/, '');
    const apiUrl = apiBase.endsWith('/api') ? apiBase : `${apiBase}/api`;
    const res = await fetch(`${apiUrl}/wizards?limit=1000`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      const wizards = data.wizards ?? [];
      wizardPages = wizards.map((w: { id: number }) => ({
        url: `${BASE_URL}/wrozka/${w.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));
    }
  } catch {
    // API niedostępne — pomijamy dynamiczne strony
  }

  return [...staticPages, ...wizardPages];
}
