import { Goal, UserSettings } from '@/src/models/types';
import { updateUserSettingsRecord } from '@/src/services/progress-service';
import { clearGoalResolutionSchedules, clearReminderSchedule, syncGoalResolutionSchedules, syncReminderSchedule } from '@/src/services/notifications';

export function buildNextUserSettings(current: UserSettings, input: Partial<UserSettings>): UserSettings {
  return {
    remindersEnabled: input.remindersEnabled ?? current.remindersEnabled,
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
  await Promise.all([
    syncReminderSchedule(settings),
    syncGoalResolutionSchedules(goals, settings),
  ]);
}

export async function clearReminderScheduleUseCase() {
  await Promise.all([clearReminderSchedule(), clearGoalResolutionSchedules()]);
}
