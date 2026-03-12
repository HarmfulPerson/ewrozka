import Link from 'next/link';
import './regulamin.css';

export const metadata = { title: 'Regulamin – eWróżka' };

export default function RegulaminPage() {
  return (
    <main className="legal-page">
      <div className="legal-page__inner">
        <Link href="/" className="legal-page__back">
          ← Wróć na stronę główną
        </Link>
        <h1 className="legal-page__title">Regulamin serwisu eWróżka</h1>

        <div className="legal-page__content">
          <p className="legal-page__updated">
            Ostatnia aktualizacja: luty 2025
          </p>

          <section>
            <h2>§1. Postanowienia ogólne</h2>
            <ol>
              <li>
                Niniejszy regulamin określa zasady korzystania z platformy internetowej
                eWróżka (serwis dostępny pod adresem ewrozka.online oraz powiązanymi
                domenami), prowadzonej przez administratora platformy (dalej: „Serwis”).
              </li>
              <li>
                Serwis umożliwia łączenie osób oferujących usługi wróżbiarskie, w tym
                konsultacje tarot, horoskopy i runy (dalej: „Wróżki”), z osobami
                poszukującymi takich usług (dalej: „Klienci”), poprzez rezerwację
                i przeprowadzanie spotkań online.
              </li>
              <li>
                Korzystanie z Serwisu jest dobrowolne. Rejestracja i korzystanie
                z funkcji Serwisu oznacza akceptację niniejszego regulaminu.
              </li>
              <li>
                Administrator zastrzega sobie prawo do zmiany regulaminu. O zmianach
                użytkownicy zostaną poinformowani z dwutygodniowym wyprzedzeniem
                (drogą mailową lub ogłoszeniem w Serwisie). Kontynuowanie korzystania
                po wejściu zmian w życie traktowane jest jako ich akceptacja.
              </li>
            </ol>
          </section>

          <section>
            <h2>§2. Definicje</h2>
            <ul>
              <li>
                <strong>Spotkanie</strong> – sesja konsultacyjna online (połączenie
                audiowizualne) między Wróżką a Klientem, odbywająca się w terminie
                uzgodnionym w Serwisie.
              </li>
              <li>
                <strong>Ogłoszenie</strong> – oferta Wróżki zawierająca opis usługi,
                cenę, czas trwania i inne warunki.
              </li>
              <li>
                <strong>Rezerwacja</strong> – zgłoszenie Klienta lub Gościa dotyczące
                chęci odbycia Spotkania w konkretnym terminie.
              </li>
              <li>
                <strong>Gość</strong> – osoba rezerwująca Spotkanie bez utworzenia
                konta w Serwisie.
              </li>
              <li>
                <strong>Prowizja platformy</strong> – opłata potrącana przez Serwis
                z kwoty Spotkania, przekazywana Wróżce po odjęciu tej prowizji.
              </li>
              <li>
                <strong>Wyróżnienie</strong> – płatna opcja umożliwiająca Wróżce
                zwiększenie widoczności profilu na liście Serwisu.
              </li>
            </ul>
          </section>

          <section>
            <h2>§3. Rejestracja i konta użytkowników</h2>
            <ol>
              <li>
                <strong>Klienci.</strong> Rejestracja wymaga podania prawidłowego
                adresu e-mail, hasła oraz akceptacji regulaminu. Klient zobowiązuje
                się do potwierdzenia adresu e-mail. Konto można utworzyć także
                za pośrednictwem dostawcy zewnętrznego (np. Google) w zakresie
                przewidzianym przez Serwis.
              </li>
              <li>
                <strong>Wróżki.</strong> Aby uzyskać rolę Wróżki, należy złożyć
                wniosek o rejestrację (formularz, dane kontaktowe, opis oferty,
                zdjęcie, tematykę). Administrator Serwisu weryfikuje wnioski
                i w sposób indywidualny decyduje o przyjęciu lub odrzuceniu.
                O decyzji Wróżka zostanie powiadomiona pocztą elektroniczną.
              </li>
              <li>
                Użytkownik odpowiada za zachowanie poufności danych logowania
                i za działania wykonane z wykorzystaniem swojego konta.
              </li>
              <li>
                Serwis może zawiesić lub usunąć konto w przypadku naruszenia
                regulaminu, działań niezgodnych z prawem lub dobrymi obyczajami.
              </li>
            </ol>
          </section>

          <section>
            <h2>§4. Zasady rezerwacji i przeprowadzania Spotkań</h2>
            <ol>
              <li>
                Klient lub Gość wybiera Wróżkę i termin, a następnie składa
                Rezerwację. Wróżka może Rezerwację zaakceptować lub odrzucić.
              </li>
              <li>
                Po zaakceptowaniu Rezerwacji Klient/Gość jest zobowiązany
                do dokonania płatności w formie przewidzianej przez Serwis
                (Stripe, karty płatnicze). Spotkanie uznaje się za potwierdzone
                dopiero po zaksięgowaniu płatności.
              </li>
              <li>
                Spotkania odbywają się online, za pośrednictwem narzędzi
                wideointegracji wskazanych w Serwisie. Użytkownik zobowiązuje się
                do zapewnienia sprzętu, łącza i warunków umożliwiających udział
                w Spotkaniu.
              </li>
              <li>
                Nieobecność na Spotkaniu w umówionym terminie bez wcześniejszego
                odwołania może skutkować utratą opłaty bez prawa do zwrotu.
              </li>
              <li>
                Po zakończeniu Spotkania Klient może wystawić ocenę i opcjonalnie
                komentarz. Oceny i komentarze są publicznie widoczne w profilu
                Wróżki.
              </li>
            </ol>
          </section>

          <section>
            <h2>§5. Płatności i prowizje</h2>
            <ol>
              <li>
                Ceny Spotkań ustalane są indywidualnie przez Wróżkę w Ogłoszeniach.
                Wszystkie kwoty podane są w złotówkach (PLN), brutto.
              </li>
              <li>
                Serwis pobiera od Wróżki Prowizję platformy od każdego zakończonego
                płatnego Spotkania. Procent prowizji określa Administrator (domyślnie
                20%), z możliwością jego zmiany w zależności od aktywności Wróżki
                lub indywidualnych ustaleń. Wróżka otrzymuje kwotę pomniejszoną
                o Prowizję platformy.
              </li>
              <li>
                Płatności obsługiwane są przez zewnętrznego operatora płatności
                (Stripe). Regulamin operatora stanowi uzupełnienie niniejszego
                regulaminu w zakresie realizacji płatności.
              </li>
              <li>
                Wróżka zobowiązana jest do połączenia konta Serwisu z kontem
                płatniczym (Stripe Connect) w celu przyjmowania wypłat. Wypłata
                środków odbywa się na żądanie Wróżki, przy minimalnej kwocie
                5,00 zł. Czas realizacji wypłaty wynosi zazwyczaj 1–7 dni roboczych,
                zgodnie z zasadami operatora płatności.
              </li>
            </ol>
          </section>

          <section>
            <h2>§6. Wyróżnienie i dodatkowe usługi</h2>
            <ol>
              <li>
                Usługa Wyróżnienia pozwala Wróżce na zwiększenie widoczności profilu.
                Warunki, cennik i czas trwania Wyróżnienia określa Serwis na stronie
                oferty.
              </li>
              <li>
                Zakup Wyróżnienia jest płatny z góry i podlega zasadom sprzedaży
                wskazanym w Serwisie. Zwrot środków za Wyróżnienie możliwy jest
                wyłącznie w przypadkach przewidzianych przez prawo konsumenckie
                lub na zasadach określonych przez Serwis.
              </li>
            </ol>
          </section>

          <section>
            <h2>§7. Odpowiedzialność i wyłączenia</h2>
            <ol>
              <li>
                Serwis pełni rolę pośrednika łączącego Wróżki z Klientami i nie
                ponosi odpowiedzialności za treść Spotkań, rady ani sposób
                przeprowadzenia konsultacji. Odpowiedzialność za treści
                przekazywane podczas Spotkań oraz ich zgodność z prawem ponosi
                Wróżka.
              </li>
              <li>
                Serwis nie gwarantuje efektów usług świadczonych przez Wróżki.
                Usługi wróżbiarskie i konsultacyjne mają charakter rozrywkowy
                i informacyjny.
              </li>
              <li>
                Serwis dokłada starań, aby platforma działała nieprzerwanie,
                jednak nie ponosi odpowiedzialności za ewentualne przerwy spowodowane
                awariami technicznymi, działaniami operatorów zewnętrznych
                (np. dostawców płatności, usług wideo) lub siłą wyższą.
              </li>
              <li>
                W zakresie nieuregulowanym niniejszym regulaminem mają zastosowanie
                przepisy prawa polskiego, w szczególności ustawy o prawach
                konsumenta i Kodeksu cywilnego.
              </li>
            </ol>
          </section>

          <section>
            <h2>§8. Ochrona danych osobowych i cookies</h2>
            <p>
              Zasady przetwarzania danych osobowych oraz korzystania z plików
              cookies opisane są w{' '}
              <Link href="/polityka-prywatnosci">Polityce prywatności</Link> oraz w{' '}
              <Link href="/polityka-cookies">Polityce cookies</Link>. Rejestrując się,
              użytkownik akceptuje wskazane tam zasady.
            </p>
          </section>

          <section>
            <h2>§9. Treści użytkowników i moderacja</h2>
            <ol>
              <li>
                Użytkownik nie może zamieszczać treści niezgodnych z prawem,
                naruszających dobra osobiste third parties, wulgarnych, obraźliwych
                lub promujących nielegalne działania.
              </li>
              <li>
                Zdjęcia i filmiki profilowe Wróżki (w tym filmik wizytówkowy) mogą
                podlegać weryfikacji przez Administratora przed publikacją.
                Odrzucenie treści nieuznanych za odpowiednie nie stanowi naruszenia
                regulaminu przez Serwis.
              </li>
            </ol>
          </section>

          <section>
            <h2>§10. Reklamacje i kontakt</h2>
            <ol>
              <li>
                Reklamacje dotyczące działania platformy, płatności lub konta
                należy kierować na adres e-mail wskazany w Serwisie (np. w stopce
                lub sekcji kontaktowej).
              </li>
              <li>
                Reklamacje rozpatrywane są w terminie do 14 dni roboczych.
              </li>
              <li>
                W sprawach spornych wynikających z niniejszego regulaminu właściwy
                jest sąd zgodnie z przepisami prawa polskiego. W przypadku Konsumentów
                zachowują zastosowanie przepisy o uprawnieniach konsumentów,
                w tym o możliwości skorzystania z pozasądowych sposobów rozpatrywania
                reklamacji (np. mediation).
              </li>
            </ol>
          </section>

          <section>
            <h2>§11. Postanowienia końcowe</h2>
            <p>
              Regulamin wchodzi w życie z chwilą publikacji. Wszelkie pytania
              dotyczące regulaminu należy kierować do Administratora Serwisu
              przez formularz kontaktowy lub adres e-mail podany w Serwisie.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
