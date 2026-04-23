/**
 * Reminder cron logging: human-readable console lines by default.
 * Set REMINDER_JOB_LOG_FORMAT=json for one-line JSON (log aggregators).
 */

type ReminderJobLogLevel = 'info' | 'warn' | 'error';

function useJsonReminderLogs(): boolean {
  return process.env.REMINDER_JOB_LOG_FORMAT?.toLowerCase().trim() === 'json';
}

function serializeValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value);
}

const DISPLAY_PRIORITY = [
  'skipReason',
  'detail',
  'runId',
  'userId',
  'batchNumber',
  'dueUsersInBatch',
  'claimedUsers',
];

/** Stable, readable key order for common events; otherwise priority keys first then sorted. */
function orderedKeys(event: string, payload: Record<string, unknown>): string[] {
  const preferred: Record<string, string[]> = {
    run_started: [
      'runId',
      'startedAt',
      'allowMultipleRemindersPerDay',
      'bypassNextReminderInstantForCandidates',
      'jobBatchLimit',
      'maxJobBatchesPerRun',
    ],
    run_completed: [
      'runId',
      'elapsedMs',
      'jobBatchesRun',
      'batchLimitReached',
      'candidatesReturned',
      'eligibleForAttempt',
      'pushesAttempted',
      'pushesSucceeded',
      'pushesFailed',
      'subscriptionsDeactivated',
      'skippedNoSubscriptions',
      'skippedNoDueItems',
      'skippedAlreadySentAtClaim',
      'healedAlreadySentToday',
      'skippedDuplicateSendGuard',
      'optimisticMarkFailed',
      'claimLostToConcurrentRun',
      'staleClaimsRecovered',
    ],
    run_failed: ['runId', 'elapsedMs', 'error'],
  };

  const preset = preferred[event];
  const keys = new Set(Object.keys(payload));
  const out: string[] = [];
  if (preset) {
    for (const k of preset) {
      if (keys.has(k)) {
        out.push(k);
        keys.delete(k);
      }
    }
  } else {
    const prioSet = new Set(DISPLAY_PRIORITY);
    for (const k of DISPLAY_PRIORITY) {
      if (keys.has(k)) {
        out.push(k);
        keys.delete(k);
      }
    }
    const rest = [...keys].filter((k) => !prioSet.has(k)).sort();
    return [...out, ...rest];
  }
  const rest = [...keys].sort();
  return [...out, ...rest];
}

function formatHumanBlock(event: string, payload: Record<string, unknown>): string {
  const lines: string[] = [];
  const keys = orderedKeys(event, payload);
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) continue;
    const v = payload[key as keyof typeof payload];
    if (v === undefined) continue;
    lines.push(`  ${key}: ${serializeValue(v)}`);
  }
  return lines.join('\n');
}

export function logReminderJobEvent(
  level: ReminderJobLogLevel,
  event: string,
  payload: Record<string, unknown>
): void {
  const jsonLine = JSON.stringify({
    level,
    component: 'reminders.job',
    event,
    ...payload,
  });

  if (useJsonReminderLogs()) {
    if (level === 'error') {
      console.error('[reminders][job]', jsonLine);
    } else if (level === 'warn') {
      console.warn('[reminders][job]', jsonLine);
    } else {
      console.log('[reminders][job]', jsonLine);
    }
    return;
  }

  const head = `[reminders][job] ${level.toUpperCase()}  ${event}`;
  const block = formatHumanBlock(event, payload);
  const text = `${head}\n${block}`;

  if (level === 'error') {
    console.error(text);
  } else if (level === 'warn') {
    console.warn(text);
  } else {
    console.log(text);
  }
}

export function logReminderJobRiskSummary(stats: Record<string, unknown>): void {
  if (useJsonReminderLogs()) {
    console.warn(
      '[reminders][job]',
      JSON.stringify({
        level: 'warn',
        component: 'reminders.job',
        event: 'risk_signals',
        ...stats,
      })
    );
    return;
  }

  const lines = Object.entries(stats)
    .filter(([, v]) => v !== undefined && v !== false && v !== 0)
    .map(([k, v]) => `  ${k}: ${serializeValue(v)}`)
    .join('\n');
  if (!lines) return;
  console.warn(`[reminders][job] WARN  risk_signals\n${lines}`);
}
