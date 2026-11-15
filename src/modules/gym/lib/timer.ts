import type { Workout } from '../data/types';

/** Segundos de entrenamiento de un workout (descontando pausas) en el instante `now`. */
export function elapsedSeconds(w: Pick<Workout, 'startedAt' | 'finishedAt' | 'pausedAt' | 'pausedSeconds' | 'durationSeconds'>, now = Date.now()): number {
  if (w.finishedAt && w.durationSeconds != null) return w.durationSeconds;
  const end = w.finishedAt ?? w.pausedAt;
  const endMs = end ? Date.parse(end) : now;
  return Math.max(0, Math.floor((endMs - Date.parse(w.startedAt)) / 1000) - (w.pausedSeconds ?? 0));
}

/** 754 -> "12:34" ; 4354 -> "1:12:34" */
export function formatClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** 4354 -> "1 h 12 min" ; 754 -> "12 min" ; 40 -> "< 1 min" */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null) return 'Sin tiempo';
  const totalMin = Math.floor(totalSeconds / 60);
  if (totalMin < 1) return '< 1 min';
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
