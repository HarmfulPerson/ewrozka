import Link from 'next/link';
import '../regulamin/regulamin.css';

export const metadata = { title: 'Polityka prywatności – eWróżka' };

export default function PolitykaPrywatnosci() {
  return (
    <main className="legal-page">
      <div className="legal-page__inner">
        <Link href="/" className="legal-page__back">
          ← Wróć na stronę główną
        </Link>
        <h1 className="legal-page__title">Polityka prywatności</h1>

        <div className="legal-page__content">
          <p className="legal-page__updated">
            Ostatnia aktualizacja: luty 2025
          </p>

          <section>
            <h2>1. Administrator danych</h2>
            <p>
              Administratorem Twoich danych osobowych przetwarzanych w związku
              z korzystaniem z serwisu eWróżka (ewrozka.online i powiązane
              domeny) jest podmiot prowadzący platformę. W sprawach dotyczących
              ochrony danych osobowych możesz skontaktować się z nami korzystając
              z danych podanych w Serwisie (np. w stopce lub sekcji kontaktowej).
            </p>
          </section>

          <section>
            <h2>2. Zasady ogólne</h2>
            <p>
              Dbamy o Twoją prywatność i przetwarzamy dane osobowe zgodnie
              z Rozporządzeniem Parlamentu Europejskiego i Rady (UE) 2016/679
              (RODO) oraz ustawą o prawach konsumenta. Dane zbieramy wyłącznie
              w celach niezbędnych do świadczenia usług, poprawy działania
              Serwisu oraz w zakresie określonym niniejszą polityką.
            </p>
          </section>

          <section>
            <h2>3. Jakie dane zbieramy i w jakim celu</h2>

            <h3>3.1. Użytkownicy z kontem (Klienci i Wróżki)</h3>
            <ul>
              <li>
                <strong>Dane rejestracyjne:</strong> adres e-mail, hasło
                (przechowywane w postaci zahashowanej), nazwa użytkownika.
              </li>
              <li>
                <strong>Dane profilowe:</strong> zdjęcie profilowe, opis (bio),
                dla Wróżek – numer telefonu (niepublikowany), tematykę oferty,
                filmik wizytówkowy.
              </li>
              <li>
                <strong>Dane z logowania przez Google:</strong> adres e-mail,
                nazwa wyświetlana, zdjęcie profilowe z konta Google, identyfikator
                Google – w zakresie udostępnionym przez tę usługę.
              </li>
              <li>
                <strong>Cel:</strong> utworzenie i zarządzanie kontem, umożliwienie
                rezerwacji spotkań, prezentacja profilu, kontakt, realizacja
                płatności, weryfikacja e-mail.
              </li>
            </ul>

            <h3>3.2. Goście (osoby bez konta)</h3>
            <ul>
              <li>
                <strong>Dane rezerwacji:</strong> imię i nazwisko (lub pseudonim),
                adres e-mail, opcjonalnie numer telefonu, wiadomość do Wróżki,
                wybrany termin i oferta.
              </li>
              <li>
                <strong>Cel:</strong> realizacja rezerwacji, płatności,
                komunikacja dotycząca spotkania, umożliwienie udziału w spotkaniu
                online.
              </li>
            </ul>

            <h3>3.3. Dane techniczne i logi</h3>
            <p>
              Serwer może zapisywać adres IP, typ przeglądarki, datę i czas
              żądań oraz dane techniczne niezbędne do zapewnienia bezpieczeństwa
              i działania Serwisu. Logi przechowywane są przez czas wynikający
              z potrzeb technicznych i wymogów prawnych.
            </p>

            <h3>3.4. Dane płatnicze</h3>
            <p>
              Płatności obsługiwane są przez zewnętrznego operatora (Stripe).
              Nie przechowujemy pełnych numerów kart ani danych wrażliwych
              – przekazywane są one bezpośrednio do Stripe. Przechowujemy
              natomiast informacje niezbędne do rozliczeń (np. identyfikator
              transakcji, kwota, data, powiązanie z użytkownikiem).
            </p>

            <h3>3.5. Pliki cookie i magazyn lokalny</h3>
            <p>
              W celu działania Serwisu używamy plików cookie oraz lokalnego
              magazynu przeglądarki (localStorage) do zapisywania m.in.
              tokenu sesji, danych użytkownika zalogowanego oraz preferencji
              dotyczących plików cookie. Szczegóły znajdziesz w{' '}
              <Link href="/polityka-cookies">Polityce cookies</Link>.
            </p>
          </section>

          <section>
            <h2>4. Podstawy prawne przetwarzania</h2>
            <ul>
              <li>
                <strong>Wykonanie umowy (art. 6 ust. 1 lit. b RODO):</strong>{' '}
                rejestracja, konta, rezerwacje, spotkania, płatności.
              </li>
              <li>
                <strong>Zgoda (art. 6 ust. 1 lit. a RODO):</strong> newsletter
                (jeśli oferowany), pliki cookie analityczne i marketingowe
                (w zakresie zgody).
              </li>
              <li>
                <strong>Uzasadniony interes administratora (art. 6 ust. 1 lit. f
                RODO):</strong> bezpieczeństwo Serwisu, wykrywanie nadużyć,
                dochodzenie roszczeń, statystyki wewnętrzne, pliki cookie
                niezbędne technicznie.
              </li>
              <li>
                <strong>Wypełnienie obowiązku prawnego (art. 6 ust. 1 lit. c
                RODO):</strong> np. przechowywanie faktur i dokumentacji
                księgowej przez wymagany okres.
              </li>
            </ul>
          </section>

          <section>
            <h2>5. Odbiorcy danych i przekazywanie poza EOG</h2>
            <p>
              Twoje dane mogą być udostępniane:
            </p>
            <ul>
              <li>
                <strong>Dostawcom usług technicznych:</strong> hostingu,
                operatorowi płatności (Stripe – USA, w oparciu o standardowe
                klauzule umowne), usłudze wideokomunikacji (Daily.co – USA)
                niezbędnej do przeprowadzania spotkań online.
              </li>
              <li>
                <strong>Wróżkom:</strong> w zakresie koniecznym do realizacji
                spotkania (np. adres e-mail Gościa, wybrany termin) – dotyczy
                to rezerwacji składanych przez Klientów lub Gości.
              </li>
              <li>
                <strong>Klientom:</strong> dane profilowe Wróżek (zdjęcie, bio,
                tematykę, oceny) są publicznie widoczne w Serwisie.
              </li>
            </ul>
            <p>
              Przekazanie danych do państw outside Europejskiego Obszaru
              Gospodarczego odbywa się z zachowaniem odpowiednich zabezpieczeń
              (np. standardowe klauzule umowne zatwierdzone przez KE).
            </p>
          </section>

          <section>
            <h2>6. Okres przechowywania</h2>
            <ul>
              <li>
                <strong>Konto użytkownika:</strong> do momentu usunięcia konta
                lub wycofania zgody na przetwarzanie w celach kontowych, chyba
                że przepisy prawa wymagają dłuższego przechowywania.
              </li>
              <li>
                <strong>Dane Gościa (rezerwacja):</strong> przez czas niezbędny
                do realizacji spotkania oraz rozliczeń, a następnie zgodnie
                z obowiązującymi wymogami prawnymi (np. dokumentacja księgowa).
              </li>
              <li>
                <strong>Dane płatnicze i transakcyjne:</strong> zgodnie
                z wymogami podatkowymi i księgowymi (w Polsce min. 5 lat od
                końca roku podatkowego).
              </li>
              <li>
                <strong>Logi i dane techniczne:</strong> przez okres niezbędny
                do celów bezpieczeństwa, zwykle nie dłużej niż kilka miesięcy.
              </li>
              <li>
                <strong>Wnioski o rejestrację Wróżki (odrzucone):</strong>
                przez okres niezbędny do ewentualnego dochodzenia roszczeń
                lub wyjaśnienia sytuacji.
              </li>
            </ul>
          </section>

          <section>
            <h2>7. Twoje prawa</h2>
            <p>Na podstawie RODO przysługują Ci następujące prawa:</p>
            <ul>
              <li>prawo dostępu do swoich danych (art. 15 RODO),</li>
              <li>prawo do sprostowania danych (art. 16 RODO),</li>
              <li>prawo do usunięcia danych – „prawo do bycia zapomnianym” (art. 17 RODO),</li>
              <li>prawo do ograniczenia przetwarzania (art. 18 RODO),</li>
              <li>prawo do przenoszenia danych (art. 20 RODO),</li>
              <li>prawo wniesienia sprzeciwu wobec przetwarzania (art. 21 RODO),</li>
              <li>prawo do cofnięcia zgody w dowolnym momencie – bez wpływu
                na zgodność z prawem przetwarzania przed cofnięciem,</li>
              <li>prawo skargi do organu nadzorczego – Prezesa Urzędu Ochrony
                Danych Osobowych (UODO), ul. Stawki 2, 00-193 Warszawa.
            </li>
            </ul>
            <p>
              Aby skorzystać z tych praw, skontaktuj się z nami używając danych
              podanych w Serwisie. Odpowiemy w terminie do 30 dni.
            </p>
          </section>

          <section>
            <h2>8. Bezpieczeństwo</h2>
            <p>
              Stosujemy środki techniczne i organizacyjne zapewniające
              odpowiedni poziom bezpieczeństwa danych: szyfrowanie połączeń
              (HTTPS), hasła przechowywane w formie zahashowanej, ograniczenie
              dostępu do danych do upoważnionych osób, regularne przeglądy
              zabezpieczeń.
            </p>
          </section>

          <section>
            <h2>9. Spotkania online (wideo)</h2>
            <p>
              Spotkania odbywają się przez usługę wideokomunikacji (Daily.co).
              Treść rozmów (obraz i dźwięk) przekazywana jest bezpośrednio między
              uczestnikami za pośrednictwem tej usługi. Serwis nie nagrywa
              ani nie przechowuje treści spotkań. Warunki przetwarzania danych
              przez dostawcę wideokomunikacji określa jego polityka prywatności.
            </p>
          </section>

          <section>
            <h2>10. Powiadomienia w czasie rzeczywistym (WebSocket)</h2>
            <p>
              Serwis wykorzystuje technologię WebSocket do powiadamiania
              użytkowników (np. o nowych rezerwacjach, zmianach statusu).
              Połączenie wymaga identyfikacji użytkownika (token), w związku
              z czym przetwarzane są dane niezbędne do utrzymania sesji
              i dostarczenia powiadomień.
            </p>
          </section>

          <section>
            <h2>11. Zmiany polityki</h2>
            <p>
              Możemy okresowo aktualizować niniejszą politykę. O istotnych
              zmianach poinformujemy przez Serwis (np. baner, e-mail).
              Aktualna wersja jest zawsze dostępna na tej stronie.
            </p>
          </section>

          <section>
            <h2>12. Dodatkowe informacje</h2>
            <p>
              Informacje o plikach cookie znajdziesz w{' '}
              <Link href="/polityka-cookies">Polityce cookies</Link>.
              Zasady korzystania z Serwisu opisuje{' '}
              <Link href="/regulamin">Regulamin</Link>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
