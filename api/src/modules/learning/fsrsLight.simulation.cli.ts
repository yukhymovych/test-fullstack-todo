/**
 * Dry-run FSRS scheduler simulator.
 *
 * Usage:
 * `npm run simulate:fsrs -- --grades=again,good,easy`
 *
 * Optional flags:
 * `--timezone=UTC`
 * `--now=2026-03-31T12:00:00.000Z`
 * `--stability=7`
 * `--difficulty=5`
 * `--last-reviewed-at=2026-03-28T00:00:00.000Z`
 *
 * Example:
 * `npm run simulate:fsrs -- --grades=again,good,easy --stability=7 --difficulty=5`
 */
import { parseArgs } from 'node:util';
import type { Grade } from './learning.schemas.js';
import {
  formatFsrsSimulationRows,
  simulateFsrsSequence,
} from './fsrsLight.simulation.js';

const VALID_GRADES: Grade[] = ['again', 'hard', 'good', 'easy'];

function getUsage(): string {
  return [
    'Usage:',
    '  npm run simulate:fsrs -- --grades=again,good,easy [options]',
    '',
    'Options:',
    '  --grades=...              Required comma-separated grades',
    '  --timezone=UTC            Optional IANA timezone',
    '  --now=2026-03-31T12:00:00.000Z',
    '  --stability=7',
    '  --difficulty=5',
    '  --last-reviewed-at=2026-03-28T00:00:00.000Z',
    '  --help                    Show this message',
  ].join('\n');
}

function parseGrades(rawGrades: string | undefined): Grade[] {
  if (!rawGrades) {
    throw new Error('Missing required --grades option.\n\n' + getUsage());
  }

  const grades = rawGrades
    .split(',')
    .map((grade) => grade.trim())
    .filter(Boolean);

  if (grades.length === 0) {
    throw new Error('At least one grade is required.');
  }

  const invalidGrade = grades.find((grade) => !VALID_GRADES.includes(grade as Grade));
  if (invalidGrade) {
    throw new Error(
      `Invalid grade "${invalidGrade}". Allowed grades: ${VALID_GRADES.join(', ')}`
    );
  }

  return grades as Grade[];
}

function parseOptionalNumber(value: string | undefined, optionName: string): number | null {
  if (value === undefined) {
    return null;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${optionName} must be a valid number.`);
  }

  return parsed;
}

function parseOptionalDate(value: string | undefined, optionName: string): Date | null {
  if (value === undefined) {
    return null;
  }

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

function main(): void {
  const { values } = parseArgs({
    options: {
      grades: { type: 'string' },
      timezone: { type: 'string' },
      now: { type: 'string' },
      stability: { type: 'string' },
      difficulty: { type: 'string' },
      'last-reviewed-at': { type: 'string' },
      help: { type: 'boolean' },
    },
    allowPositionals: false,
  });

  if (values.help) {
    console.log(getUsage());
    return;
  }

  const grades = parseGrades(values.grades);
  const timezone = validateTimezone(values.timezone ?? 'UTC');
  const now = parseOptionalDate(values.now, '--now');
  const stabilityDays = parseOptionalNumber(values.stability, '--stability');
  const difficulty = parseOptionalNumber(values.difficulty, '--difficulty');
  const lastReviewedAt = parseOptionalDate(values['last-reviewed-at'], '--last-reviewed-at');

  const steps = simulateFsrsSequence({
    grades,
    timezone,
    now: now ?? undefined,
    stabilityDays,
    difficulty,
    lastReviewedAt,
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
    },
  ]);

  console.log('FSRS simulation results');
  console.table(formatFsrsSimulationRows(steps));
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(message);
  process.exitCode = 1;
}
