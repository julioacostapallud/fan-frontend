import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button, FormGroup, Input, Label, Spinner } from 'reactstrap';
import { useAuth } from './AuthContext';
import { ApiError, NetworkError, TimeoutError } from '../../api/httpClient';

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      <div className="login-brand">
        <img
          src="/brand/machos-alfa-fan.png"
          alt="Machos Alfa Fan!"
          className="login-submark"
        />
        <div className="brand-lockup login-wordmark">
          <div className="brand-name">
            Fan<span>!</span>
          </div>
          <div className="brand-edition">Bienal 2026</div>
        </div>
      </div>

      <form className="login-card" onSubmit={onSubmit}>
        <h1 className="login-title">Ingresar</h1>
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        <FormGroup>
          <Label className="form-label" for="login-user">
            Usuario
          </Label>
          <Input
            id="login-user"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </FormGroup>
        <FormGroup>
          <Label className="form-label" for="login-pass">
            Contraseña
          </Label>
          <div className="input-with-action">
            <Input
              id="login-pass"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="input-action-btn"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? 'Ocultar' : 'Ver'}
            </button>
          </div>
        </FormGroup>
        <Button type="submit" className="btn-touch btn-primary-fan w-100" disabled={busy}>
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
