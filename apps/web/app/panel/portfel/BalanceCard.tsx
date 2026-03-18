'use client';

import { ConnectStatusDto, CommissionTierDto } from '../../lib/api-payment';

interface BalanceCardProps {
  isConnected: boolean;
  connectStatus: ConnectStatusDto | null;
  balanceFormatted: string;
  platformFeePercent: number | null;
  commissionTier: CommissionTierDto | null;
}

export function BalanceCard({
  isConnected,
  connectStatus,
  balanceFormatted,
  platformFeePercent,
  commissionTier,
}: BalanceCardProps) {
  return (
    <div className="portfel-balance-card">
      <div className="portfel-balance-label">Saldo Stripe</div>
      <div className="portfel-balance-amount">
        {isConnected
          ? `${((connectStatus?.stripeTotalGrosze ?? 0) / 100).toFixed(2)} zł`
          : balanceFormatted}
      </div>
      {isConnected && (connectStatus?.stripeAvailableGrosze ?? 0) > 0 && (connectStatus?.stripePendingGrosze ?? 0) > 0 && (
        <div className="portfel-balance-pending">
          {((connectStatus?.stripeAvailableGrosze ?? 0) / 100).toFixed(2)} zł dostępne · {((connectStatus?.stripePendingGrosze ?? 0) / 100).toFixed(2)} zł oczekujące
        </div>
      )}
      {isConnected && (connectStatus?.stripeAvailableGrosze ?? 0) === 0 && (connectStatus?.stripePendingGrosze ?? 0) > 0 && (
        <div className="portfel-balance-pending">
          Wszystkie środki oczekujące (1–2 dni robocze)
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
