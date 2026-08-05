import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ThemeToggle } from './ThemeToggle';

/** Chrome del lobby (lista / crear evento). Sin tabs operativos. */
export function LobbyHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="app-header app-header-lobby">
      <div className="app-header-bar">
        <Link to="/" className="app-header-brand" aria-label="Fan! inicio">
          <img
            src="/brand/machos-alfa-fan.png"
            alt=""
            className="app-header-mark"
            width={40}
            height={40}
          />
          <span className="app-header-wordmark">
            Fan<span>!</span>
          </span>
        </Link>

        <div className="app-header-user">
          <ThemeToggle />
          <span className="app-header-username">{user?.displayName}</span>
          <button type="button" className="btn-ghost btn-logout" onClick={logout}>
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
