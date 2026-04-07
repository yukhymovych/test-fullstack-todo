import { http } from '@/shared/api/http';
import type {
  ReminderStateResponse,
  SavePushSubscriptionRequest,
  UpdateReminderSettingsRequest,
} from '../domain/reminders.types';

export async function getReminderState(): Promise<ReminderStateResponse> {
  return http.get<ReminderStateResponse>('/reminders/users/me/reminder-settings');
}

export async function updateReminderSettings(
  payload: UpdateReminderSettingsRequest
): Promise<{
  dailyRemindersEnabled: boolean;
  reminderTimeLocal: string;
  timezone: string;
}> {
  return http.patch<{
    dailyRemindersEnabled: boolean;
    reminderTimeLocal: string;
    timezone: string;
  }>(
    '/reminders/users/me/reminder-settings',
    payload
  );
}

export async function savePushSubscription(
  payload: SavePushSubscriptionRequest
): Promise<{ success: true }> {
  return http.post<{ success: true }>('/reminders/push-subscriptions', payload);
}

export async function deactivatePushSubscription(
  endpoint: string
): Promise<{ success: true }> {
  return http.delete<{ success: true }>('/reminders/push-subscriptions', { endpoint });
}

export async function runDailyReminderJobDebug(): Promise<{
  success: true;
  scheduledInSeconds: number;
  activeSubscriptionsNow: number;
}> {
  return http.post('/reminders/debug/run-daily-job');
}
