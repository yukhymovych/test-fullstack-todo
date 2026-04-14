/**
 * Dry-run FSRS scheduler simulator.
 *
 * --- Sequence mode (default) ---
 * Simulates a chain of reviews, each starting from the previous due date.
 *
 * Usage:
 *   npm run simulate:fsrs -- --grades=again,good,easy
 *
 * Options:
 *   --grades=...              Required comma-separated grades
 *   --timezone=UTC            Optional IANA timezone (default: UTC)
 *   --now=2026-03-31T12:00:00.000Z
 *   --stability=7
 *   --difficulty=5
 *   --last-reviewed-at=2026-03-28T00:00:00.000Z
 *   --retrieve-weight=0.5     Overdue boost weight (default: 0.5)
 *   --r-review-target=0.368   Retrievability threshold (default: e^-1 ≈ 0.368)
 *
 * --- Compare mode ---
 * Holds grade/stability/difficulty fixed and shows how interval changes depending
 * on whether you review early, on time, or late (overdue).
 *
 * Usage:
 *   npm run simulate:fsrs -- --compare --grade=good --stability=7
 *
 * Options (compare mode):
 *   --compare                 Enable compare mode
 *   --grade=good              Single grade to evaluate (default: good)
 *   --stability=7             Required: current stability in days
 *   --difficulty=5            Optional difficulty (default: 5)
 *   --offsets=-14,-7,-3,0,3,7,14,21
 *                             Comma-separated day offsets relative to due date
 *                             Negative = early, 0 = on time, positive = overdue
 *   --retrieve-weight=0.5     Override for testing
 *   --r-review-target=0.368   Override for testing
 *
 * Example — compare default vs doubled overdue boost:
 *   npm run simulate:fsrs -- --compare --grade=good --stability=7
 *   npm run simulate:fsrs -- --compare --grade=good --stability=7 --retrieve-weight=1.0
 */
import { parseArgs } from 'node:util';
import type { Grade } from './learning.schemas.js';
import { RETRIEVE_WEIGHT, R_REVIEW_TARGET } from './fsrsLight.js';
import {
  formatFsrsComparisonRows,
  formatFsrsSimulationRows,
  simulateComparisonPoints,
  simulateFsrsSequence,
} from './fsrsLight.simulation.js';

const VALID_GRADES: Grade[] = ['again', 'hard', 'good', 'easy'];

const DEFAULT_OFFSETS = [-14, -7, -3, -1, 0, 1, 3, 7, 14, 21, 30];

function getUsage(): string {
  return [
    'Usage (sequence mode):',
    '  npm run simulate:fsrs -- --grades=again,good,easy [options]',
    '',
    'Usage (compare mode):',
    '  npm run simulate:fsrs -- --compare --grade=good --stability=7 [options]',
    '',
    'Sequence options:',
    '  --grades=...              Required comma-separated grades',
    '  --timezone=UTC',
    '  --now=2026-03-31T12:00:00.000Z',
    '  --stability=7',
    '  --difficulty=5',
    '  --last-reviewed-at=2026-03-28T00:00:00.000Z',
    '',
    'Compare options:',
    '  --compare                 Enable compare mode',
    '  --grade=good              Grade to evaluate (default: good)',
    '  --stability=7             Required: current stability in days',
    '  --difficulty=5            Optional difficulty (default: 5)',
    `  --offsets=-14,-7,-3,0,3,7,14,21`,
    '                            Day offsets relative to due date',
    '',
    'Shared options:',
    `  --retrieve-weight=0.5     Overdue boost weight (default: ${RETRIEVE_WEIGHT})`,
    `  --r-review-target=0.368   Retrievability threshold (default: e^-1 ≈ ${R_REVIEW_TARGET.toFixed(6)})`,
    '  --help                    Show this message',
  ].join('\n');
}

function parseGrades(rawGrades: string | undefined): Grade[] {
  if (!rawGrades) {
    throw new Error('Missing required --grades option.\n\n' + getUsage());
  }

  const grades = rawGrades
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean);

  if (grades.length === 0) {
    throw new Error('At least one grade is required.');
  }

  const invalidGrade = grades.find((g) => !VALID_GRADES.includes(g as Grade));
  if (invalidGrade) {
    throw new Error(
      `Invalid grade "${invalidGrade}". Allowed grades: ${VALID_GRADES.join(', ')}`
    );
  }

  return grades as Grade[];
}

function parseSingleGrade(rawGrade: string | undefined): Grade {
  const grade = rawGrade?.trim() ?? 'good';
  if (!VALID_GRADES.includes(grade as Grade)) {
    throw new Error(`Invalid grade "${grade}". Allowed grades: ${VALID_GRADES.join(', ')}`);
  }
  return grade as Grade;
}

function parseOffsets(rawOffsets: string | undefined): number[] {
  if (!rawOffsets) return DEFAULT_OFFSETS;

  const offsets = rawOffsets
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const n = Number(s);
      if (Number.isNaN(n)) throw new Error(`Invalid offset "${s}" — must be an integer.`);
      return n;
    });

  if (offsets.length === 0) throw new Error('At least one offset is required.');
  return offsets;
}

