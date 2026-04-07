import { useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/shared/lib/toast';
import * as remindersApi from '../api/remindersApi';
import type { ReminderCapabilityStatus } from '../domain/reminders.types';
import { REMINDERS_KEYS } from './reminders.queries';
import {
  createPushSubscription,
  getExistingPushSubscription,
  supportsWebPush,
} from '@/shared/lib/push/pushClient';
import { DEBUG_ACTIONS } from '@/shared/config/env';
import { getBrowserTimezone } from '@/shared/lib/browserTimezone';

function getPermissionState(): NotificationPermission {
  if (typeof Notification === 'undefined') return 'denied';
  return Notification.permission;
}

export function useDailyReminders() {
  const queryClient = useQueryClient();
  const capabilitySupported = supportsWebPush();
  const browserTimezone = getBrowserTimezone();
  const permission = capabilitySupported ? getPermissionState() : 'denied';
  const timezoneSyncRef = useRef<string | null>(null);

  const stateQuery = useQuery({
    queryKey: REMINDERS_KEYS.state(),
    queryFn: remindersApi.getReminderState,
  });

  const updateReminderSettingsMutation = useMutation({
    mutationFn: remindersApi.updateReminderSettings,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: REMINDERS_KEYS.state() });
    },
  });

  const saveSubscriptionMutation = useMutation({
    mutationFn: remindersApi.savePushSubscription,
  });

  const deactivateSubscriptionMutation = useMutation({
    mutationFn: remindersApi.deactivatePushSubscription,
  });
  const runDebugJobMutation = useMutation({
    mutationFn: remindersApi.runDailyReminderJobDebug,
  });

  const isBusy =
    stateQuery.isLoading ||
    updateReminderSettingsMutation.isPending ||
    saveSubscriptionMutation.isPending ||
    deactivateSubscriptionMutation.isPending ||
    runDebugJobMutation.isPending;

  useEffect(() => {
    const serverTimezone = stateQuery.data?.timezone;
    if (!serverTimezone || updateReminderSettingsMutation.isPending) return;
    if (serverTimezone === browserTimezone) {
      timezoneSyncRef.current = null;
      return;
    }
    if (timezoneSyncRef.current === browserTimezone) return;

    timezoneSyncRef.current = browserTimezone;
    void updateReminderSettingsMutation
      .mutateAsync({ timezone: browserTimezone })
      .catch(() => {
        timezoneSyncRef.current = null;
      });
  }, [
    browserTimezone,
    stateQuery.data?.timezone,
    updateReminderSettingsMutation,
    updateReminderSettingsMutation.isPending,
  ]);

  const status: ReminderCapabilityStatus = useMemo(() => {
    if (!capabilitySupported) return 'unsupported';
    if (permission === 'denied') return 'permission-denied';
    if (stateQuery.data?.dailyRemindersEnabled) return 'enabled';
    return 'disabled';
  }, [capabilitySupported, permission, stateQuery.data?.dailyRemindersEnabled]);

  const enable = async (reminderTimeLocal?: string): Promise<boolean> => {
    try {
      if (!capabilitySupported) {
        showToast('Browser does not support push notifications');
        return false;
      }

      const permissionResult = await Notification.requestPermission();
      if (permissionResult !== 'granted') {
        showToast('Notification permission was not granted');
        return false;
      }

      const existingSubscription = await getExistingPushSubscription();
      const subscription = existingSubscription ?? (await createPushSubscription());
      const json = subscription.toJSON();
      const p256dh = json.keys?.p256dh;
      const auth = json.keys?.auth;
      if (!json.endpoint || !p256dh || !auth) {
        showToast('Unable to read browser push subscription');
        return false;
      }

      await saveSubscriptionMutation.mutateAsync({
        endpoint: json.endpoint,
        keys: { p256dh, auth },
        expirationTime:
          typeof json.expirationTime === 'number'
            ? new Date(json.expirationTime).toISOString()
            : null,
      });
      await updateReminderSettingsMutation.mutateAsync({
        dailyRemindersEnabled: true,
        reminderTimeLocal: reminderTimeLocal ?? stateQuery.data?.reminderTimeLocal ?? '09:00',
        timezone: browserTimezone,
      });
      showToast('Daily reminders enabled');
      return true;
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Unknown error';
      showToast(`Failed to enable daily reminders: ${message}`);
      return false;
    }
  };

  const disable = async (): Promise<boolean> => {
    try {
      const currentSubscription = await getExistingPushSubscription();
      if (currentSubscription?.endpoint) {
        try {
          await deactivateSubscriptionMutation.mutateAsync(currentSubscription.endpoint);
        } catch {
          // Deactivation is best-effort; backend reminder flag update still proceeds below.
        }
        try {
          await currentSubscription.unsubscribe();
        } catch {
          // Local unsubscribe can fail while backend is already disabled; keep flow resilient.
        }
      }

      await updateReminderSettingsMutation.mutateAsync({
        dailyRemindersEnabled: false,
        timezone: browserTimezone,
      });
      showToast('Daily reminders disabled');
      return true;
    } catch {
      showToast('Failed to disable daily reminders');
      return false;
    }
  };

  const saveReminderTimeLocal = async (reminderTimeLocal: string): Promise<boolean> => {
    try {
      await updateReminderSettingsMutation.mutateAsync({
        reminderTimeLocal,
        timezone: browserTimezone,
      });
      return true;
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Unknown error';
      showToast(`Failed to update reminder time: ${message}`);
      return false;
    }
  };

  const runDebugJobNow = async (): Promise<boolean> => {
    try {
      const result = await runDebugJobMutation.mutateAsync();
      showToast(
        `Debug push scheduled in ${result.scheduledInSeconds}s (active subscriptions now: ${result.activeSubscriptionsNow}). You can switch tabs to observe notification.`
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Unknown error';
      showToast(`Failed to run reminder job: ${message}`);
      return false;
    }
  };

  return {
    status,
    isBusy,
    permission,
    remindersEnabled: Boolean(stateQuery.data?.dailyRemindersEnabled),
    hasActivePushSubscription: Boolean(stateQuery.data?.hasActivePushSubscription),
    reminderTimeLocal: stateQuery.data?.reminderTimeLocal ?? '09:00',
    timezone: stateQuery.data?.timezone ?? browserTimezone,
    showDebugActions: DEBUG_ACTIONS,
    enable,
    disable,
    saveReminderTimeLocal,
    runDebugJobNow,
  };
}
