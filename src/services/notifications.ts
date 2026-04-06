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

type ScheduledNotification = Awaited<ReturnType<NotificationsModule['getAllScheduledNotificationsAsync']>>[number];

const GENERAL_NOTIFICATION_IDS_KEY = 'castigoal.notifications.general';
const GOAL_NOTIFICATION_IDS_KEY = 'castigoal.notifications.goal-resolution';
const MANAGED_NOTIFICATION_NAMESPACE = 'castigoal';
const GENERAL_CHECKIN_NOTIFICATION_KIND = 'general-checkin';
const PENDING_PUNISHMENT_NOTIFICATION_KIND = 'pending-punishment';
const GOAL_RESOLUTION_NOTIFICATION_KIND = 'goal-resolution';
const CHECKIN_REMINDER_BODY = 'Haz tu check-in diario antes de cerrar el d\u00eda.';
const PENDING_PUNISHMENT_REMINDER_BODY = 'Tienes un castigo pendiente por completar.';
const GOAL_RESOLUTION_NOTIFICATION_BODY = 'Un objetivo ha finalizado! Entra para ver el resultado';

let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;
let notificationSyncQueue: Promise<void> = Promise.resolve();
let appliedReminderKey: string | null = null;
let appliedGoalResolutionKey: string | null = null;

function isExpoGo() {
  return Constants.executionEnvironment === 'storeClient';
}

function buildReminderKey(settings: UserSettings, hasPendingPunishments: boolean) {
  return JSON.stringify({
    hasPendingPunishments,
    settings,
  });
}

function buildGoalResolutionKey(goals: Goal[], settings: UserSettings) {
  const desiredGoalTriggers = goals
    .filter((goal) => shouldScheduleGoalNotification(goal, settings))
    .map((goal) => `${goal.id}:${buildGoalNotificationTrigger(goal, settings).toISOString()}`)
    .sort();

  return JSON.stringify({
    desiredGoalTriggers,
    goalResolutionReminderEnabled: settings.goalResolutionReminderEnabled,
    reminderHour: settings.reminderHour,
    reminderMinute: settings.reminderMinute,
  });
}

function hasAnyScheduledReminderEnabled(settings: UserSettings, hasPendingPunishments: boolean) {
  return settings.remindersEnabled || (settings.pendingPunishmentReminderEnabled && hasPendingPunishments);
}

function buildNotificationData(kind: string) {
  return {
    kind,
    namespace: MANAGED_NOTIFICATION_NAMESPACE,
  };
}

function hasManagedNotificationKind(notification: ScheduledNotification, kind: string) {
  const data = notification.content.data;

  if (!data || typeof data !== 'object') {
    return false;
  }

  const parsed = data as Record<string, unknown>;
  return parsed.namespace === MANAGED_NOTIFICATION_NAMESPACE && parsed.kind === kind;
}

function isCheckinReminderNotification(notification: ScheduledNotification) {
  return (
    hasManagedNotificationKind(notification, GENERAL_CHECKIN_NOTIFICATION_KIND) ||
    (notification.content.title === 'Castigoal' && notification.content.body === CHECKIN_REMINDER_BODY)
  );
}

function isPendingPunishmentReminderNotification(notification: ScheduledNotification) {
  return (
    hasManagedNotificationKind(notification, PENDING_PUNISHMENT_NOTIFICATION_KIND) ||
    (notification.content.title === 'Castigo pendiente' &&
      notification.content.body === PENDING_PUNISHMENT_REMINDER_BODY)
  );
}

function isGoalResolutionNotification(notification: ScheduledNotification) {
  return (
    hasManagedNotificationKind(notification, GOAL_RESOLUTION_NOTIFICATION_KIND) ||
    (notification.content.title === 'Castigoal' && notification.content.body === GOAL_RESOLUTION_NOTIFICATION_BODY)
  );
}

function uniqueIdentifiers(...identifierGroups: string[][]) {
  return Array.from(new Set(identifierGroups.flat().filter(Boolean)));
}