function parseRequiredNumber(value: string | undefined, optionName: string): number {
  if (value === undefined) {
    throw new Error(`Missing required ${optionName} option.`);
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${optionName} must be a valid number.`);
  }
  return parsed;
}

function parseOptionalNumber(value: string | undefined, optionName: string): number | null {
  if (value === undefined) return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${optionName} must be a valid number.`);
  }
  return parsed;
}

function parseOptionalDate(value: string | undefined, optionName: string): Date | null {
  if (value === undefined) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${optionName} must be a valid ISO date string.`);
  }
  return date;
}

function validateTimezone(timezone: string): string {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return timezone;
  } catch {
    throw new Error(`Invalid timezone "${timezone}".`);
  }
}

function formatInitialValue(value: string | number | null): string {
  return value === null ? 'default' : String(value);
}

function formatCoefficient(value: number | null, defaultValue: number): string {
  return value !== null ? String(value) : `default (${defaultValue.toFixed(6)})`;
}

function runCompareMode(values: Record<string, string | boolean | undefined>): void {
  const grade = parseSingleGrade(values.grade as string | undefined);
  const stability = parseRequiredNumber(values.stability as string | undefined, '--stability');
  const difficulty = parseOptionalNumber(values.difficulty as string | undefined, '--difficulty');
  const offsets = parseOffsets(values.offsets as string | undefined);
  const retrieveWeight = parseOptionalNumber(values['retrieve-weight'] as string | undefined, '--retrieve-weight');
  const rReviewTarget = parseOptionalNumber(values['r-review-target'] as string | undefined, '--r-review-target');

  console.log('FSRS compare mode inputs');
  console.table([
    {
      grade,
      stability,
      difficulty: formatInitialValue(difficulty),
      offsets: offsets.join(','),
      retrieveWeight: formatCoefficient(retrieveWeight, RETRIEVE_WEIGHT),
      rReviewTarget: formatCoefficient(rReviewTarget, R_REVIEW_TARGET),
    },
  ]);

  const points = simulateComparisonPoints({
    grade,
    stabilityDays: stability,
    difficulty,
    offsets,
    retrieveWeight: retrieveWeight ?? undefined,
    rReviewTarget: rReviewTarget ?? undefined,
  });

  console.log(`FSRS compare results  (grade=${grade}, stability=${stability}d)`);
  console.table(formatFsrsComparisonRows(points));
}

function runSequenceMode(values: Record<string, string | boolean | undefined>): void {
  const grades = parseGrades(values.grades as string | undefined);
  const timezone = validateTimezone((values.timezone as string | undefined) ?? 'UTC');
  const now = parseOptionalDate(values.now as string | undefined, '--now');
  const stabilityDays = parseOptionalNumber(values.stability as string | undefined, '--stability');
  const difficulty = parseOptionalNumber(values.difficulty as string | undefined, '--difficulty');
  const lastReviewedAt = parseOptionalDate(values['last-reviewed-at'] as string | undefined, '--last-reviewed-at');
  const retrieveWeight = parseOptionalNumber(values['retrieve-weight'] as string | undefined, '--retrieve-weight');
  const rReviewTarget = parseOptionalNumber(values['r-review-target'] as string | undefined, '--r-review-target');

  const steps = simulateFsrsSequence({
    grades,
    timezone,
    now: now ?? undefined,
    stabilityDays,
    difficulty,
    lastReviewedAt,
    retrieveWeight: retrieveWeight ?? undefined,
    rReviewTarget: rReviewTarget ?? undefined,
  });

  console.log('FSRS simulation inputs');
  console.table([
    {
      grades: grades.join(','),
      timezone,
      now: formatInitialValue(now?.toISOString() ?? null),
      stabilityDays: formatInitialValue(stabilityDays),
      difficulty: formatInitialValue(difficulty),
      lastReviewedAt: formatInitialValue(lastReviewedAt?.toISOString() ?? null),
      retrieveWeight: formatCoefficient(retrieveWeight, RETRIEVE_WEIGHT),
      rReviewTarget: formatCoefficient(rReviewTarget, R_REVIEW_TARGET),
    },
  ]);

  console.log('FSRS simulation results');
  console.table(formatFsrsSimulationRows(steps));
}

function main(): void {
  const { values } = parseArgs({
    options: {
      compare: { type: 'boolean' },
      grade: { type: 'string' },
      grades: { type: 'string' },
      offsets: { type: 'string' },
      timezone: { type: 'string' },
      now: { type: 'string' },
      stability: { type: 'string' },
      difficulty: { type: 'string' },
      'last-reviewed-at': { type: 'string' },
      'retrieve-weight': { type: 'string' },
      'r-review-target': { type: 'string' },
      help: { type: 'boolean' },
    },
    allowPositionals: false,
  });

  if (values.help) {
    console.log(getUsage());
    return;
  }

  if (values.compare) {
    runCompareMode(values as Record<string, string | boolean | undefined>);
  } else {
    runSequenceMode(values as Record<string, string | boolean | undefined>);
  }
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(message);
  process.exitCode = 1;
}
