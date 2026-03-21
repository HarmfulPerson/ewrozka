'use client';

import { ConnectStatusDto, CommissionTierDto } from '../../lib/api-payment';

interface BalanceCardProps {
  isConnected: boolean;
  connectStatus: ConnectStatusDto | null;
  availableFormatted: string;
  pendingFormatted: string;
  platformFeePercent: number | null;
  commissionTier: CommissionTierDto | null;
}

export function BalanceCard({
  isConnected,
  connectStatus,
  availableFormatted,
  pendingFormatted,
  platformFeePercent,
  commissionTier,
}: BalanceCardProps) {
  return (
    <div className="portfel-balance-card">
      <div className="portfel-balance-label">Dostępne do wypłaty</div>
      <div className="portfel-balance-amount">{availableFormatted}</div>
      {pendingFormatted && (
        <div className="portfel-balance-pending">
          Oczekujące: {pendingFormatted} (1–2 dni robocze)
        </div>
      )}
      {platformFeePercent != null && (
        <div className="portfel-balance-fee">
          Prowizja platformy: {platformFeePercent}%
          {commissionTier?.isSetByAdmin && (
            <span className="portfel-balance-fee__admin"> (ustawiona przez admina)</span>
          )}
        </div>
      )}
      {commissionTier && !commissionTier.isSetByAdmin && (
        <div className="portfel-tier-card">
          <div className="portfel-tier-card__row">
            <span className="portfel-tier-card__label">Spotkania w ostatnich {commissionTier.windowDays} dniach:</span>
            <span className="portfel-tier-card__value">{commissionTier.meetingsInWindow}</span>
          </div>
          <div className="portfel-tier-card__row">
            <span className="portfel-tier-card__label">Aktualna prowizja:</span>
            <span className="portfel-tier-card__value">{commissionTier.currentTier.feePercent}%</span>
          </div>
          {commissionTier.nextTier && (
            <div className="portfel-tier-card__next">
              Do progu {commissionTier.nextTier.feePercent}%: jeszcze {commissionTier.nextTier.minMeetings - commissionTier.meetingsInWindow} spotkań
            </div>
          )}
        </div>
      )}
      <div className="portfel-balance-info">
        Dane pobierane bezpośrednio ze Stripe
      </div>
    </div>
  );
}
