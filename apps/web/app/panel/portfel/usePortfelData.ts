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
  CommissionTierDto,
} from '../../lib/api-payment';

export function usePortfelData() {
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);

  const [pageLoading, setPageLoading] = useState(true);
  const [balanceFormatted, setBalanceFormatted] = useState('0,00 zł');
  const [platformFeePercent, setPlatformFeePercent] = useState<number | null>(null);
  const [commissionTier, setCommissionTier] = useState<CommissionTierDto | null>(null);
  const [connectStatus, setConnectStatus] = useState<ConnectStatusDto | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalDto[]>([]);

  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);

  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) { router.push('/login?returnUrl=/panel/portfel'); return; }
    tokenRef.current = user.token;

    window.dispatchEvent(new CustomEvent('ewrozka:panel-loading'));

    const load = async () => {
      try {
        const [walletData, connectData, withdrawalsData] = await Promise.all([
          apiGetWallet(user.token),
          apiGetConnectStatus(user.token),
          apiGetWithdrawals(user.token, { limit: 5 }),
        ]);
        setBalanceFormatted(walletData.balanceFormatted);
        setPlatformFeePercent(walletData.platformFeePercent ?? null);
        setCommissionTier(walletData.commissionTier ?? null);
        setConnectStatus(connectData);
        setWithdrawals(withdrawalsData.withdrawals);
      } catch (err) {
        console.error(err);
      } finally {
        setPageLoading(false);
        window.dispatchEvent(new CustomEvent('ewrozka:panel-ready'));
      }
    };

    load();
  }, [router]);

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
    setPlatformFeePercent(walletData.platformFeePercent ?? null);
    setCommissionTier(walletData.commissionTier ?? null);
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

  return {
    pageLoading,
    balanceFormatted,
    platformFeePercent,
    commissionTier,
    connectStatus,
    withdrawals,
    transactions,
    total,
    listLoading,
    limit,
    setLimit,
    offset,
    setOffset,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    withdrawAmount,
    setWithdrawAmount,
    withdrawing,
    withdrawError,
    withdrawSuccess,
    handleStartOnboarding,
    handleWithdraw,
    currentPage,
    totalPages,
    isConnected,
    isPending,
    withdrawable,
  };
}
