'use client';

import Link from 'next/link';
import { Header } from '../components/layout/header';
import { Footer } from '../components/layout/footer';
import { WizardCard } from '../components/wizard-card/WizardCard';
import { VantaBackground } from '../components/vanta-background/vanta-background';
import { useWizardFilters } from './use-wizard-filters';
import { TopicDropdown } from './topic-dropdown';
import { StarSvg } from './star-svg';
import '../components/page-transition/page-transition.css';
import './ogloszenia.css';

export default function OgloszeniaPage() {
  const filters = useWizardFilters();

  return (
    <div className="ogloszenia-page">
      <VantaBackground>
        <Header />
        <main className="ogloszenia-main">

          <div className="ogloszenia-header">
            <h1 className="ogloszenia-title">Nasi specjaliści</h1>
            <p className="ogloszenia-subtitle">
              Poznaj doświadczonych specjalistów oferujących różne formy konsultacji
            </p>
          </div>

          {/* ── Filtry ── */}
          <div className="ogl-filters">
            <div className="ogl-filters__row">
              <div className="ogl-filters__search">
                <svg className="ogl-filters__search-icon" width="15" height="15" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  className="ogl-filters__search-input"
                  placeholder="Szukaj po nazwie…"
                  value={filters.pendingName}
                  onChange={e => filters.setPendingName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && filters.applyFilters()}
                />
              </div>

              {filters.topics.length > 0 && (
                <TopicDropdown
                  topics={filters.topics}
                  selected={filters.pendingTopics}
                  onChange={filters.setPendingTopics}
                />
              )}

              <div className="ogl-filters__actions">
                <button
                  className={`ogl-filters__search-btn${filters.hasPendingChanges ? ' ogl-filters__search-btn--pulse' : ''}`}
                  onClick={filters.applyFilters}
                >
                  Szukaj
                </button>
                {filters.hasActiveFilters && (
                  <button className="ogl-filters__clear" onClick={filters.clearAll}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    Wyczyść
                  </button>
                )}
              </div>
            </div>

            <div className="ogl-rating-row">
              <span className="ogl-rating-row__label">Minimalna ocena:</span>
              <div className="ogl-rating-slider">
                <input
                  type="range"
                  min={0} max={5} step={0.5}
                  value={filters.pendingRating}
                  onChange={e => filters.setPendingRating(parseFloat(e.target.value))}
                  className="ogl-slider"
                  style={{ '--pct': `${(filters.pendingRating / 5) * 100}%` } as React.CSSProperties}
                />
                <div className="ogl-rating-slider__stars">
                  {[1, 2, 3, 4, 5].map(s => (
                    <StarSvg key={s} filled={s <= filters.pendingRating} />
                  ))}
                </div>
                <span className="ogl-rating-slider__val">
                  {filters.pendingRating === 0 ? 'Wszystkie' : `${filters.pendingRating}+`}
                </span>
              </div>
            </div>
          </div>

          {/* ── Lista ── */}
          <WizardList filters={filters} />

        </main>
      </VantaBackground>
      <Footer />
    </div>
  );
}

// ── Wizard list with loading/empty/results states ──

function WizardList({ filters }: { filters: ReturnType<typeof useWizardFilters> }) {
  if (filters.loading) {
    return (
      <div className="ogl-eye-wrap">
        <div className="pt-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.svg" alt="" className="pt-logo__img ogl-eye-wrap__img" />
        </div>
      </div>
    );
  }

  if (filters.wizards.length === 0) {
    return (
      <div className="ogl-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <p>Brak specjalistów pasujących do wybranych filtrów</p>
        {filters.hasActiveFilters && (
          <button className="ogl-filters__clear" onClick={filters.clearAll}>Wyczyść filtry</button>
        )}
      </div>
    );
  }

  return (
    <>
      <p className="ogl-count">
        {filters.hasActiveFilters ? `Znaleziono: ${filters.total}` : `Łącznie: ${filters.total}`}
      </p>
      <div className="ogloszenia-list">
        {filters.wizards.map(wizard => (
          <Link key={wizard.id} href={`/wrozka/${wizard.id}`} className="ogloszenia-link">
            <WizardCard wizard={wizard} />
          </Link>
        ))}
      </div>

      <div ref={filters.sentinelRef} className="ogl-sentinel" />

      {filters.loadingMore && (
        <div className="ogl-loading-cards">
          {[1, 2, 3].map(i => (
            <div key={i} className="ogl-loading-card">
              <div className="ogl-loading-card__eye">
                <div className="pt-logo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo-white.svg" alt="" className="pt-logo__img ogl-loading-card__img" />
                </div>
              </div>
              <div className="ogl-loading-card__body" />
            </div>
          ))}
        </div>
      )}
      {!filters.hasMore && filters.wizards.length > 0 && (
        <p className="ogl-end">Pokazano wszystkich specjalistów</p>
      )}
    </>
  );
}
