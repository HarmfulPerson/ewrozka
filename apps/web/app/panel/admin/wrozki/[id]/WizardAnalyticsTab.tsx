'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChartSection, type ChartSeries } from '../../../../components/chart/chart';
import { getStoredUser } from '../../../../lib/auth-mock';
import {
  apiGetWizardAnalytics,
  type WizardAnalytics,
} from '../../../../lib/api-admin';

type Period = '7d' | '30d' | '90d' | '1y';
type GroupBy = 'day' | 'week' | 'month';

const PERIODS: { value: Period; label: string }[] = [
  { value: '7d', label: '7 dni' },
  { value: '30d', label: '30 dni' },
  { value: '90d', label: '90 dni' },
  { value: '1y', label: '1 rok' },
];

const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
const PERIOD_GROUP: Record<Period, GroupBy> = { '7d': 'day', '30d': 'day', '90d': 'week', '1y': 'month' };

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatZl(v: number): string {
  return v.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zl';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
}

const REVENUE_SERIES: ChartSeries[] = [
  { dataKey: 'wizardEarned', label: 'Zarobek wrozki', color: '#8b5cf6', stackId: '1', fillOpacity: 0.4 },
  { dataKey: 'platformFee', label: 'Prowizja platformy', color: '#f59e0b', stackId: '1', fillOpacity: 0.25 },
];

const MEETING_SERIES: ChartSeries[] = [
  { dataKey: 'total', label: 'Wszystkie', color: '#8b5cf6', stackId: 'mtg', radius: [0, 0, 0, 0] },
  { dataKey: 'completed', label: 'Zakonczone', color: '#22c55e', radius: [4, 4, 4, 4] },
];

const RATING_SERIES: ChartSeries[] = [
  { dataKey: 'avgRating', label: 'Srednia ocena', color: '#f59e0b', fillOpacity: 0.3 },
];

interface WizardAnalyticsTabProps {
  wizardId: number;
}

export function WizardAnalyticsTab({ wizardId }: WizardAnalyticsTabProps) {
  const [period, setPeriod] = useState<Period>('30d');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WizardAnalytics | null>(null);

  const fetchData = useCallback(async (p: Period) => {
    const user = getStoredUser();
    if (!user) return;
    setLoading(true);
    try {
      const result = await apiGetWizardAnalytics(
        user.token,
        wizardId,
        daysAgo(PERIOD_DAYS[p]),
        today(),
        PERIOD_GROUP[p],
      );
      setData(result);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [wizardId]);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  if (loading) {
    return <div className="panel-page-spinner"><span className="panel-spinner" /></div>;
  }

  const s = data?.summary;

  return (
    <div className="wizard-analytics">
      <div className="analytics-period">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            className={`analytics-period__btn ${period === p.value ? 'analytics-period__btn--active' : ''}`}
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI */}
      <div className="analytics-kpi">
        <div className="analytics-kpi__card">
          <span className="analytics-kpi__label">Zarobek wrozki</span>
          <span className="analytics-kpi__value">{formatZl(s?.totalWizardEarned ?? 0)}</span>
        </div>
        <div className="analytics-kpi__card">
          <span className="analytics-kpi__label">Prowizja platformy</span>
          <span className="analytics-kpi__value">{formatZl(s?.totalPlatformFee ?? 0)}</span>
        </div>
        <div className="analytics-kpi__card">
          <span className="analytics-kpi__label">Spotkania</span>
          <span className="analytics-kpi__value">{s?.totalCompleted ?? 0} / {s?.totalMeetings ?? 0}</span>
        </div>
        <div className="analytics-kpi__card">
          <span className="analytics-kpi__label">Srednia ocena</span>
          <span className="analytics-kpi__value">
            {s?.avgRating != null ? `${s.avgRating.toFixed(2)} (${s.totalRatings})` : 'brak'}
          </span>
        </div>
      </div>

      {/* Revenue */}
      <ChartSection
        title="Przychody"
        type="area"
        data={data?.revenue ?? []}
        series={REVENUE_SERIES}
        xTickFormatter={formatDate}
        yTickFormatter={(v) => `${v} zl`}
        tooltipLabelFormatter={formatDate}
        tooltipValueFormatter={(v, key) => [
          formatZl(v),
          key === 'wizardEarned' ? 'Zarobek' : 'Prowizja',
        ]}
      />

      {/* Meetings */}
      <ChartSection
        title="Spotkania"
        type="bar"
        data={data?.meetings ?? []}
        series={MEETING_SERIES}
        xTickFormatter={formatDate}
        tooltipLabelFormatter={formatDate}
        yIntegersOnly
      />

      {/* Ratings */}
      <ChartSection
        title="Srednia ocena w czasie"
        type="area"
        data={data?.ratings ?? []}
        series={RATING_SERIES}
        height={200}
        xTickFormatter={formatDate}
        tooltipLabelFormatter={formatDate}
        tooltipValueFormatter={(v, key) => [
          key === 'avgRating' ? v.toFixed(2) : v,
          key === 'avgRating' ? 'Ocena' : 'Ilosc ocen',
        ]}
      />
    </div>
  );
}
