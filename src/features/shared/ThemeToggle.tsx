import { useTheme } from './ThemeContext';
import { IconMoon, IconSun } from './Icons';

/** Un solo ícono: en dark muestra sol (pasar a claro); en light muestra luna. */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className="theme-toggle-btn theme-toggle-solo"
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      onClick={toggleTheme}
    >
      {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
    </button>
  );
}
