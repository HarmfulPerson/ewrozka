'use client';

import Link from 'next/link';
import { Header } from '../../../components/layout/header';
import { Footer } from '../../../components/layout/footer';

export default function GuestPaymentSuccessPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', paddingTop: 80 }}>
      <Header />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '2.5rem',
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{ fontSize: '3rem' }}>✅</div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', margin: 0 }}>
            Płatność zakończona!
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
            Dziękujemy za opłacenie spotkania. Na podany adres e-mail wysłaliśmy wiadomość z unikalnym linkiem do pokoju spotkania.
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Sprawdź swoją skrzynkę (również folder SPAM).
          </p>
          <Link href="/ogloszenia" style={{
            display: 'inline-block',
            marginTop: '0.5rem',
            background: 'linear-gradient(135deg, var(--accent), #a855f7)',
            color: '#fff',
            padding: '0.7rem 2rem',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 600,
          }}>
            Przeglądaj ogłoszenia
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
