type Props = {
  username: string;
  password: string;
  loading: boolean;
  error: string | null;
  onUsername: (value: string) => void;
  onPassword: (value: string) => void;
  onSubmit: () => void;
};

export function LoginScreen({
  username,
  password,
  loading,
  error,
  onUsername,
  onPassword,
  onSubmit
}: Props) {
  return (
    <main className="login-shell">
      <section className="login-card">
        <p className="brand-mark">LANDEV</p>
        <h1>Sign in</h1>
        <p className="login-subtitle">Use the same credentials as the web system.</p>
        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label>
            Email / Username
            <input
              autoFocus
              autoComplete="username"
              value={username}
              disabled={loading}
              onChange={(event) => onUsername(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              disabled={loading}
              onChange={(event) => onPassword(event.target.value)}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="primary-btn" disabled={loading || !username || !password}>
            {loading ? "Signing in…" : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}
