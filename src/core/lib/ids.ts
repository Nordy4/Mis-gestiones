/** Id único en texto (UUID v4). Compatible con una columna uuid de Supabase. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // Respaldo para contextos no seguros (http en la red local)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Marca de tiempo ISO actual. */
export const nowIso = () => new Date().toISOString();
