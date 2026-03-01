/**
 * Formats ISO date string for display.
 * Pure function - no side effects, no React.
 */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats ISO date as relative time: "5 min ago", "17m ago", "2h ago", "2d ago", "1 week ago", "Feb 21".
 * Pure function - no side effects, no React.
 */
export function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  const diffW = Math.floor(diffD / 7);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) {
    if (diffMin === 1) return '1 min ago';
    if (diffMin < 10) return `${diffMin} min ago`;
    return `${diffMin}m ago`;
  }
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD < 7) return `${diffD}d ago`;
  if (diffW < 4) return diffW === 1 ? '1 week ago' : `${diffW} weeks ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Formats a future ISO date for "due" display: "Today", "Tomorrow", "in 2 days", "Mar 1, 2025".
 * Pure function - no side effects, no React.
 */
export function formatDueDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dueStart = new Date(d);
  dueStart.setHours(0, 0, 0, 0);
  const diffMs = dueStart.getTime() - now.getTime();
  const diffD = Math.round(diffMs / (24 * 60 * 60 * 1000));

  if (diffD <= 0) return 'Today';
  if (diffD === 1) return 'Tomorrow';
  if (diffD < 7) return `in ${diffD} days`;
  if (diffD < 14) return 'in 1 week';
  if (diffD < 30) return `in ${Math.floor(diffD / 7)} weeks`;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats past/today ISO dates for "ready" display: "Today" or "Mar 8, 2026".
 * Pure function - no side effects, no React.
 */
export function formatTodayOrPastDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const dueStart = new Date(d);
  dueStart.setHours(0, 0, 0, 0);

  if (dueStart.getTime() === todayStart.getTime()) {
    return 'Today';
  }

  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
