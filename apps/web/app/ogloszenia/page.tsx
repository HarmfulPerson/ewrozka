'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from '../components/layout/header';
import { Footer } from '../components/layout/footer';
import { apiGetWizards, apiGetTopics, WizardDto, TopicDto } from '../lib/api';
import { WizardCard } from '../components/wizard-card/WizardCard';
import { VantaBackground } from '../components/vanta-background/vanta-background';
import '../components/page-transition/page-transition.css';
import './ogloszenia.css';

const PAGE_SIZE = 12;

// ── Mini Star SVG ─────────────────────────────────────────────────────────────
function StarSvg({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <polygon
        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"
        fill={filled ? '#fbbf24' : 'none'}
        stroke={filled ? '#fbbf24' : 'rgba(251,191,36,0.3)'}
        strokeWidth="1.5"
      />
    </svg>
  );
}

// ── Multi-select dropdown ─────────────────────────────────────────────────────
function TopicDropdown({
  topics,
  selected,
  onChange,
}: {
  topics: TopicDto[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (id: number) => {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };

  const label =
    selected.length === 0
      ? 'Specjalizacje'
      : selected.length === 1
      ? topics.find(t => t.id === selected[0])?.name ?? 'Specjalizacje'
      : `Specjalizacje (${selected.length})`;

  return (
    <div className="ogl-dropdown" ref={ref}>
      <button
        type="button"
        className={`ogl-dropdown__trigger${selected.length > 0 ? ' ogl-dropdown__trigger--active' : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/>
        </svg>
        <span>{label}</span>
        <svg
          className={`ogl-dropdown__chevron${open ? ' ogl-dropdown__chevron--open' : ''}`}
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="ogl-dropdown__menu">
          {topics.map(t => (
            <label key={t.id} className="ogl-dropdown__item">
              <input
                type="checkbox"
                checked={selected.includes(t.id)}
                onChange={() => toggle(t.id)}
                className="ogl-dropdown__checkbox"
              />
              <span className={`ogl-dropdown__checkmark${selected.includes(t.id) ? ' ogl-dropdown__checkmark--checked' : ''}`}>
                {selected.includes(t.id) && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </span>
              <span className="ogl-dropdown__label">{t.name}</span>
            </label>
          ))}
          {selected.length > 0 && (
            <button
              type="button"
              className="ogl-dropdown__clear"
              onClick={() => { onChange([]); setOpen(false); }}
            >
              Wyczyść
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Strona główna ──────────────────────────────────────────────────────────────
export default function OgloszeniaPage() {
  const [wizards, setWizards]         = useState<WizardDto[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset]           = useState(0);
  const [topics, setTopics]           = useState<TopicDto[]>([]);

  // ── Stany "pending" (nie wysłane do serwera) ────────────────────────
  const [pendingName, setPendingName]       = useState('');
  const [pendingTopics, setPendingTopics]   = useState<number[]>([]);
  const [pendingRating, setPendingRating]   = useState(0);

  // ── Stany "active" (aktualnie użyte filtry) ─────────────────────────
  const [activeName, setActiveName]         = useState('');
  const [activeTopics, setActiveTopics]     = useState<number[]>([]);
  const [activeRating, setActiveRating]     = useState(0);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = wizards.length < total;

  const hasActiveFilters = activeName !== '' || activeTopics.length > 0 || activeRating > 0;
  const hasPendingChanges =
    pendingName !== activeName ||
    pendingRating !== activeRating ||
    JSON.stringify(pendingTopics.slice().sort()) !== JSON.stringify(activeTopics.slice().sort());

  // ── Tematy ──────────────────────────────────────────────────────────
  useEffect(() => {
    apiGetTopics()
      .then(r => setTopics(Array.isArray(r) ? r : []))
      .catch(() => {});
  }, []);

  // ── Fetch ────────────────────────────────────────────────────────────
  const fetchWizards = useCallback(async (
    currentOffset: number,
    name: string,
    topicIds: number[],
    minRating: number,
    append: boolean,
  ) => {
    if (currentOffset === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await apiGetWizards({
        limit: PAGE_SIZE,
        offset: currentOffset,
        name: name || undefined,
        topicIds: topicIds.length > 0 ? topicIds : undefined,
        minRating: minRating > 0 ? minRating : undefined,
      });
      setWizards(prev => append ? [...prev, ...res.wizards] : res.wizards);
      setTotal(res.total ?? res.wizardsCount);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchWizards(0, '', [], 0, false);
    setOffset(PAGE_SIZE);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Infinite scroll ──────────────────────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore && !loading) {
          setLoadingMore(true);
          fetchWizards(offset, activeName, activeTopics, activeRating, true)
            .then(() => setOffset(o => o + PAGE_SIZE));
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, offset, activeName, activeTopics, activeRating, fetchWizards]);

  // ── Zastosowanie filtrów ─────────────────────────────────────────────
  const applyFilters = () => {
    setActiveName(pendingName);
    setActiveTopics(pendingTopics);
    setActiveRating(pendingRating);
    setWizards([]);
    setOffset(PAGE_SIZE);
    fetchWizards(0, pendingName, pendingTopics, pendingRating, false);
  };

  const clearAll = () => {
    setPendingName('');
    setPendingTopics([]);
    setPendingRating(0);
    setActiveName('');
    setActiveTopics([]);
    setActiveRating(0);
    setWizards([]);
    setOffset(PAGE_SIZE);
    fetchWizards(0, '', [], 0, false);
  };

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

        {/* ── Panel filtrów ─────────────────────────────────────────── */}
        <div className="ogl-filters">
          <div className="ogl-filters__row">

            {/* Szukaj po nazwie */}
            <div className="ogl-filters__search">
              <svg className="ogl-filters__search-icon" width="15" height="15" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                className="ogl-filters__search-input"
                placeholder="Szukaj po nazwie…"
                value={pendingName}
                onChange={e => setPendingName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyFilters()}
              />
            </div>

            {/* Multi-dropdown tematów */}
            {topics.length > 0 && (
              <TopicDropdown
                topics={topics}
                selected={pendingTopics}
                onChange={setPendingTopics}
              />
            )}

            {/* Szukaj + Wyczyść */}
            <div className="ogl-filters__actions">
              <button
                className={`ogl-filters__search-btn${hasPendingChanges ? ' ogl-filters__search-btn--pulse' : ''}`}
                onClick={applyFilters}
              >
                Szukaj
              </button>
              {hasActiveFilters && (
                <button className="ogl-filters__clear" onClick={clearAll}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Wyczyść
                </button>
              )}
            </div>
          </div>

          {/* Suwak oceny */}
          <div className="ogl-rating-row">
            <span className="ogl-rating-row__label">Minimalna ocena:</span>

            <div className="ogl-rating-slider">
              <input
                type="range"
                min={0}
                max={5}
                step={0.5}
                value={pendingRating}
                onChange={e => setPendingRating(parseFloat(e.target.value))}
                className="ogl-slider"
                style={{ '--pct': `${(pendingRating / 5) * 100}%` } as React.CSSProperties}
              />
              <div className="ogl-rating-slider__stars">
                {[1, 2, 3, 4, 5].map(s => (
                  <StarSvg key={s} filled={s <= pendingRating} />
                ))}
              </div>
              <span className="ogl-rating-slider__val">
                {pendingRating === 0 ? 'Wszystkie' : `${pendingRating}+`}
              </span>
            </div>
          </div>
        </div>

        {/* ── Lista specjalistów ──────────────────────────────────────────── */}
        {loading ? (
          <div className="ogl-eye-wrap">
            <div className="pt-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-white.svg" alt="" className="pt-logo__img ogl-eye-wrap__img" />
            </div>
          </div>
        ) : wizards.length === 0 ? (
          <div className="ogl-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <p>Brak specjalistów pasujących do wybranych filtrów</p>
            {hasActiveFilters && (
              <button className="ogl-filters__clear" onClick={clearAll}>Wyczyść filtry</button>
            )}
          </div>
        ) : (
          <>
            <p className="ogl-count">
              {hasActiveFilters ? `Znaleziono: ${total}` : `Łącznie: ${total}`}
            </p>
            <div className="ogloszenia-list">
              {wizards.map(wizard => (
                <Link key={wizard.id} href={`/wrozka/${wizard.id}`} className="ogloszenia-link">
                  <WizardCard wizard={wizard} />
                </Link>
              ))}
            </div>

            <div ref={sentinelRef} className="ogl-sentinel" />

            {loadingMore && (
              <div className="ogl-loading-cards">
                {[1, 2, 3].map((i) => (
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
            {!hasMore && wizards.length > 0 && (
              <p className="ogl-end">Pokazano wszystkich specjalistów</p>
            )}
          </>
        )}

      </main>
      </VantaBackground>
      <Footer />
    </div>
  );
}
