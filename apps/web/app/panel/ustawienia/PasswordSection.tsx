'use client';

interface PasswordSectionProps {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  changingPassword: boolean;
  pwErrors: {
    currentPassword?: boolean;
    newPassword?: boolean;
    confirmPassword?: boolean;
  };
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onChangePassword: () => void;
}

export function PasswordSection({
  currentPassword,
  newPassword,
  confirmPassword,
  changingPassword,
  pwErrors,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onChangePassword,
}: PasswordSectionProps) {
  return (
    <section className="ustawienia-section">
      <h2 className="ustawienia-section__title">Zmiana hasła</h2>

      <div className="ustawienia-field">
        <label htmlFor="currentPassword">Obecne hasło</label>
        <input
          id="currentPassword" type="password" value={currentPassword}
          onChange={(e) => onCurrentPasswordChange(e.target.value)}
          autoComplete="current-password" placeholder="••••••••"
          className={pwErrors.currentPassword ? 'ustawienia-field__input--error' : ''}
        />
      </div>

      <div className="ustawienia-field">
        <label htmlFor="newPassword">Nowe hasło</label>
        <input
          id="newPassword" type="password" value={newPassword}
          onChange={(e) => onNewPasswordChange(e.target.value)}
          autoComplete="new-password" placeholder="Min. 8 znaków"
          className={pwErrors.newPassword ? 'ustawienia-field__input--error' : ''}
        />
      </div>

      <div className="ustawienia-field">
        <label htmlFor="confirmPassword">Powtórz nowe hasło</label>
        <input
          id="confirmPassword" type="password" value={confirmPassword}
          onChange={(e) => onConfirmPasswordChange(e.target.value)}
          autoComplete="new-password" placeholder="••••••••"
          className={pwErrors.confirmPassword ? 'ustawienia-field__input--error' : ''}
        />
      </div>

      <button type="button" className="ustawienia-page__save"
        onClick={onChangePassword} disabled={changingPassword}>
        {changingPassword ? 'Zmienianie...' : 'Zmień hasło'}
      </button>
    </section>
  );
}
