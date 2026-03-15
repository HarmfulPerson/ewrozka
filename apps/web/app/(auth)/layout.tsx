'use client';

import { SubtleStars } from '../components/subtle-stars/subtle-stars';
import '../components/auth/auth.css';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-layout">
      <SubtleStars count={80} maxOpacity={0.35} />
      <div className="auth-layout__inner">{children}</div>
    </div>
  );
}
