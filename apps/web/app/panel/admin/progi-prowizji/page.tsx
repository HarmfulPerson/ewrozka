'use client';

import { useCommissionTiers } from './useCommissionTiers';
import { WindowDaysSection, TiersSection } from './CommissionTierComponents';
import '../wrozki/wrozki.css';

export default function ProgiProwizjiPage() {
  const {
    user,
    loading,
    saving,
    error,
    success,
    windowDays,
    setWindowDays,
    tiers,
    handleSave,
    addTier,
    removeTier,
    updateTier,
  } = useCommissionTiers();

  if (!user || loading) {
    return (
      <div className="panel-page">
        <div className="panel-page__head">
          <h1 className="panel-page__title">Progi prowizji</h1>
        </div>
        <div className="panel-page-spinner"><span className="panel-spinner" /></div>
      </div>
    );
  }

  return (
    <div className="panel-page">
      <div className="panel-page__head">
        <h1 className="panel-page__title">Progi prowizji</h1>
        <p className="aw-profile__card-row" style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
          Prowizja wróżek zależy od liczby zakończonych spotkań w ostatnich N dniach.
        </p>
      </div>

      {error && <div className="aw-profile__msg aw-profile__msg--error">{error}</div>}
      {success && <div className="aw-profile__msg aw-profile__msg--success">{success}</div>}

      <WindowDaysSection windowDays={windowDays} setWindowDays={setWindowDays} />

      <TiersSection
        tiers={tiers}
        onUpdate={updateTier}
        onRemove={removeTier}
        onAdd={addTier}
      />

      <div className="aw-profile__actions">
        <button
          type="button"
          className="aw-profile__btn aw-profile__btn--primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Zapisywanie…' : 'Zapisz konfigurację'}
        </button>
      </div>
    </div>
  );
}
