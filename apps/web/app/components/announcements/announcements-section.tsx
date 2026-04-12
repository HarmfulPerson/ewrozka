'use client';

import { useEffect, useRef, useState } from 'react';
import { apiGetWizards, WizardDto } from '../../lib/api';
import { WizardCard } from '../wizard-card/WizardCard';
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll';
import './announcements.css';

export function AnnouncementsSection() {
  const [wizards, setWizards] = useState<WizardDto[]>([]);
  const [loading, setLoading] = useState(true);
  const listRef = useRevealOnScroll<HTMLUListElement>(100);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchWizards = async () => {
      try {
        const response = await apiGetWizards({ limit: 6 });
        setWizards(response.wizards);
      } catch (error) {
        console.error('Error fetching wizards:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWizards();
  }, []);

  // Reveal header
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.classList.add('revealed');
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="announcements">
      <div className="announcements__inner">
        <div ref={headerRef} className="announcements__header reveal-header">
          <h2 className="announcements__title">Nasi specjaliści</h2>
          <p className="announcements__subtitle">
            Poznaj doświadczonych specjalistów oferujących różne formy konsultacji
          </p>
        </div>

        {loading ? (
          <p className="announcements__loading">Ładowanie...</p>
        ) : (
          <ul className="announcements__list" ref={listRef}>
            {wizards.map((wizard) => (
              <li key={wizard.uid}>
                <a href={`/wrozka/${wizard.uid}`} className="announcements__card-link">
                  <WizardCard wizard={wizard} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
