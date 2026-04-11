import type { Metadata } from 'next';
import AdvertisementClient from './advertisement-client';

const API_BASE = (() => {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.ewrozka.online').replace(/\/+$/, '');
  return base.endsWith('/api') ? base : `${base}/api`;
})();

async function getAdvertisement(uidOrId: string) {
  // Route segment may hold either the new uid (UUID) or the legacy numeric
  // id during the int-id → uid migration. Detect and hit the right endpoint.
  const isUid = /^[0-9a-f]{8}-/i.test(uidOrId);
  const path = isUid ? `advertisements/uid/${uidOrId}` : `advertisements/${uidOrId}`;
  try {
    const res = await fetch(`${API_BASE}/${path}`, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.advertisement ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ad = await getAdvertisement(id);

  if (!ad) {
    return { title: 'Ogloszenie nie znalezione' };
  }

  const price = (ad.priceGrosze / 100).toFixed(2);
  const title = `${ad.title} — ${ad.wizard.username}`;
  const description =
    ad.description?.slice(0, 160) ||
    `Konsultacja "${ad.title}" u ${ad.wizard.username} — ${price} zl, ${ad.durationMinutes} min.`;
  const imageUrl = ad.imageUrl
    ? `${API_BASE.replace(/\/api\/?$/, '')}${ad.imageUrl}`
    : 'https://ewrozka.online/logo.png';

  return {
    title,
    description,
    alternates: {
      canonical: `https://ewrozka.online/ogloszenie/${id}`,
    },
    openGraph: {
      type: 'article',
      title: `${ad.title} | eWrozka`,
      description,
      url: `https://ewrozka.online/ogloszenie/${id}`,
      images: [{ url: imageUrl, alt: ad.title }],
    },
    twitter: {
      card: 'summary',
      title: `${ad.title} | eWrozka`,
      description,
      images: [imageUrl],
    },
  };
}

export default function AdvertisementPage() {
  return <AdvertisementClient />;
}
