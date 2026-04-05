import { Goal, UserSettings } from '@/src/models/types';
import { updateUserSettingsRecord } from '@/src/services/progress-service';
import {
  clearGoalResolutionSchedules,
  clearReminderSchedule,
  getNotificationPermissionsGranted,
  syncGoalResolutionSchedules,
  syncReminderSchedule,
} from '@/src/services/notifications';

export function buildNextUserSettings(current: UserSettings, input: Partial<UserSettings>): UserSettings {
  return {
    remindersEnabled: input.remindersEnabled ?? current.remindersEnabled,
    goalResolutionReminderEnabled: input.goalResolutionReminderEnabled ?? current.goalResolutionReminderEnabled,
    reminderHour: input.reminderHour ?? current.reminderHour,
    reminderMinute: input.reminderMinute ?? current.reminderMinute,
    pendingPunishmentReminderEnabled:
      input.pendingPunishmentReminderEnabled ?? current.pendingPunishmentReminderEnabled,
  };
}

export async function updateSettingsUseCase(current: UserSettings, input: Partial<UserSettings>) {
  const nextSettings = buildNextUserSettings(current, input);
  const persistedSettings = await updateUserSettingsRecord(nextSettings);
  return persistedSettings;
}

export async function syncPersistedReminderSettingsUseCase(settings: UserSettings, goals: Goal[]) {
  const permissionsGranted = await getNotificationPermissionsGranted();

  await syncReminderSchedule(settings, permissionsGranted);
  await syncGoalResolutionSchedules(goals, settings, permissionsGranted);
}

export async function clearReminderScheduleUseCase() {
  await clearReminderSchedule();
  await clearGoalResolutionSchedules();
}
