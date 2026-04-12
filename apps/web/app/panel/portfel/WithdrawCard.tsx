'use client';

import { ConnectStatusDto, WithdrawalDto } from '../../lib/api-payment';

function formatWithdrawalStatus(status: string) {
  switch (status) {
    case 'processing': return { label: 'W realizacji', color: '#f59e0b' };
    case 'completed':  return { label: 'Wypłacono', color: '#10b981' };
    case 'failed':     return { label: 'Błąd', color: '#ef4444' };
    default:           return { label: status, color: 'var(--text-secondary)' };
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

interface WithdrawCardProps {
  connectStatus: ConnectStatusDto | null;
  isPending: boolean;
  withdrawable: number;
  withdrawAmount: string;
  setWithdrawAmount: (v: string) => void;
  withdrawing: boolean;
  withdrawError: string | null;
  withdrawSuccess: string | null;
  withdrawals: WithdrawalDto[];
  withdrawalsCurrentPage: number;
  withdrawalsTotalPages: number;
  onWithdrawalsPageChange: (page: number) => void;
  handleStartOnboarding: () => void;
  handleWithdraw: () => void;
}

export function WithdrawCard({
  connectStatus,
  isPending,
  withdrawable,
  withdrawAmount,
  setWithdrawAmount,
  withdrawing,
  withdrawError,
  withdrawSuccess,
  withdrawals,
  withdrawalsCurrentPage,
  withdrawalsTotalPages,
  onWithdrawalsPageChange,
  handleStartOnboarding,
  handleWithdraw,
}: WithdrawCardProps) {
  return (
    <div className="portfel-withdraw-card">
      <div className="portfel-withdraw-card__title">Wypłata środków</div>

      {!connectStatus?.connected ? (
        <div className="portfel-setup-inline">
          <p className="portfel-setup-inline__desc">
            Połącz konto bankowe przez Stripe, aby wypłacać zarobki.
          </p>
          <button className="portfel-action-btn" onClick={handleStartOnboarding}>
            Skonfiguruj konto →
          </button>
        </div>
      ) : isPending ? (
        <div className="portfel-setup-inline">
          <p className="portfel-setup-inline__desc">
            ⏳ Konto w trakcie weryfikacji. Uzupełnij brakujące dane.
          </p>
          <button className="portfel-action-btn portfel-action-btn--secondary" onClick={handleStartOnboarding}>
            Uzupełnij dane →
          </button>
        </div>
      ) : (
        <>
          {withdrawError   && <div className="portfel-msg portfel-msg--error">{withdrawError}</div>}
          {withdrawSuccess && <div className="portfel-msg portfel-msg--success">{withdrawSuccess}</div>}

          <div className="portfel-withdraw-available">
            <span className="portfel-withdraw-available__label">Dostępne do wypłaty</span>
            <span className="portfel-withdraw-available__value">{withdrawable.toFixed(2)} zł</span>
          </div>

          <div className="portfel-withdraw-row">
            <div className="portfel-withdraw-input-group">
              <input
                type="number"
                min="5"
                step="0.01"
                max={withdrawable.toFixed(2)}
                placeholder="Kwota"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="portfel-withdraw-input"
              />
              <span className="portfel-withdraw-currency">zł</span>
            </div>
            <button
              className="portfel-action-btn"
              onClick={handleWithdraw}
              disabled={withdrawing || !withdrawAmount || (connectStatus?.withdrawableGrosze ?? 0) < 500}
            >
              {withdrawing ? 'Zlecam...' : 'Wypłać'}
            </button>
          </div>
          <p className="portfel-withdraw-hint">min. 5 zł · środki w ciągu 1–7 dni roboczych</p>

          {(connectStatus?.withdrawableGrosze ?? 0) === 0 && (connectStatus?.stripePendingGrosze ?? 0) > 0 && (
            <p className="portfel-msg portfel-msg--info">
              ⏳ Masz <strong>{((connectStatus?.stripePendingGrosze ?? 0) / 100).toFixed(2)} zł</strong> oczekujących.
              Dostępne po 1–2 dniach roboczych.
            </p>
          )}

          {withdrawals.length > 0 && (
            <div className="portfel-withdrawals-mini">
              <div className="portfel-withdrawals-mini__title">Ostatnie wypłaty</div>
              {withdrawals.map((w) => {
                const { label, color } = formatWithdrawalStatus(w.status);
                return (
                  <div key={w.uid} className="portfel-withdrawals-mini__row">
                    <span className="portfel-withdrawals-mini__amount">−{w.amountFormatted}</span>
                    <span className="portfel-withdrawals-mini__date">{formatDate(w.createdAt)}</span>
                    <span style={{ color, fontSize: '0.75rem', fontWeight: 600 }}>{label}</span>
                  </div>
                );
              })}
              {withdrawalsTotalPages > 1 && (
                <div className="portfel-withdrawals-mini__pagination">
                  <button
                    className="portfel-withdrawals-mini__page-btn"
                    disabled={withdrawalsCurrentPage <= 1}
                    onClick={() => onWithdrawalsPageChange(withdrawalsCurrentPage - 1)}
                  >
                    ←
                  </button>
                  <span className="portfel-withdrawals-mini__page-info">
                    {withdrawalsCurrentPage} / {withdrawalsTotalPages}
                  </span>
                  <button
                    className="portfel-withdrawals-mini__page-btn"
                    disabled={withdrawalsCurrentPage >= withdrawalsTotalPages}
                    onClick={() => onWithdrawalsPageChange(withdrawalsCurrentPage + 1)}
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
