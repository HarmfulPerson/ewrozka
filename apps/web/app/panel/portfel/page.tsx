'use client';

import { usePortfelData } from './usePortfelData';
import { BalanceCard } from './BalanceCard';
import { WithdrawCard } from './WithdrawCard';
import { TransactionHistory } from './TransactionHistory';
import './portfel.css';
import '../panel-shared.css';

export default function PortfelPage() {
  const {
    pageLoading,
    availableFormatted,
    pendingFormatted,
    platformFeePercent,
    commissionTier,
    connectStatus,
    withdrawals,
    withdrawalsCurrentPage,
    withdrawalsTotalPages,
    handleWithdrawalsPageChange,
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
  } = usePortfelData();

  if (pageLoading) return null;

  return (
    <div className="portfel-container">
      <div className="panel-page__head">
        <h1 className="panel-page__title">Mój portfel</h1>
      </div>

      <div className="portfel-top-row">
        <BalanceCard
          isConnected={isConnected}
          connectStatus={connectStatus}
          availableFormatted={availableFormatted}
          pendingFormatted={pendingFormatted}
          platformFeePercent={platformFeePercent}
          commissionTier={commissionTier}
        />

        <WithdrawCard
          connectStatus={connectStatus}
          isPending={isPending}
          withdrawable={withdrawable}
          withdrawAmount={withdrawAmount}
          setWithdrawAmount={setWithdrawAmount}
          withdrawing={withdrawing}
          withdrawError={withdrawError}
          withdrawSuccess={withdrawSuccess}
          withdrawals={withdrawals}
          withdrawalsCurrentPage={withdrawalsCurrentPage}
          withdrawalsTotalPages={withdrawalsTotalPages}
          onWithdrawalsPageChange={handleWithdrawalsPageChange}
          handleStartOnboarding={handleStartOnboarding}
          handleWithdraw={handleWithdraw}
        />
      </div>

      <TransactionHistory
        listLoading={listLoading}
        transactions={transactions}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        limit={limit}
        setLimit={setLimit}
        offset={offset}
        setOffset={setOffset}
        currentPage={currentPage}
        totalPages={totalPages}
        total={total}
      />
    </div>
  );
}
