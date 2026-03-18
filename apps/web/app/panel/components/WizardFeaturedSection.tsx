'use client';

import type { FeaturedStatusDto, FeaturedConfigDto } from '../../lib/api-payment';

interface WizardFeaturedSectionProps {
  featuredStatus: FeaturedStatusDto;
  featuredConfig: FeaturedConfigDto | null;
  featuredStatusLoading: boolean;
  onBuyClick: () => void;
}

export function WizardFeaturedSection({
  featuredStatus,
  featuredConfig,
  featuredStatusLoading,
  onBuyClick,
}: WizardFeaturedSectionProps) {
  if (featuredStatus === null) return null;

  if (featuredStatus.isFeatured) {
    return (
      <div className="dashboard__featured dashboard__featured--active dashboard__featured--compact">
        <div className="dashboard__featured-icon">✦</div>
        <div className="dashboard__featured-body">
          <p className="dashboard__featured-title">Twój profil jest wyróżniony!</p>
          <p className="dashboard__featured-desc">
            {featuredStatus.expiresAt && (
              <>
                Wygasa:{' '}
                <strong>
                  {new Date(featuredStatus.expiresAt).toLocaleString('pl-PL', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </strong>
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard__featured dashboard__featured--compact">
      <div className="dashboard__featured-icon">✦</div>
      <div className="dashboard__featured-body">
        <p className="dashboard__featured-title">Wyróżnij swój profil</p>
        <p className="dashboard__featured-desc">
          {featuredConfig && (
            <>{featuredConfig.durationHours}h · {(featuredConfig.priceGrosze / 100).toFixed(2).replace('.', ',')} zł</>
          )}
        </p>
      </div>
      <button
        className="dashboard__featured-btn"
        onClick={onBuyClick}
        disabled={featuredStatusLoading}
      >
        ✦ Kup
      </button>
    </div>
  );
}
