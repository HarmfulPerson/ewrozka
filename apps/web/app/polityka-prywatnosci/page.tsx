import Link from 'next/link';
import '../regulamin/regulamin.css';

export const metadata = { title: 'Polityka prywatności – eWróżka' };

export default function PolitykaPrywatnosci() {
  return (
    <main className="legal-page">
      <div className="legal-page__inner">
        <Link href="/" className="legal-page__back">← Wróć na stronę główną</Link>
        <h1 className="legal-page__title">Polityka prywatności</h1>
        <p className="legal-page__placeholder">
          Treść polityki prywatności zostanie opublikowana wkrótce.
        </p>
      </div>
    </main>
  );
}
