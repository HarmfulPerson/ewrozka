import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Polityka cookies',
  description: 'Informacje o plikach cookies wykorzystywanych na portalu eWrozka.online.',
  alternates: {
    canonical: 'https://ewrozka.online/polityka-cookies',
  },
};

export default function PolitykaCookiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
