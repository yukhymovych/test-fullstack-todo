import { z } from 'zod';
import { isValidTimezone } from './reminderSchedule.js';

export const pushSubscriptionBodySchema = z.object({
  endpoint: z.string().url().max(4000),
  keys: z.object({
    p256dh: z.string().min(1).max(2048),
    auth: z.string().min(1).max(1024),
  }),
  expirationTime: z.string().datetime().nullable().optional(),
});

export const deactivatePushSubscriptionBodySchema = z.object({
  endpoint: z.string().url().max(4000),
});

export const updateReminderSettingsBodySchema = z.object({
  dailyRemindersEnabled: z.boolean().optional(),
  reminderTimeLocal: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Expected HH:mm')
    .optional(),
  timezone: z
    .string()
    .min(1)
    .max(64)
    .refine((value) => isValidTimezone(value), 'Invalid timezone')
    .optional(),
}).refine(
  (value) =>
    value.dailyRemindersEnabled !== undefined ||
    value.reminderTimeLocal !== undefined ||
    value.timezone !== undefined,
  {
    message: 'At least one reminder setting must be provided',
  }
);
