import Image from 'next/image';
import Link from 'next/link';

interface AuthFormShellProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
  backHref?: string;
  children: React.ReactNode;
}

export function AuthFormShell({ title, subtitle, centered, backHref, children }: AuthFormShellProps) {
  return (
    <div className="auth-shell">
      <Link href="/" className="auth-shell__logo" aria-label="eWróżka – strona główna">
        <Image src="/logo.png" alt="eWróżka" width={120} height={36} priority />
      </Link>
      <div className="auth-shell__card">
        {backHref && <Link href={backHref} className="auth-back">← Wróć</Link>}
        <h1 className={`auth-shell__title${centered ? ' auth-shell__title--centered' : ''}`}>{title}</h1>
        {subtitle && <p className={`auth-shell__subtitle${centered ? ' auth-shell__subtitle--centered' : ''}`}>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
