import { z } from 'zod';

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
  dailyRemindersEnabled: z.boolean(),
});
