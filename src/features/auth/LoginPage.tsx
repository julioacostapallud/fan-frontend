import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button, FormGroup, Input, Label, Spinner } from 'reactstrap';
import { useAuth } from './AuthContext';
import { ApiError, NetworkError, TimeoutError } from '../../api/httpClient';

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="app-shell text-center py-5">
        <Spinner />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username.trim(), password);
    } catch (err) {
      if (
        err instanceof NetworkError ||
        err instanceof TimeoutError ||
        err instanceof ApiError
      ) {
        setError(err.message);
      } else {
        setError('No se pudo iniciar sesión');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell login-shell">
      <header className="brand-lockup">
        <div className="brand-name">
          Fan<span>!</span>
        </div>
        <div className="brand-edition">Bienal 2026</div>
      </header>

      <form className="login-card" onSubmit={onSubmit}>
        <h1 className="section-title mb-3">Ingresar</h1>
        {error && <div className="error-banner">{error}</div>}
        <FormGroup>
          <Label className="form-label">Usuario</Label>
          <Input
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </FormGroup>
        <FormGroup>
          <Label className="form-label">Contraseña</Label>
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </FormGroup>
        <Button
          type="submit"
          className="btn-touch btn-primary-fan w-100"
          disabled={busy}
        >
          {busy ? (
            <>
              <Spinner size="sm" className="me-2" /> Entrando…
            </>
          ) : (
            'Entrar'
          )}
        </Button>
      </form>
    </div>
  );
}
