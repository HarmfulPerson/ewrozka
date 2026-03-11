'use client';

import Link from 'next/link';
import '../regulamin/regulamin.css';
import './polityka-cookies.css';
import { openCookieSettings } from '../components/cookie-consent/CookieConsent';

export default function PolitykaCookies() {
  return (
    <main className="legal-page">
      <div className="legal-page__inner">
        <Link href="/" className="legal-page__back">← Wróć na stronę główną</Link>
        <h1 className="legal-page__title">Polityka cookies</h1>

        <div className="cookies-content">

          <section className="cookies-section">
            <h2>1. Czym są pliki cookie?</h2>
            <p>
              Pliki cookie (ciasteczka) to małe pliki tekstowe zapisywane na Twoim urządzeniu
              (komputerze, tablecie, smartfonie) przez przeglądarkę internetową w momencie
              odwiedzania witryny. Służą do zapamiętywania informacji o Twojej wizycie, co
              ułatwia korzystanie z serwisu przy kolejnych odwiedzinach.
            </p>
          </section>

          <section className="cookies-section">
            <h2>2. Kto jest administratorem danych?</h2>
            <p>
              Administratorem plików cookie jest właściciel serwisu <strong>eWróżka.pl</strong>.
              Dane przetwarzane są zgodnie z Rozporządzeniem Parlamentu Europejskiego i Rady (UE)
              2016/679 (RODO) oraz ustawą z dnia 16 lipca 2004 r. Prawo telekomunikacyjne.
            </p>
          </section>

          <section className="cookies-section">
            <h2>3. Jakie pliki cookie stosujemy?</h2>

            <div className="cookies-table-wrap">
              <table className="cookies-table">
                <thead>
                  <tr>
                    <th>Kategoria</th>
                    <th>Cel</th>
                    <th>Czas przechowywania</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span className="cookies-badge cookies-badge--required">Niezbędne</span></td>
                    <td>
                      Zapewniają prawidłowe działanie serwisu — obsługa sesji,
                      logowanie, koszyk, preferencje języka, zabezpieczenia CSRF.
                    </td>
                    <td>Sesja / do 1 roku</td>
                  </tr>
                  <tr>
                    <td><span className="cookies-badge cookies-badge--analytics">Analityczne</span></td>
                    <td>
                      Zbierają anonimowe informacje o sposobie korzystania z serwisu
                      (liczba wizyt, czas spędzony na stronie, źródło ruchu). Używamy
                      m.in. Google Analytics.
                    </td>
                    <td>Do 26 miesięcy</td>
                  </tr>
                  <tr>
                    <td><span className="cookies-badge cookies-badge--marketing">Marketingowe</span></td>
                    <td>
                      Umożliwiają wyświetlanie spersonalizowanych reklam i śledzenie
                      skuteczności kampanii reklamowych w serwisach zewnętrznych
                      (Facebook Pixel, Google Ads).
                    </td>
                    <td>Do 90 dni</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="cookies-section">
            <h2>4. Podstawa prawna</h2>
            <p>
              Przetwarzanie danych w oparciu o pliki cookie analityczne i marketingowe
              odbywa się wyłącznie na podstawie Twojej dobrowolnej zgody (art. 6 ust. 1 lit. a RODO).
              Pliki cookie niezbędne są przetwarzane na podstawie uzasadnionego interesu
              administratora (art. 6 ust. 1 lit. f RODO) jako niezbędne do świadczenia usługi.
            </p>
          </section>

          <section className="cookies-section">
            <h2>5. Zarządzanie preferencjami</h2>
            <p>
              W każdej chwili możesz zmienić swoje preferencje dotyczące plików cookie,
              klikając poniższy przycisk lub zmieniając ustawienia swojej przeglądarki.
              Wycofanie zgody nie wpłynie na zgodność z prawem przetwarzania, które miało
              miejsce przed jej wycofaniem.
            </p>
            <button
              type="button"
              className="cookies-settings-btn"
              onClick={openCookieSettings}
            >
              ⚙ Zmień preferencje cookies
            </button>
          </section>

          <section className="cookies-section">
            <h2>6. Ustawienia przeglądarki</h2>
            <p>
              Możesz również zarządzać plikami cookie bezpośrednio w ustawieniach swojej
              przeglądarki. Poniżej znajdziesz linki do instrukcji dla najpopularniejszych
              przeglądarek:
            </p>
            <ul className="cookies-browser-list">
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/pl/kb/ulepszona-ochrona-przed-sledzeniem" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/pl-pl/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari</a></li>
              <li><a href="https://support.microsoft.com/pl-pl/microsoft-edge/usuwanie-plik%C3%B3w-cookie-w-przegl%C4%85darce-microsoft-edge" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
            </ul>
            <p>
              Pamiętaj, że wyłączenie plików cookie niezbędnych może uniemożliwić
              prawidłowe korzystanie z serwisu.
            </p>
          </section>

          <section className="cookies-section">
            <h2>7. Prawa użytkownika</h2>
            <p>
              Na podstawie RODO przysługują Ci następujące prawa:
            </p>
            <ul className="cookies-rights-list">
              <li>prawo dostępu do swoich danych,</li>
              <li>prawo do sprostowania danych,</li>
              <li>prawo do usunięcia danych („prawo do bycia zapomnianym"),</li>
              <li>prawo do ograniczenia przetwarzania,</li>
              <li>prawo do przenoszenia danych,</li>
              <li>prawo wniesienia sprzeciwu wobec przetwarzania,</li>
              <li>prawo do cofnięcia zgody w dowolnym momencie.</li>
            </ul>
            <p>
              W sprawach związanych z ochroną danych osobowych możesz kontaktować się
              z administratorem serwisu oraz składać skargi do Prezesa Urzędu Ochrony
              Danych Osobowych (UODO), ul. Stawki 2, 00-193 Warszawa.
            </p>
          </section>

          <section className="cookies-section">
            <h2>8. Zmiany w polityce cookie</h2>
            <p>
              Zastrzegamy sobie prawo do zmiany niniejszej polityki. Wszelkie zmiany
              wejdą w życie z chwilą opublikowania zaktualizowanej wersji na tej stronie.
              O istotnych zmianach poinformujemy użytkowników wyświetlając ponownie
              baner cookie.
            </p>
            <p className="cookies-updated">
              Ostatnia aktualizacja: luty 2026
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
