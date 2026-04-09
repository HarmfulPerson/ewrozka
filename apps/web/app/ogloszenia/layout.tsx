import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Specjalisci — znajdz swojego eksperta',
  description:
    'Przegladaj profile specjalistow oferujacych konsultacje ezoteryczne: tarot, horoskopy, runy, astrologia. Umow sie online na ewrozka.online.',
  alternates: {
    canonical: 'https://ewrozka.online/ogloszenia',
  },
  openGraph: {
    title: 'Specjalisci — znajdz swojego eksperta | eWrozka',
    description:
      'Przegladaj profile specjalistow oferujacych konsultacje ezoteryczne: tarot, horoskopy, runy, astrologia.',
    url: 'https://ewrozka.online/ogloszenia',
  },
};

export default function OgloszeniaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
