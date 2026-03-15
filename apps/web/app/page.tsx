'use client';

import './landing.css';
import { Header } from './components/layout/header';
import { Footer } from './components/layout/footer';
import { AnnouncementsSection } from './components/announcements/announcements-section';
import { VantaBackground } from './components/vanta-background/vanta-background';
import { LandingCtas } from './components/landing-ctas/landing-ctas';
import { useRevealOnScroll } from './hooks/useRevealOnScroll';

export default function HomePage() {
  const featuresRef = useRevealOnScroll<HTMLDivElement>(150);

  return (
    <div className="landing">
      <Header />
      <VantaBackground>
        <section className="landing__hero">
          <span className="landing__badge">Portal wróżb i konsultacji</span>
          <h1 className="landing__title">
            Połącz się z <span>wróżką</span>
            <br />
            lub
            <br />
            przyjmuj klientów online
          </h1>
          <p className="landing__subtitle">
            eWróżka to miejsce dla wróżek oferujących tarot, horoskopy i runy oraz
            dla klientów szukających rzetelnych konsultacji. Załóż konto i dołącz.
          </p>
          <LandingCtas />
        </section>
        <section className="landing__features" ref={featuresRef}>
          <div className="landing__feature">
            <span className="landing__feature-icon" aria-hidden>
              ✦
            </span>
            <h3>Dla wróżek</h3>
            <p>
              Oferuj konsultacje, zarządzaj kalendarzem i łącz się z klientami w
              jednym miejscu.
            </p>
          </div>
          <div className="landing__feature">
            <span className="landing__feature-icon" aria-hidden>
              ☆
            </span>
            <h3>Dla klientów</h3>
            <p>
              Znajdź sprawdzone wróżki, umów wizytę online i skorzystaj z tarotu,
              run lub horoskopu.
            </p>
          </div>
          <div className="landing__feature">
            <span className="landing__feature-icon" aria-hidden>
              ◈
            </span>
            <h3>Bezpiecznie</h3>
            <p>
              Osobne konta, przejrzyste profile i możliwość łączenia wróżki z
              klientem na jednej platformie.
            </p>
          </div>
        </section>
        <AnnouncementsSection />
      </VantaBackground>
      <Footer />
    </div>
  );
}
