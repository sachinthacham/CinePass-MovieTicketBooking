/**
 * Shared semantic tones for status badges/chips. Each page keeps its own small
 * map from its domain-specific status enum to one of these tones (e.g. booking
 * "Confirmed" → success, showtime "Cancelled" → destructive) — this utility just
 * centralizes the actual color decision so every status badge in the app draws
 * from the same palette instead of each page picking its own Tailwind literals.
 */
export type StatusTone = 'success' | 'warning' | 'destructive' | 'info' | 'neutral'

const toneClasses: Record<StatusTone, string> = {
  success: 'bg-(--success)/10 text-(--success) border-(--success)/20',
  warning: 'bg-(--warning)/10 text-(--warning) border-(--warning)/20',
  destructive: 'bg-(--destructive)/10 text-(--destructive) border-(--destructive)/20',
  info: 'bg-(--info)/10 text-(--info) border-(--info)/20',
  neutral: 'bg-(--muted) text-(--muted-foreground) border-(--border)',
}

/** Tailwind classes (background + text + border) for a status badge in the given tone. */
export function statusBadgeClass(tone: StatusTone): string {
  return toneClasses[tone]
}
