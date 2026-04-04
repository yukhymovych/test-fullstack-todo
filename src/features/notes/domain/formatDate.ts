function capitalize(value: string): string {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function createRelativeTimeFormatter(locale?: string, style: Intl.RelativeTimeFormatStyle = 'long') {
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style });
}

/**
 * Formats ISO date string for display.
 * Pure function - no side effects, no React.
 */
export function formatDate(iso: string, locale?: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats ISO date as localized relative time.
 * Pure function - no side effects, no React.
 */
export function formatRelativeTime(iso: string, locale?: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffH = Math.round(diffMin / 60);
  const diffD = Math.round(diffH / 24);
  const diffW = Math.round(diffD / 7);
  const formatter = createRelativeTimeFormatter(locale, 'short');

  if (Math.abs(diffSec) < 60) return capitalize(formatter.format(0, 'second'));
  if (Math.abs(diffMin) < 60) return formatter.format(diffMin, 'minute');
  if (Math.abs(diffH) < 24) return formatter.format(diffH, 'hour');
  if (Math.abs(diffD) < 7) return formatter.format(diffD, 'day');
  if (Math.abs(diffW) < 4) return formatter.format(diffW, 'week');

  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

/**
 * Formats a future ISO date for "due" display.
 * Pure function - no side effects, no React.
 */
export function formatDueDate(iso: string, locale?: string): string {
  const d = new Date(iso);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dueStart = new Date(d);
  dueStart.setHours(0, 0, 0, 0);
  const diffMs = dueStart.getTime() - now.getTime();
  const diffD = Math.round(diffMs / (24 * 60 * 60 * 1000));
  const formatter = createRelativeTimeFormatter(locale);

  if (diffD <= 0) return capitalize(formatter.format(0, 'day'));
  if (diffD < 7) return capitalize(formatter.format(diffD, 'day'));
  if (diffD < 30) return capitalize(formatter.format(Math.floor(diffD / 7), 'week'));

  return d.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats past/today ISO dates for "ready" display.
 * Pure function - no side effects, no React.
 */
export function formatTodayOrPastDate(iso: string, locale?: string): string {
  const d = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const dueStart = new Date(d);
  dueStart.setHours(0, 0, 0, 0);

  if (dueStart.getTime() === todayStart.getTime()) {
    return capitalize(createRelativeTimeFormatter(locale).format(0, 'day'));
  }

  return d.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
