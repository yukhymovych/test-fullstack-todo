import type { Grade } from './learning.schemas.js';

export interface FsrsSimulationOptions {
  grades: Grade[];
  timezone?: string;
  now?: Date;
  stabilityDays?: number | null;
  difficulty?: number | null;
  lastReviewedAt?: Date | null;
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
}

export interface FsrsSimulationRow {
  step: number;
  grade: Grade;
  reviewedAt: string;
  lastReviewedAtBefore: string;
  elapsedDays: number | 'n/a';
  stabilityBefore: string;
  stabilityAfter: string;
  difficultyBefore: string;
  difficultyAfter: string;
  intervalDays: number;
  todayKey: string;
  dueAt: string;
}
