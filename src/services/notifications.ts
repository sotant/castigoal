import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { Goal, UserSettings } from '@/src/models/types';
import { getGoalDeadline } from '@/src/utils/goal-evaluation';
import { addDays } from '@/src/utils/date';

type NotificationsModule = typeof import('expo-notifications');

type GoalNotificationRecord = {
  goalId: string;
  identifier: string;
  triggerDate: string;
};

const GENERAL_NOTIFICATION_IDS_KEY = 'castigoal.notifications.general';
const GOAL_NOTIFICATION_IDS_KEY = 'castigoal.notifications.goal-resolution';
const GOAL_RESOLUTION_NOTIFICATION_BODY = 'Un objetivo ha finalizado! Entra para ver el resultado';

let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;
let appliedReminderKey: string | null = null;

function isExpoGo() {
  return Constants.executionEnvironment === 'storeClient';
}

function buildReminderKey(settings: UserSettings) {
  return JSON.stringify(settings);
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const value = await AsyncStorage.getItem(key);
  return value ? (JSON.parse(value) as T) : fallback;
}

async function writeJson(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
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

async function cancelScheduledNotifications(identifiers: string[]) {
  const Notifications = await getNotificationsModule();

  if (!Notifications || identifiers.length === 0) {
    return;
  }

  await Promise.all(identifiers.map((identifier) => Notifications.cancelScheduledNotificationAsync(identifier)));
}

async function readGeneralNotificationIds() {
  return readJson<string[]>(GENERAL_NOTIFICATION_IDS_KEY, []);
}

async function writeGeneralNotificationIds(ids: string[]) {
  await writeJson(GENERAL_NOTIFICATION_IDS_KEY, ids);
}

async function readGoalNotificationRecords() {
  return readJson<GoalNotificationRecord[]>(GOAL_NOTIFICATION_IDS_KEY, []);
}

async function writeGoalNotificationRecords(records: GoalNotificationRecord[]) {
  await writeJson(GOAL_NOTIFICATION_IDS_KEY, records);
}

function buildGoalNotificationTrigger(goal: Goal, settings: UserSettings) {
  const triggerDate = addDays(getGoalDeadline(goal), 1);
  const notificationDate = new Date(`${triggerDate}T00:00:00`);
  notificationDate.setHours(settings.reminderHour, settings.reminderMinute, 0, 0);
  return notificationDate;
}

function shouldScheduleGoalNotification(goal: Goal, settings: UserSettings) {
  if (!settings.remindersEnabled) {
    return false;
  }

  if (goal.resolutionStatus !== 'pending' || goal.lifecycleStatus !== 'active') {
    return false;
  }

  return buildGoalNotificationTrigger(goal, settings).getTime() > Date.now();
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

  const existingIds = await readGeneralNotificationIds();
  await cancelScheduledNotifications(existingIds);
  await writeGeneralNotificationIds([]);
}

export async function clearGoalResolutionSchedules() {
  const existing = await readGoalNotificationRecords();
  await cancelScheduledNotifications(existing.map((record) => record.identifier));
  await writeGoalNotificationRecords([]);
}

export async function syncReminderSchedule(settings: UserSettings) {
  const reminderKey = buildReminderKey(settings);

  if (appliedReminderKey === reminderKey) {
    return;
  }

  const Notifications = await getNotificationsModule();
  const existingIds = await readGeneralNotificationIds();

  if (!Notifications) {
    appliedReminderKey = reminderKey;
    return;
  }

  await cancelScheduledNotifications(existingIds);
  await writeGeneralNotificationIds([]);

  if (!settings.remindersEnabled) {
    appliedReminderKey = reminderKey;
    return;
  }

  const granted = await requestNotificationPermissions();

  if (!granted) {
    appliedReminderKey = reminderKey;
    return;
  }

  const ids: string[] = [];

  ids.push(
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
    }),
  );

  if (settings.pendingPunishmentReminderEnabled) {
    ids.push(
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
      }),
    );
  }

  await writeGeneralNotificationIds(ids);
  appliedReminderKey = reminderKey;
}

export async function syncGoalResolutionSchedules(goals: Goal[], settings: UserSettings) {
  const Notifications = await getNotificationsModule();
  const existingRecords = await readGoalNotificationRecords();

  if (!Notifications) {
    return;
  }

  const desiredGoals = goals.filter((goal) => shouldScheduleGoalNotification(goal, settings));

  if (desiredGoals.length === 0) {
    await cancelScheduledNotifications(existingRecords.map((record) => record.identifier));
    await writeGoalNotificationRecords([]);
    return;
  }

  const granted = await requestNotificationPermissions();

  if (!granted) {
    await cancelScheduledNotifications(existingRecords.map((record) => record.identifier));
    await writeGoalNotificationRecords([]);
    return;
  }

  const existingByGoalId = new Map(existingRecords.map((record) => [record.goalId, record]));
  const desiredGoalIds = new Set(desiredGoals.map((goal) => goal.id));
  const staleRecords = existingRecords.filter((record) => !desiredGoalIds.has(record.goalId));

  await cancelScheduledNotifications(staleRecords.map((record) => record.identifier));

  const nextRecords: GoalNotificationRecord[] = [];

  for (const goal of desiredGoals) {
    const triggerDate = buildGoalNotificationTrigger(goal, settings);
    const triggerDateIso = triggerDate.toISOString();
    const currentRecord = existingByGoalId.get(goal.id);

    if (currentRecord && currentRecord.triggerDate === triggerDateIso) {
      nextRecords.push(currentRecord);
      continue;
    }

    if (currentRecord) {
      await cancelScheduledNotifications([currentRecord.identifier]);
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Castigoal',
        body: GOAL_RESOLUTION_NOTIFICATION_BODY,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    nextRecords.push({
      goalId: goal.id,
      identifier,
      triggerDate: triggerDateIso,
    });
  }

  await writeGoalNotificationRecords(nextRecords);
}