function runExclusiveNotificationMutation<T>(mutation: () => Promise<T>) {
  const task = notificationSyncQueue.then(mutation, mutation);
  notificationSyncQueue = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
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

async function getManagedScheduledNotificationIds(
  predicate: (notification: ScheduledNotification) => boolean,
) {
  const Notifications = await getNotificationsModule();

  if (!Notifications) {
    return [];
  }

  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  return scheduledNotifications.filter(predicate).map((notification) => notification.identifier);
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
  if (!settings.goalResolutionReminderEnabled) {
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

export async function getNotificationPermissionsGranted() {
  const Notifications = await getNotificationsModule();

  if (!Notifications) {
    return false;
  }

  const current = await Notifications.getPermissionsAsync();
  return current.granted;
}

export async function clearReminderSchedule() {
  await runExclusiveNotificationMutation(async () => {
    appliedReminderKey = null;

    const existingIds = await readGeneralNotificationIds();
    const managedIds = await getManagedScheduledNotificationIds(
      (notification) =>
        isCheckinReminderNotification(notification) || isPendingPunishmentReminderNotification(notification),
    );

    await cancelScheduledNotifications(uniqueIdentifiers(existingIds, managedIds));
    await writeGeneralNotificationIds([]);
  });
}

export async function clearGoalResolutionSchedules() {
  await runExclusiveNotificationMutation(async () => {
    appliedGoalResolutionKey = null;

    const existing = await readGoalNotificationRecords();
    const managedIds = await getManagedScheduledNotificationIds(isGoalResolutionNotification);

    await cancelScheduledNotifications(
      uniqueIdentifiers(
        existing.map((record) => record.identifier),
        managedIds,
      ),
    );
    await writeGoalNotificationRecords([]);
  });
}

export async function syncReminderSchedule(
  settings: UserSettings,
  hasPendingPunishments: boolean,
  permissionsGranted?: boolean,
) {
  await runExclusiveNotificationMutation(async () => {
    const reminderKey = buildReminderKey(settings, hasPendingPunishments);

    if (appliedReminderKey === reminderKey) {
      return;
    }

    const Notifications = await getNotificationsModule();
    const existingIds = await readGeneralNotificationIds();
    const managedIds = await getManagedScheduledNotificationIds(
      (notification) =>
        isCheckinReminderNotification(notification) || isPendingPunishmentReminderNotification(notification),
    );

    if (!Notifications) {
      appliedReminderKey = reminderKey;
      return;
    }

    await cancelScheduledNotifications(uniqueIdentifiers(existingIds, managedIds));
    await writeGeneralNotificationIds([]);

    if (!hasAnyScheduledReminderEnabled(settings, hasPendingPunishments)) {
      appliedReminderKey = reminderKey;
      return;
    }

    const granted = permissionsGranted ?? (await getNotificationPermissionsGranted());

    if (!granted) {
      appliedReminderKey = reminderKey;
      return;
    }

    const ids: string[] = [];

    if (settings.remindersEnabled) {
      ids.push(
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Castigoal',
            body: CHECKIN_REMINDER_BODY,
            data: buildNotificationData(GENERAL_CHECKIN_NOTIFICATION_KIND),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: settings.reminderHour,
            minute: settings.reminderMinute,
          },
        }),
      );
    }

    if (settings.pendingPunishmentReminderEnabled && hasPendingPunishments) {
      ids.push(
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Castigo pendiente',
            body: PENDING_PUNISHMENT_REMINDER_BODY,
            data: buildNotificationData(PENDING_PUNISHMENT_NOTIFICATION_KIND),
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
  });
}

export async function syncGoalResolutionSchedules(goals: Goal[], settings: UserSettings, permissionsGranted?: boolean) {
  await runExclusiveNotificationMutation(async () => {
    const goalResolutionKey = buildGoalResolutionKey(goals, settings);

    if (appliedGoalResolutionKey === goalResolutionKey) {
      return;
    }

    const Notifications = await getNotificationsModule();
    const existingRecords = await readGoalNotificationRecords();
    const managedIds = await getManagedScheduledNotificationIds(isGoalResolutionNotification);

    if (!Notifications) {
      appliedGoalResolutionKey = goalResolutionKey;
      return;
    }

    await cancelScheduledNotifications(
      uniqueIdentifiers(
        existingRecords.map((record) => record.identifier),
        managedIds,
      ),
    );
    await writeGoalNotificationRecords([]);

    const desiredGoals = goals.filter((goal) => shouldScheduleGoalNotification(goal, settings));

    if (desiredGoals.length === 0) {
      appliedGoalResolutionKey = goalResolutionKey;
      return;
    }

    const granted = permissionsGranted ?? (await getNotificationPermissionsGranted());

    if (!granted) {
      appliedGoalResolutionKey = goalResolutionKey;
      return;
    }

    const nextRecords: GoalNotificationRecord[] = [];

    for (const goal of desiredGoals) {
      const triggerDate = buildGoalNotificationTrigger(goal, settings);
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Castigoal',
          body: GOAL_RESOLUTION_NOTIFICATION_BODY,
          data: buildNotificationData(GOAL_RESOLUTION_NOTIFICATION_KIND),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });

      nextRecords.push({
        goalId: goal.id,
        identifier,
        triggerDate: triggerDate.toISOString(),
      });
    }

    await writeGoalNotificationRecords(nextRecords);
    appliedGoalResolutionKey = goalResolutionKey;
  });
}
