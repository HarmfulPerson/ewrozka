import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Cinzel_Decorative } from 'next/font/google';
import PageTransition from './components/page-transition/PageTransition';
import { GlobalToaster } from './components/global-toaster';
import { CookieConsent } from './components/cookie-consent/CookieConsent';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
});

const cinzelDecorative = Cinzel_Decorative({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-cinzel',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://ewrozka.online'),
  title: {
    default: 'eWróżka — Portal konsultacji ezoterycznych',
    template: '%s | eWróżka',
  },
  description:
    'Połącz się ze specjalistami lub oferuj konsultacje. Tarot, horoskopy, runy — jeden portal dla specjalistów i klientów.',
  keywords: [
    'wróżka online',
    'tarot online',
    'horoskop',
    'runy',
    'konsultacja ezoteryczna',
    'wróżenie',
    'astrologia',
    'eWróżka',
  ],
  authors: [{ name: 'eWróżka' }],
  creator: 'eWróżka',
  icons: {
    icon: '/icon-purple.svg',
    shortcut: '/icon-purple.svg',
    apple: '/icon-purple.svg',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    url: 'https://ewrozka.online',
    siteName: 'eWróżka',
    title: 'eWróżka — Portal konsultacji ezoterycznych',
    description:
      'Połącz się ze specjalistami lub oferuj konsultacje. Tarot, horoskopy, runy — jeden portal dla specjalistów i klientów.',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'eWróżka — Portal konsultacji ezoterycznych',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'eWróżka — Portal konsultacji ezoterycznych',
    description:
      'Połącz się ze specjalistami lub oferuj konsultacje. Tarot, horoskopy, runy.',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://ewrozka.online',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'eWróżka',
    url: 'https://ewrozka.online',
    logo: 'https://ewrozka.online/logo.png',
    description:
      'Portal konsultacji ezoterycznych — tarot, horoskopy, runy. Dla specjalistów i klientów.',
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      url: 'https://ewrozka.online/kontakt',
      availableLanguage: 'Polish',
    },
  };

  return (
    <html lang="pl">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${cinzelDecorative.variable}`}>
        <GlobalToaster />
        <PageTransition />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
