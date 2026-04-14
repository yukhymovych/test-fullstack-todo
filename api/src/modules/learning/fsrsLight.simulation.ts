import { scheduleFsrsLight } from './fsrsLight.js';
import type {
  FsrsComparisonOptions,
  FsrsComparisonPoint,
  FsrsComparisonRow,
  FsrsSimulationOptions,
  FsrsSimulationRow,
  FsrsSimulationStep,
} from './fsrsLight.simulation.types.js';

const DEFAULT_TIMEZONE = 'UTC';
const DEFAULT_NOW_ISO = '2026-03-31T12:00:00.000Z';

interface SimulationState {
  timezone: string;
  now: Date;
  lastReviewedAt: Date | null;
  stabilityDays: number | null;
  difficulty: number | null;
}

function createInitialState(options: FsrsSimulationOptions): SimulationState {
  return {
    timezone: options.timezone ?? DEFAULT_TIMEZONE,
    now: options.now ?? new Date(DEFAULT_NOW_ISO),
    lastReviewedAt: options.lastReviewedAt ?? null,
    stabilityDays: options.stabilityDays ?? null,
    difficulty: options.difficulty ?? null,
  };
}

export function simulateFsrsSequence(options: FsrsSimulationOptions): FsrsSimulationStep[] {
  let state = createInitialState(options);
  const steps: FsrsSimulationStep[] = [];

  for (const [index, grade] of options.grades.entries()) {
    const reviewedAt = state.now;
    const result = scheduleFsrsLight({
      grade,
      timezone: state.timezone,
      stabilityDays: state.stabilityDays,
      difficulty: state.difficulty,
      lastReviewedAt: state.lastReviewedAt,
      now: reviewedAt,
      retrieveWeight: options.retrieveWeight,
      rReviewTarget: options.rReviewTarget,
    });

    steps.push({
      step: index + 1,
      grade,
      reviewedAt,
      lastReviewedAtBefore: state.lastReviewedAt,
      stabilityBefore: state.stabilityDays,
      difficultyBefore: state.difficulty,
      elapsedDays: result.elapsedDays,
      intervalDays: result.intervalDays,
      dueAt: result.dueAt,
      todayKey: result.todayKey,
      stabilityAfter: result.nextStabilityDays,
      difficultyAfter: result.nextDifficulty,
      retrievabilityAtReview: result.retrievabilityAtReview,
      reviewProgress: result.reviewProgress,
      overdueModifier: result.overdueModifier,
    });

    state = {
      ...state,
      now: result.dueAt,
      lastReviewedAt: reviewedAt,
      stabilityDays: result.nextStabilityDays,
      difficulty: result.nextDifficulty,
    };
  }

  return steps;
}

const REFERENCE_NOW_ISO = '2026-03-31T12:00:00.000Z';
const REFERENCE_TIMEZONE = 'UTC';

/**
 * Compares how interval and stability change depending on when the review happens
 * relative to the scheduled due date. Holds grade/stability/difficulty fixed and
 * varies `now` so that elapsedDays = stabilityDays + offset for each offset.
 *
 * Negative offset → early review. Zero → on-time. Positive → overdue.
 */
export function simulateComparisonPoints(
  options: FsrsComparisonOptions
): FsrsComparisonPoint[] {
  const referenceNow = new Date(REFERENCE_NOW_ISO);
  const timezone = REFERENCE_TIMEZONE;
  const dayMs = 24 * 60 * 60 * 1000;

  return options.offsets.map((offset) => {
    const elapsedDays = options.stabilityDays + offset;
    // lastReviewedAt is set so that elapsedDays = stabilityDays + offset at referenceNow.
    const lastReviewedAt = new Date(referenceNow.getTime() - elapsedDays * dayMs);

    const result = scheduleFsrsLight({
      grade: options.grade,
      timezone,
      stabilityDays: options.stabilityDays,
      difficulty: options.difficulty ?? null,
      lastReviewedAt,
      now: referenceNow,
      retrieveWeight: options.retrieveWeight,
      rReviewTarget: options.rReviewTarget,
    });

    return {
      offsetDays: offset,
      elapsedDays,
      retrievabilityAtReview: result.retrievabilityAtReview ?? 1,
      reviewProgress: result.reviewProgress,
      overdueModifier: result.overdueModifier,
      stabilityAfter: result.nextStabilityDays,
      intervalDays: result.intervalDays,
    };
  });
}

export function formatFsrsComparisonRows(points: FsrsComparisonPoint[]): FsrsComparisonRow[] {
  return points.map((p) => ({
    offsetDays: p.offsetDays === 0 ? '0 (on time)' : p.offsetDays > 0 ? `+${p.offsetDays}` : `${p.offsetDays}`,
    elapsedDays: p.elapsedDays,
    retrievability: `${(p.retrievabilityAtReview * 100).toFixed(1)}%`,
    progress: `${(p.reviewProgress * 100).toFixed(0)}%`,
    overdueModifier: p.overdueModifier.toFixed(4),
    stabilityAfter: p.stabilityAfter.toFixed(4),
    intervalDays: p.intervalDays,
  }));
}

function formatMaybeNumber(value: number | null, digits: number): string {
  return value === null ? 'default' : value.toFixed(digits);
}

function formatMaybeDate(value: Date | null): string {
  return value ? value.toISOString() : 'n/a';
}

function formatRetrievability(value: number | null): string {
  if (value === null) return 'n/a (first)';
  return `${(value * 100).toFixed(1)}%`;
}

export function formatFsrsSimulationRows(steps: FsrsSimulationStep[]): FsrsSimulationRow[] {
  return steps.map((step) => ({
    step: step.step,
    grade: step.grade,
    reviewedAt: step.reviewedAt.toISOString(),
    lastReviewedAtBefore: formatMaybeDate(step.lastReviewedAtBefore),
    elapsedDays: step.elapsedDays ?? 'n/a',
    retrievabilityAtReview: formatRetrievability(step.retrievabilityAtReview),
    progress: `${(step.reviewProgress * 100).toFixed(0)}%`,
    overdueModifier: step.overdueModifier.toFixed(4),
    stabilityBefore: formatMaybeNumber(step.stabilityBefore, 6),
    stabilityAfter: step.stabilityAfter.toFixed(6),
    difficultyBefore: formatMaybeNumber(step.difficultyBefore, 2),
    difficultyAfter: step.difficultyAfter.toFixed(2),
    intervalDays: step.intervalDays,
    todayKey: step.todayKey,
    dueAt: step.dueAt.toISOString(),
  }));
}
