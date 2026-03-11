import { UserSettings } from '@/src/models/types';
import { updateUserSettingsRecord } from '@/src/repositories/app-repository';
import { clearReminderSchedule, syncReminderSchedule } from '@/src/services/notifications';

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
  await syncReminderSchedule(persistedSettings);
  return persistedSettings;
}

export async function syncPersistedReminderSettingsUseCase(settings: UserSettings) {
  await syncReminderSchedule(settings);
}

export async function clearReminderScheduleUseCase() {
  await clearReminderSchedule();
}