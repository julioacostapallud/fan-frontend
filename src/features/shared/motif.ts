/** Motivos que no deben rankearse en Top motivos (solo este caso). */
export function isUnrankedMotif(name: string | null | undefined): boolean {
  const n = (name ?? '').trim().toLowerCase();
  return n === '' || n === '-' || n === '—' || n === 'sin motivo';
}
