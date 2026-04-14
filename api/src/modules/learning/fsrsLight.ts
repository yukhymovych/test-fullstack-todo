import type { Grade } from './learning.schemas.js';

const DEFAULT_STABILITY_DAYS = 7;
const DEFAULT_DIFFICULTY = 5;

export const MIN_STABILITY_DAYS = 0.5;
export const MAX_STABILITY_DAYS = 365;
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 10;

const INTERVAL_MIN_DAYS = 1;
const INTERVAL_MAX_DAYS = 180;

// Retrievability when a page is reviewed exactly on its scheduled due date (t = S → R = e^-1).
// Used as the threshold below which overdue reviews earn an extra stability boost.
export const R_REVIEW_TARGET = Math.exp(-1); // ≈ 0.368
export const RETRIEVE_WEIGHT = 0.6;

const STABILITY_MULTIPLIERS: Record<Grade, number> = {
  again: 0.55,
  hard: 1,
  good: 1.25,
  easy: 1.5,
};

const DIFFICULTY_DELTAS: Record<Grade, number> = {
  again: 0.5,
  hard: 0.2,
  good: -0.08,
  easy: -0.18,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Exponential-decay retrievability estimate.
 * R(t, S) = exp(-t / S), clamped to [0, 1].
 *
 * Returns null when elapsedDays is null (never reviewed).
 * Returns 1 for early reviews (elapsedDays <= 0).
 *
 * Does not alter scheduling — diagnostic value only.
 */
export function computeRetrievability(
  elapsedDays: number | null,
  stabilityDays: number
): number | null {
  if (elapsedDays === null) return null;
  if (stabilityDays <= 0) return null;
  return clamp(Math.exp(-elapsedDays / stabilityDays), 0, 1);
}

function parseDayKey(dayKey: string): { year: number; month: number; day: number } {
  const [yearStr, monthStr, dayStr] = dayKey.split('-');
  return {
    year: Number(yearStr),
    month: Number(monthStr),
    day: Number(dayStr),
  };
}

function addDaysToDayKey(dayKey: string, days: number): string {
  const { year, month, day } = parseDayKey(dayKey);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getTimezoneOffsetMs(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const lookup = new Map(parts.map((part) => [part.type, part.value]));
  const year = Number(lookup.get('year'));
  const month = Number(lookup.get('month'));
  const day = Number(lookup.get('day'));
  const hour = Number(lookup.get('hour'));
  const minute = Number(lookup.get('minute'));
  const second = Number(lookup.get('second'));

  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return asUtc - date.getTime();
}

function startOfDayInTimezone(dayKey: string, timezone: string): Date {
  const { year, month, day } = parseDayKey(dayKey);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const offset = getTimezoneOffsetMs(utcGuess, timezone);
  return new Date(utcGuess.getTime() - offset);
}

export function getDayKey(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function diffDays(dayKeyA: string, dayKeyB: string): number {
  const a = new Date(`${dayKeyA}T00:00:00.000Z`);
  const b = new Date(`${dayKeyB}T00:00:00.000Z`);
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.round((a.getTime() - b.getTime()) / dayMs);
}

interface ScheduleFsrsLightParams {
  grade: Grade;
  timezone: string;
  stabilityDays: number | null | undefined;
  difficulty: number | null | undefined;
  lastReviewedAt: Date | null;
  now?: Date;
  /** Override for testing. Defaults to RETRIEVE_WEIGHT. */
  retrieveWeight?: number;
  /** Override for testing. Defaults to R_REVIEW_TARGET. */
  rReviewTarget?: number;
}

interface ScheduleFsrsLightResult {
  dueAt: Date;
  intervalDays: number;
  nextStabilityDays: number;
  nextDifficulty: number;
  elapsedDays: number | null;
  todayKey: string;
  /** Estimated memory retrievability at the moment of review. Used to modulate stability for overdue reviews. */
  retrievabilityAtReview: number | null;
  /** Overdue stability modifier that was applied. 1.0 means no boost (on-time, early, Again, or first review). */
  overdueModifier: number;
  /**
   * How far through the current interval the review occurred: clamp(elapsedDays / stability, 0, 1).
   * 0 = reviewed immediately. 1 = on-time or overdue. Used to attenuate early-review stability gain.
   * Always 1 for first reviews (no prior review) and for `again`.
   */
  reviewProgress: number;
}

export function scheduleFsrsLight(
  params: ScheduleFsrsLightParams
): ScheduleFsrsLightResult {
  const now = params.now ?? new Date();
  const todayKey = getDayKey(now, params.timezone);
  const lastReviewedKey = params.lastReviewedAt
    ? getDayKey(params.lastReviewedAt, params.timezone)
    : null;

  const elapsedDays = lastReviewedKey ? diffDays(todayKey, lastReviewedKey) : null;

  const stability = clamp(
    params.stabilityDays ?? DEFAULT_STABILITY_DAYS,
    MIN_STABILITY_DAYS,
    MAX_STABILITY_DAYS
  );
  const difficulty = clamp(
    params.difficulty ?? DEFAULT_DIFFICULTY,
    MIN_DIFFICULTY,
    MAX_DIFFICULTY
  );

  // Computed here using pre-update stability so it reflects the memory state the user
  // was actually in at review time, before any grade-driven stability change is applied.
  const retrievabilityAtReview = computeRetrievability(elapsedDays, stability);

  const nextDifficulty = clamp(
    difficulty + DIFFICULTY_DELTAS[params.grade],
    MIN_DIFFICULTY,
    MAX_DIFFICULTY
  );

  const multipliedStability = stability * STABILITY_MULTIPLIERS[params.grade];

  const retrieveWeight = params.retrieveWeight ?? RETRIEVE_WEIGHT;
  const rReviewTarget = params.rReviewTarget ?? R_REVIEW_TARGET;

  // One-sided overdue modifier: successful recalls of overdue items earn a proportionally
  // larger stability boost. Early and on-time reviews (R >= rReviewTarget) are unchanged.
  // `again` is unchanged. First reviews (null R) are unchanged.
  const modifier =
    params.grade !== 'again' &&
    retrievabilityAtReview !== null &&
    retrievabilityAtReview < rReviewTarget
      ? 1 + retrieveWeight * (rReviewTarget - retrievabilityAtReview)
      : 1;

  const brakedStability =
    (multipliedStability * modifier) / (1 + 0.06 * (nextDifficulty - DEFAULT_DIFFICULTY));
  const fullNextStabilityDays = clamp(brakedStability, MIN_STABILITY_DAYS, MAX_STABILITY_DAYS);

  // Early-review attenuation: scale the stability gain by how far through the current
  // interval the review occurred.
  //   progress = clamp(elapsedDays / stability, 0, 1)
  //   gain     = fullNextStability - stability
  //   result   = stability + gain * progress
  //
  // progress = 0 → no gain (stability unchanged).
  // progress = 0.5 → half the normal gain.
  // progress = 1 → full gain (identical to previous behaviour for on-time/overdue).
  //
  // First reviews (elapsedDays = null) are treated as on-time: progress = 1.
  // `again` is excluded: its stability reduction is always applied in full.
  const reviewProgress = elapsedDays !== null ? clamp(elapsedDays / stability, 0, 1) : 1;

  const nextStabilityDays =
    params.grade !== 'again' && reviewProgress < 1
      ? clamp(
          stability + (fullNextStabilityDays - stability) * reviewProgress,
          MIN_STABILITY_DAYS,
          MAX_STABILITY_DAYS
        )
      : fullNextStabilityDays;

  const intervalDays = clamp(
    Math.round(nextStabilityDays),
    INTERVAL_MIN_DAYS,
    INTERVAL_MAX_DAYS
  );

  const dueDayKey = addDaysToDayKey(todayKey, intervalDays);
  const dueAt = startOfDayInTimezone(dueDayKey, params.timezone);

  return {
    dueAt,
    intervalDays,
    nextStabilityDays,
    nextDifficulty,
    elapsedDays,
    todayKey,
    retrievabilityAtReview,
    overdueModifier: modifier,
    reviewProgress,
  };
}
