import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface Props {
  eventId?: string;
}

export function AppHeader({ eventId }: Props) {
  const { user, logout } = useAuth();
  const location = useLocation();

  function isActive(path: string, exact = false) {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  }

  function navClass(path: string, exact = false) {
    return isActive(path, exact) ? 'app-nav-link is-active' : 'app-nav-link';
  }

  const base = eventId ? `/eventos/${eventId}` : null;

  return (
    <header className="app-header">
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
          <Link to="/" className={navClass('/', true)}>
            Eventos
          </Link>
          {base && (
            <>
              <Link to={base} className={navClass(base, true)}>
                Ventas
              </Link>
              <Link
                to={`${base}/estadisticas`}
                className={navClass(`${base}/estadisticas`)}
              >
                Stats
              </Link>
              <Link
                to={`${base}/reposicion`}
                className={navClass(`${base}/reposicion`)}
              >
                Reposición
              </Link>
              <Link
                to={`${base}/productos`}
                className={navClass(`${base}/productos`)}
              >
                Productos
              </Link>
              <Link to={`${base}/gastos`} className={navClass(`${base}/gastos`)}>
                Gastos
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
