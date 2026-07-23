import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

type Props = {
  /** Mostrar bloque de marca debajo del nav (home) */
  showBrand?: boolean;
};

export function AppHeader({ showBrand = false }: Props) {
  const { user, logout } = useAuth();
  const location = useLocation();

  function navClass(path: string) {
    const active =
      path === '/'
        ? location.pathname === '/'
        : location.pathname.startsWith(path);
    return active ? 'app-nav-link is-active' : 'app-nav-link';
  }

  return (
    <header className={`app-header${showBrand ? ' app-header-home' : ''}`}>
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
          <span className="app-header-username">{user?.displayName}</span>
          <button type="button" className="btn-ghost btn-logout" onClick={logout}>
            Salir
          </button>
        </div>
      </div>

      <nav className="app-nav" aria-label="Principal">
        <div className="app-nav-scroll">
          <Link to="/estadisticas" className={navClass('/estadisticas')}>
            Ventas
          </Link>
          <Link to="/reposicion" className={navClass('/reposicion')}>
            Reposición
          </Link>
          <Link to="/admin" className={navClass('/admin')}>
            Productos
          </Link>
        </div>
      </nav>

      {showBrand && (
        <div className="brand-lockup brand-lockup-home">
          <div className="brand-lockup-text">
            <div className="brand-name">
              Fan<span>!</span>
            </div>
            <div className="brand-edition">Bienal 2026</div>
          </div>
          <div className="brand-submark">
            <img src="/brand/machos-alfa-fan.png" alt="Machos Alfa Fan!" />
          </div>
        </div>
      )}
    </header>
  );
}
