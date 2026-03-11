import Link from 'next/link';
import '../regulamin/regulamin.css';

export const metadata = { title: 'RODO – eWróżka' };

export default function RodoPage() {
  return (
    <main className="legal-page">
      <div className="legal-page__inner">
        <Link href="/" className="legal-page__back">← Wróć na stronę główną</Link>
        <h1 className="legal-page__title">RODO</h1>
        <p className="legal-page__placeholder">
          Informacje dotyczące przetwarzania danych osobowych (RODO) zostaną opublikowane wkrótce.
        </p>
      </div>
    </main>
  );
}
