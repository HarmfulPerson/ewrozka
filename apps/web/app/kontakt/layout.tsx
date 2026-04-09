import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kontakt',
  description:
    'Skontaktuj sie z zespolem eWrozka. Masz pytania dotyczace platformy? Napisz do nas.',
  alternates: {
    canonical: 'https://ewrozka.online/kontakt',
  },
  openGraph: {
    title: 'Kontakt | eWrozka',
    description: 'Skontaktuj sie z zespolem eWrozka. Masz pytania? Napisz do nas.',
    url: 'https://ewrozka.online/kontakt',
  },
};

export default function KontaktLayout({ children }: { children: React.ReactNode }) {
  return children;
}
