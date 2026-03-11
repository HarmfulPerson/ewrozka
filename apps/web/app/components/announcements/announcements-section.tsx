'use client';

import { useEffect, useState } from 'react';
import { apiGetWizards, WizardDto } from '../../lib/api';
import { WizardCard } from '../wizard-card/WizardCard';
import './announcements.css';

export function AnnouncementsSection() {
  const [wizards, setWizards] = useState<WizardDto[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <section className="announcements">
      <div className="announcements__inner">
        <h2 className="announcements__title">Nasze wróżki</h2>
        <p className="announcements__subtitle">
          Poznaj doświadczone wróżki oferujące różne formy konsultacji
        </p>

        {loading ? (
          <p className="announcements__loading">Ładowanie...</p>
        ) : (
          <ul className="announcements__list">
            {wizards.map((wizard) => (
              <li key={wizard.id}>
                <a href={`/wrozka/${wizard.id}`} className="announcements__card-link">
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
