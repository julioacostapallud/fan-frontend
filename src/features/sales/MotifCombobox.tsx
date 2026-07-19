import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from 'reactstrap';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/api';

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface Props {
  productId: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Combobox: busca motivos ya usados (prioriza los del producto).
 * Si el texto no coincide, se envía como motivo nuevo al guardar.
 */
export function MotifCombobox({ productId, value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const debounced = useDebounced(query, 200);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const motifsQuery = useQuery({
    queryKey: ['motifs-combo', productId || 'all', debounced],
    queryFn: () => api.motifs.search(debounced, productId || undefined),
    enabled: Boolean(productId) || debounced.trim().length > 0,
    staleTime: 30_000,
  });

  const options = useMemo(() => {
    const list = motifsQuery.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((m) => m.name.toLowerCase().includes(q));
  }, [motifsQuery.data, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function pick(name: string) {
    setQuery(name);
    onChange(name);
    setOpen(false);
  }

  const exactExists = options.some(
    (m) => m.name.toLowerCase() === query.trim().toLowerCase(),
  );

  return (
    <div className="motif-combo" ref={wrapRef}>
      <Input
        type="text"
        disabled={disabled || !productId}
        placeholder={productId ? 'Buscar o escribir…' : 'Elegí producto'}
        value={query}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
      />
      {open && productId && (
        <div className="motif-combo-menu">
          {options.map((m) => (
            <button
              key={m.id}
              type="button"
              className="motif-combo-option"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(m.name)}
            >
              {m.name}
            </button>
          ))}
          {query.trim() && !exactExists && (
            <button
              type="button"
              className="motif-combo-option motif-combo-new"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(query.trim())}
            >
              Usar nuevo: “{query.trim()}”
            </button>
          )}
          {!options.length && !query.trim() && (
            <div className="motif-combo-empty">Sin motivos previos</div>
          )}
        </div>
      )}
    </div>
  );
}
