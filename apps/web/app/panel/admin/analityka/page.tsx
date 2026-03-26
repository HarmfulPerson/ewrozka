'use client';

import { ChartSection, type ChartSeries } from '../../../components/chart/chart';
import { useAnalytics, type Period } from './useAnalytics';
import { getUploadUrl } from '../../../lib/api';
import './analityka.css';

const PERIODS: { value: Period; label: string }[] = [
  { value: '7d', label: '7 dni' },
  { value: '30d', label: '30 dni' },
  { value: '90d', label: '90 dni' },
  { value: '1y', label: '1 rok' },
];

function formatZl(v: number): string {
  return v.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
}

// ── Series configs ──

const REVENUE_SERIES: ChartSeries[] = [
  { dataKey: 'platformFees', label: 'Platforma', color: '#8b5cf6', stackId: '1', fillOpacity: 0.4 },
  { dataKey: 'wizardPayouts', label: 'Wróżki', color: '#a78bfa', stackId: '1', fillOpacity: 0.25 },
];

const REGISTRATION_SERIES: ChartSeries[] = [
  { dataKey: 'clients', label: 'Klienci', color: '#8b5cf6', stackId: 'reg', radius: [0, 0, 0, 0] },
  { dataKey: 'wizards', label: 'Wróżki', color: '#c084fc', stackId: 'reg', radius: [4, 4, 0, 0] },
  { dataKey: 'fromReferral', label: 'Z reflinków', color: '#f59e0b', radius: [4, 4, 4, 4] },
];

export default function AnalitykaPage() {
  const { period, changePeriod, loading, revenue, registrations, wizardRevenue } = useAnalytics();

  return (
    <div className="analytics-page">
      <div className="panel-page__head">
        <h1 className="panel-page__title">Analityka</h1>
        <div className="analytics-period">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              className={`analytics-period__btn ${period === p.value ? 'analytics-period__btn--active' : ''}`}
              onClick={() => changePeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="panel-page-spinner"><span className="panel-spinner" /></div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="analytics-kpi">
            <div className="analytics-kpi__card">
              <span className="analytics-kpi__label">Przychód platformy</span>
              <span className="analytics-kpi__value">{formatZl(revenue?.summary.totalPlatformFees ?? 0)}</span>
            </div>
            <div className="analytics-kpi__card">
              <span className="analytics-kpi__label">Wypłaty wróżek</span>
              <span className="analytics-kpi__value">{formatZl(revenue?.summary.totalWizardPayouts ?? 0)}</span>
            </div>
            <div className="analytics-kpi__card">
              <span className="analytics-kpi__label">Nowe rejestracje</span>
              <span className="analytics-kpi__value">{registrations?.summary.total ?? 0}</span>
            </div>
            <div className="analytics-kpi__card">
              <span className="analytics-kpi__label">Z reflinków</span>
              <span className="analytics-kpi__value">{registrations?.summary.fromReferral ?? 0}</span>
            </div>
          </div>

          {/* Revenue Chart */}
          <ChartSection
            title="Przychody"
            type="area"
            data={revenue?.data ?? []}
            series={REVENUE_SERIES}
            xTickFormatter={formatDate}
            yTickFormatter={(v) => `${v} zł`}
            tooltipLabelFormatter={formatDate}
            tooltipValueFormatter={(v, key) => [
              formatZl(v),
              key === 'platformFees' ? 'Platforma' : 'Wróżki',
            ]}
          />

          {/* Registrations Chart */}
          <ChartSection
            title="Rejestracje"
            type="bar"
            data={registrations?.data ?? []}
            series={REGISTRATION_SERIES}
            xTickFormatter={formatDate}
            tooltipLabelFormatter={formatDate}
            yIntegersOnly
          />

          {/* Top Wizards */}
          <section className="analytics-section">
            <h2 className="analytics-section__title">Top wróżki wg zarobków</h2>
            {wizardRevenue && wizardRevenue.data.length > 0 ? (
              <div className="analytics-wizard-list">
                {wizardRevenue.data.map((w, i) => (
                  <div key={w.wizardId} className="analytics-wizard-row">
                    <span className="analytics-wizard-row__rank">{i + 1}</span>
                    <div className="analytics-wizard-row__avatar">
                      {w.image ? (
                        <img src={getUploadUrl(w.image)} alt="" />
                      ) : (
                        <span className="analytics-wizard-row__avatar-placeholder">
                          {w.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="analytics-wizard-row__name">{w.username}</span>
                    <div className="analytics-wizard-row__bars">
                      <div className="analytics-wizard-row__bar-wrap">
                        <div
                          className="analytics-wizard-row__bar analytics-wizard-row__bar--wizard"
                          style={{ width: `${Math.min(100, (w.wizardEarned / (wizardRevenue.data[0]?.wizardEarned || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="analytics-wizard-row__amounts">
                      <span className="analytics-wizard-row__earned">{formatZl(w.wizardEarned)}</span>
                      <span className="analytics-wizard-row__platform">{formatZl(w.platformEarned)} prowizja</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="analytics-empty">Brak danych w wybranym okresie</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
