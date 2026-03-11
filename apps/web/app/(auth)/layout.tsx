import '../components/auth/auth.css';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-layout">
      <div className="auth-layout__inner">{children}</div>
    </div>
  );
}
