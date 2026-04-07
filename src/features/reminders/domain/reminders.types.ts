export interface ReminderStateResponse {
  dailyRemindersEnabled: boolean;
  hasActivePushSubscription: boolean;
  reminderTimeLocal: string;
  timezone: string;
}

export interface UpdateReminderSettingsRequest {
  dailyRemindersEnabled?: boolean;
  reminderTimeLocal?: string;
  timezone?: string;
}

export interface SavePushSubscriptionRequest {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime: string | null;
}

export type ReminderCapabilityStatus =
  | 'unsupported'
  | 'permission-denied'
  | 'enabled'
  | 'disabled';
