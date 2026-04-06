export interface ReminderStateResponse {
  dailyRemindersEnabled: boolean;
  hasActivePushSubscription: boolean;
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
