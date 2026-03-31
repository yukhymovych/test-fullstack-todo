import { scheduleFsrsLight } from './fsrsLight.js';
import type {
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

function formatMaybeNumber(value: number | null, digits: number): string {
  return value === null ? 'default' : value.toFixed(digits);
}

function formatMaybeDate(value: Date | null): string {
  return value ? value.toISOString() : 'n/a';
}

export function formatFsrsSimulationRows(steps: FsrsSimulationStep[]): FsrsSimulationRow[] {
  return steps.map((step) => ({
    step: step.step,
    grade: step.grade,
    reviewedAt: step.reviewedAt.toISOString(),
    lastReviewedAtBefore: formatMaybeDate(step.lastReviewedAtBefore),
    elapsedDays: step.elapsedDays ?? 'n/a',
    stabilityBefore: formatMaybeNumber(step.stabilityBefore, 6),
    stabilityAfter: step.stabilityAfter.toFixed(6),
    difficultyBefore: formatMaybeNumber(step.difficultyBefore, 2),
    difficultyAfter: step.difficultyAfter.toFixed(2),
    intervalDays: step.intervalDays,
    todayKey: step.todayKey,
    dueAt: step.dueAt.toISOString(),
  }));
}
