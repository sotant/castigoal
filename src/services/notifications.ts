import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { UserSettings } from '@/src/models/types';

type NotificationsModule = typeof import('expo-notifications');

let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;
let appliedReminderKey: string | null = null;

function isExpoGo() {
  return Constants.executionEnvironment === 'storeClient';
}

function buildReminderKey(settings: UserSettings) {
  return JSON.stringify(settings);
}

async function getNotificationsModule() {
  if (Platform.OS === 'web' || isExpoGo()) {
    return null;
  }

  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications').then((Notifications) => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });

      return Notifications;
    });
  }

  return notificationsModulePromise;
}

export async function requestNotificationPermissions() {
  const Notifications = await getNotificationsModule();

  if (!Notifications) {
    return false;
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function clearReminderSchedule() {
  appliedReminderKey = null;

  const Notifications = await getNotificationsModule();

  if (!Notifications) {
    return;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function syncReminderSchedule(settings: UserSettings) {
  const reminderKey = buildReminderKey(settings);

  if (appliedReminderKey === reminderKey) {
    return;
  }

  const Notifications = await getNotificationsModule();

  if (!Notifications) {
    appliedReminderKey = reminderKey;
    return;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!settings.remindersEnabled) {
    appliedReminderKey = reminderKey;
    return;
  }

  const granted = await requestNotificationPermissions();

  if (!granted) {
    appliedReminderKey = reminderKey;
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Castigoal',
      body: 'Haz tu check-in diario antes de cerrar el dia.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: settings.reminderHour,
      minute: settings.reminderMinute,
    },
  });

  if (settings.pendingPunishmentReminderEnabled) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Castigo pendiente',
        body: 'Tienes una consecuencia pendiente por completar.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: Math.min(settings.reminderHour + 2, 22),
        minute: settings.reminderMinute,
      },
    });
  }

  appliedReminderKey = reminderKey;
}