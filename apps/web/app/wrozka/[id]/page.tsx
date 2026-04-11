import type { Metadata } from 'next';
import WizardProfileClient from './wizard-profile-client';

const API_BASE = (() => {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.ewrozka.online').replace(/\/+$/, '');
  return base.endsWith('/api') ? base : `${base}/api`;
})();

async function getWizard(uidOrId: string) {
  // Route segment may hold either the new uid (UUID) or the legacy numeric id
  // during the int-id → uid migration. Detect and hit the right endpoint.
  const isUid = /^[0-9a-f]{8}-/i.test(uidOrId);
  const path = isUid ? `wizards/uid/${uidOrId}` : `wizards/${uidOrId}`;
  try {
    const res = await fetch(`${API_BASE}/${path}`, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.wizard ?? null;
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
  const wizard = await getWizard(id);

  if (!wizard) {
    return { title: 'Specjalista nie znaleziony' };
  }

  const title = `${wizard.username} — specjalista`;
  const description = wizard.bio
    ? wizard.bio.slice(0, 160)
    : `Profil specjalisty ${wizard.username} na eWrozka.online. ${(wizard.topicNames ?? []).join(', ')}.`;
  const imageUrl = wizard.image
    ? `${API_BASE.replace(/\/api\/?$/, '')}${wizard.image}`
    : 'https://ewrozka.online/logo.png';

  return {
    title,
    description,
    alternates: {
      canonical: `https://ewrozka.online/wrozka/${id}`,
    },
    openGraph: {
      type: 'profile',
      title: `${wizard.username} | eWrozka`,
      description,
      url: `https://ewrozka.online/wrozka/${id}`,
      images: [{ url: imageUrl, alt: wizard.username }],
    },
    twitter: {
      card: 'summary',
      title: `${wizard.username} | eWrozka`,
      description,
      images: [imageUrl],
    },
  };
}

export default function WizardProfilePage() {
  return <WizardProfileClient />;
}
