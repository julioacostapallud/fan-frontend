import { useTheme } from './ThemeContext';
import { IconMoon, IconSun } from './Icons';

/** Sol / luna a la derecha del usuario logueado. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-toggle" role="group" aria-label="Tema">
      <button
        type="button"
        className={`theme-toggle-btn${theme === 'light' ? ' is-active' : ''}`}
        aria-label="Tema claro"
        aria-pressed={theme === 'light'}
        onClick={() => setTheme('light')}
      >
        <IconSun size={18} />
      </button>
      <button
        type="button"
        className={`theme-toggle-btn${theme === 'dark' ? ' is-active' : ''}`}
        aria-label="Tema oscuro"
        aria-pressed={theme === 'dark'}
        onClick={() => setTheme('dark')}
      >
        <IconMoon size={18} />
      </button>
    </div>
  );
}
