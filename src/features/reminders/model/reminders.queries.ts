export const REMINDERS_KEYS = {
  all: ['reminders'] as const,
  state: () => [...REMINDERS_KEYS.all, 'state'] as const,
} as const;
