import type { Grade } from './learning.schemas.js';

export interface FsrsSimulationOptions {
  grades: Grade[];
  timezone?: string;
  now?: Date;
  stabilityDays?: number | null;
  difficulty?: number | null;
  lastReviewedAt?: Date | null;
  /** Override RETRIEVE_WEIGHT for testing different coefficient values. */
  retrieveWeight?: number;
  /** Override R_REVIEW_TARGET for testing different threshold values. */
  rReviewTarget?: number;
}

export interface FsrsSimulationStep {
  step: number;
  grade: Grade;
  reviewedAt: Date;
  lastReviewedAtBefore: Date | null;
  stabilityBefore: number | null;
  difficultyBefore: number | null;
  elapsedDays: number | null;
  intervalDays: number;
  dueAt: Date;
  todayKey: string;
  stabilityAfter: number;
  difficultyAfter: number;
  retrievabilityAtReview: number | null;
  reviewProgress: number;
  overdueModifier: number;
}

export interface FsrsComparisonOptions {
  grade: Grade;
  stabilityDays: number;
  difficulty?: number | null;
  /** Day offsets relative to the due date. Negative = early, 0 = on time, positive = overdue. */
  offsets: number[];
  /** Override RETRIEVE_WEIGHT for testing. */
  retrieveWeight?: number;
  /** Override R_REVIEW_TARGET for testing. */
  rReviewTarget?: number;
}

export interface FsrsComparisonPoint {
  offsetDays: number;
  elapsedDays: number;
  retrievabilityAtReview: number;
  reviewProgress: number;
  overdueModifier: number;
  stabilityAfter: number;
  intervalDays: number;
}

export interface FsrsComparisonRow {
  offsetDays: string;
  elapsedDays: number;
  retrievability: string;
  progress: string;
  overdueModifier: string;
  stabilityAfter: string;
  intervalDays: number;
}

export interface FsrsSimulationRow {
  step: number;
  grade: Grade;
  reviewedAt: string;
  lastReviewedAtBefore: string;
  elapsedDays: number | 'n/a';
  retrievabilityAtReview: string;
  progress: string;
  overdueModifier: string;
  stabilityBefore: string;
  stabilityAfter: string;
  difficultyBefore: string;
  difficultyAfter: string;
  intervalDays: number;
  todayKey: string;
  dueAt: string;
}
