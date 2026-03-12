export type AuthConfig = {
  secret: string;
  expires: string;
  /** Google OAuth – opcjonalne, jeśli brak to logowanie przez Google jest wyłączone */
  google?: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
    frontendUrl: string;
  };
};
