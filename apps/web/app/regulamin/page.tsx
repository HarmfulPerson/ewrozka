import Link from 'next/link';
import './regulamin.css';

export const metadata = { title: 'Regulamin – eWróżka' };

export default function RegulaминPage() {
  return (
    <main className="legal-page">
      <div className="legal-page__inner">
        <Link href="/" className="legal-page__back">← Wróć na stronę główną</Link>
        <h1 className="legal-page__title">Regulamin</h1>
        <p className="legal-page__placeholder">
          Treść regulaminu zostanie opublikowana wkrótce.
        </p>
      </div>
    </main>
  );
}
