'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '../../lib/auth-mock';
import {
  apiGetWallet,
  apiGetTransactions,
  apiGetConnectStatus,

  apiCreateWithdrawal,
  apiGetWithdrawals,
  TransactionDto,
  ConnectStatusDto,
  WithdrawalDto,
} from '../../lib/api-payment';
import './portfel.css';
import '../panel-shared.css';

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

export default function PortfelPage() {
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);

  // Dane strony (ładowane raz)
  const [pageLoading, setPageLoading] = useState(true);
  const [balanceFormatted, setBalanceFormatted] = useState('0,00 zł');
  const [connectStatus, setConnectStatus] = useState<ConnectStatusDto | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalDto[]>([]);

  // Transakcje (ładowane przy każdej zmianie filtra/paginacji)
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);

  // Paginacja i sortowanie
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Wypłata
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  // Ładowanie początkowe — wszystko poza transakcjami
  useEffect(() => {
    const user = getStoredUser();
    if (!user) { router.push('/login?returnUrl=/panel/portfel'); return; }
    tokenRef.current = user.token;

    // Sygnalizuj overlay że czekamy na dane
    window.dispatchEvent(new CustomEvent('ewrozka:panel-loading'));

    const load = async () => {
      try {
        const [walletData, connectData, withdrawalsData] = await Promise.all([
          apiGetWallet(user.token),
          apiGetConnectStatus(user.token),
          apiGetWithdrawals(user.token, { limit: 5 }),
        ]);
        setBalanceFormatted(walletData.balanceFormatted);
        setConnectStatus(connectData);
        setWithdrawals(withdrawalsData.withdrawals);
      } catch (err) {
        console.error(err);
      } finally {
        setPageLoading(false);
        // Sygnalizuj overlay że strona gotowa
        window.dispatchEvent(new CustomEvent('ewrozka:panel-ready'));
      }
    };

    load();
  }, [router]);

  // Ładowanie transakcji — przy każdej zmianie sortowania/paginacji
  useEffect(() => {
    if (!tokenRef.current || pageLoading) return;
    const token = tokenRef.current;

    const loadTransactions = async () => {
      setListLoading(true);
      try {
        const data = await apiGetTransactions(token, { limit, offset, sortBy, sortOrder });
        setTransactions(data.transactions);
        setTotal(data.total);
      } catch (err) {
        console.error(err);
      } finally {
        setListLoading(false);
      }
    };

    loadTransactions();
  }, [limit, offset, sortBy, sortOrder, pageLoading]);

  const refreshAfterWithdraw = async () => {
    if (!tokenRef.current) return;
    const token = tokenRef.current;
    const [walletData, connectData, withdrawalsData, txData] = await Promise.all([
      apiGetWallet(token),
      apiGetConnectStatus(token),
      apiGetWithdrawals(token, { limit: 5 }),
      apiGetTransactions(token, { limit, offset, sortBy, sortOrder }),
    ]);
    setBalanceFormatted(walletData.balanceFormatted);
    setConnectStatus(connectData);
    setWithdrawals(withdrawalsData.withdrawals);
    setTransactions(txData.transactions);
    setTotal(txData.total);
  };

  const handleStartOnboarding = () => {
    router.push('/panel/konto-platnosci');
  };

  const handleWithdraw = async () => {
    if (!tokenRef.current) return;
    const amountPln = parseFloat(withdrawAmount.replace(',', '.'));
    if (isNaN(amountPln) || amountPln < 5) {
      setWithdrawError('Minimalna kwota wypłaty to 5 zł');
      return;
    }
    setWithdrawing(true);
    setWithdrawError(null);
    setWithdrawSuccess(null);
    try {
      const result = await apiCreateWithdrawal(tokenRef.current, Math.round(amountPln * 100));
      setWithdrawSuccess(`Wypłata ${result.amountFormatted} zlecona. Środki pojawią się w ciągu 1–7 dni roboczych.`);
      setWithdrawAmount('');
      await refreshAfterWithdraw();
    } catch (err) {
      setWithdrawError(err instanceof Error ? err.message : 'Błąd podczas wypłaty');
    } finally {
      setWithdrawing(false);
    }
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const isConnected = !!(connectStatus?.connected && connectStatus?.onboardingCompleted && connectStatus?.payoutsEnabled);
  const isPending   = !!(connectStatus?.connected && (!connectStatus?.onboardingCompleted || !connectStatus?.payoutsEnabled));
  const withdrawable = (connectStatus?.withdrawableGrosze ?? 0) / 100;

  if (pageLoading) return null;

  return (
    <div className="portfel-container">
      <div className="panel-page__head">
        <h1 className="panel-page__title">Mój portfel</h1>
      </div>

      {/* Górny rząd: saldo + wypłata obok siebie */}
      <div className="portfel-top-row">

        {/* Saldo */}
        <div className="portfel-balance-card">
          <div className="portfel-balance-label">Dostępne środki</div>
          <div className="portfel-balance-amount">{balanceFormatted}</div>
          {isConnected && (connectStatus?.stripePendingGrosze ?? 0) > 0 && (
            <div className="portfel-balance-pending">
              + {((connectStatus?.stripePendingGrosze ?? 0) / 100).toFixed(2)} zł oczekujących
            </div>
          )}
          <div className="portfel-balance-info">
            Aktualizuje się po każdej opłaconej wizycie
          </div>
        </div>

        {/* Wypłata */}
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

              {/* Ostatnie wypłaty */}
              {withdrawals.length > 0 && (
                <div className="portfel-withdrawals-mini">
                  <div className="portfel-withdrawals-mini__title">Ostatnie wypłaty</div>
                  {withdrawals.map((w) => {
                    const { label, color } = formatWithdrawalStatus(w.status);
                    return (
                      <div key={w.id} className="portfel-withdrawals-mini__row">
                        <span className="portfel-withdrawals-mini__amount">−{w.amountFormatted}</span>
                        <span className="portfel-withdrawals-mini__date">{formatDate(w.createdAt)}</span>
                        <span style={{ color, fontSize: '0.75rem', fontWeight: 600 }}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Historia wpływów */}
      <div className="portfel-history">
        <div className="portfel-history__head">
          <h2 className="portfel-history__title">Historia wpływów</h2>
          <div className="portfel-history__filters">
            <div className="panel-select">
              <span className="panel-select__label">Sortuj:</span>
              <div className="panel-select__control">
                <select
                  className="panel-select__dropdown"
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value as 'date' | 'amount'); setOffset(0); }}
                >
                  <option value="date">Data</option>
                  <option value="amount">Kwota</option>
                </select>
              </div>
            </div>
            <div className="panel-select">
              <div className="panel-select__control">
                <select
                  className="panel-select__dropdown"
                  value={sortOrder}
                  onChange={(e) => { setSortOrder(e.target.value as 'ASC' | 'DESC'); setOffset(0); }}
                >
                  <option value="DESC">Malejąco ↓</option>
                  <option value="ASC">Rosnąco ↑</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {listLoading ? (
          <div className="panel-inline-spinner"><span className="panel-spinner" /></div>
        ) : transactions.length === 0 ? (
          <div className="portfel-empty">Brak transakcji</div>
        ) : (
          <>
            <div className="portfel-history__list">
              {transactions.map((t) => (
                <div key={t.id} className="portfel-history__row">
                  <span className="portfel-history__amount">
                    +{(t.wizardAmount / 100).toFixed(2)} zł
                  </span>
                  <span className="portfel-history__title-text">
                    {t.advertisementTitle || 'Konsultacja'}
                  </span>
                  <span className="portfel-history__date">{formatDate(t.createdAt)}</span>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="panel-pagination">
                <div className="panel-pagination__controls">
                  <button className="panel-pagination__btn" onClick={() => setOffset(offset - limit)} disabled={offset === 0}>← Poprzednia</button>
                  <span className="panel-pagination__info">Strona {currentPage} z {totalPages}</span>
                  <button className="panel-pagination__btn" onClick={() => setOffset(offset + limit)} disabled={offset + limit >= total}>Następna →</button>
                </div>
                <div className="panel-pagination__per-page">
                  <span className="panel-pagination__per-page-label">Na stronie:</span>
                  <select className="panel-pagination__per-page-select" value={limit}
                    onChange={(e) => { setLimit(Number(e.target.value)); setOffset(0); }}>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
