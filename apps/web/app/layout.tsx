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
  title: 'eWróżka.pl — Portal konsultacji ezoterycznych',
  description:
    'Połącz się ze specjalistami lub oferuj konsultacje. Tarot, horoskopy, runy — jeden portal dla specjalistów i klientów.',
  icons: {
    icon: '/icon-purple.svg',
    shortcut: '/icon-purple.svg',
    apple: '/icon-purple.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className={`${geistSans.variable} ${geistMono.variable} ${cinzelDecorative.variable}`}>
        <GlobalToaster />
        <PageTransition />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
