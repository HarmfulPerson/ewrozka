'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '../../../lib/auth-mock';
import {
  apiGetRevenueAnalytics,
  apiGetRegistrationAnalytics,
  apiGetWizardRevenueAnalytics,
  type RevenueAnalytics,
  type RegistrationAnalytics,
  type WizardRevenueAnalytics,
} from '../../../lib/api-admin';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export type Period = '7d' | '30d' | '90d' | '1y';
export type GroupBy = 'day' | 'week' | 'month';

const PERIOD_DAYS: Record<Period, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
};

const PERIOD_GROUP: Record<Period, GroupBy> = {
  '7d': 'day',
  '30d': 'day',
  '90d': 'week',
  '1y': 'month',
};

export function useAnalytics() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('30d');
  const [loading, setLoading] = useState(true);

  const [revenue, setRevenue] = useState<RevenueAnalytics | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationAnalytics | null>(null);
  const [wizardRevenue, setWizardRevenue] = useState<WizardRevenueAnalytics | null>(null);

  const fetchAll = useCallback(async (p: Period) => {
    const user = getStoredUser();
    if (!user) {
      router.push('/login');
      return;
    }
    if (!user.roles?.includes('admin')) {
      router.push('/panel');
      return;
    }

    setLoading(true);
    const from = daysAgo(PERIOD_DAYS[p]);
    const to = today();
    const groupBy = PERIOD_GROUP[p];

    try {
      const [rev, reg, wiz] = await Promise.all([
        apiGetRevenueAnalytics(user.token, from, to, groupBy),
        apiGetRegistrationAnalytics(user.token, from, to, groupBy),
        apiGetWizardRevenueAnalytics(user.token, from, to),
      ]);
      setRevenue(rev);
      setRegistrations(reg);
      setWizardRevenue(wiz);
    } catch {
      // silently fail — empty charts
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchAll(period);
  }, [period, fetchAll]);

  const changePeriod = (p: Period) => setPeriod(p);

  return { period, changePeriod, loading, revenue, registrations, wizardRevenue };
}
