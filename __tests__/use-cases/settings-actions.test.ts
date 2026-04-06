jest.mock('@/src/services/progress-service', () => ({
  updateUserSettingsRecord: jest.fn(async (input) => input),
}));

jest.mock('@/src/services/notifications', () => ({
  clearGoalResolutionSchedules: jest.fn(async () => undefined),
  clearReminderSchedule: jest.fn(async () => undefined),
  getNotificationPermissionsGranted: jest.fn(async () => true),
  syncGoalResolutionSchedules: jest.fn(async () => undefined),
  syncReminderSchedule: jest.fn(async () => undefined),
}));

import type { Goal, UserSettings } from '@/src/models/types';
import {
  buildNextUserSettings,
  clearReminderScheduleUseCase,
  syncPersistedReminderSettingsUseCase,
  updateSettingsUseCase,
} from '@/src/use-cases/settings-actions';
import {
  clearGoalResolutionSchedules,
  clearReminderSchedule,
  getNotificationPermissionsGranted,
  syncGoalResolutionSchedules,
  syncReminderSchedule,
} from '@/src/services/notifications';
import { updateUserSettingsRecord } from '@/src/services/progress-service';

const baseSettings: UserSettings = {
  remindersEnabled: true,
  goalResolutionReminderEnabled: true,
  reminderHour: 20,
  reminderMinute: 0,
  pendingPunishmentReminderEnabled: true,
};

describe('settings actions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('merges partial user settings over the current ones', () => {
    expect(
      buildNextUserSettings(baseSettings, {
        reminderHour: 8,
        pendingPunishmentReminderEnabled: false,
      }),
    ).toEqual({
      remindersEnabled: true,
      goalResolutionReminderEnabled: true,
      reminderHour: 8,
      reminderMinute: 0,
      pendingPunishmentReminderEnabled: false,
    });
  });

  test('persists the merged settings', async () => {
    await expect(
      updateSettingsUseCase(baseSettings, {
        reminderMinute: 30,
      }),
    ).resolves.toEqual({
      remindersEnabled: true,
      goalResolutionReminderEnabled: true,
      reminderHour: 20,
      reminderMinute: 30,
      pendingPunishmentReminderEnabled: true,
    });

    expect(updateUserSettingsRecord).toHaveBeenCalledWith({
      remindersEnabled: true,
      goalResolutionReminderEnabled: true,
      reminderHour: 20,
      reminderMinute: 30,
      pendingPunishmentReminderEnabled: true,
    });
  });

  test('syncs reminder schedules with the current permission state', async () => {
    const goals: Goal[] = [
      {
        id: 'goal-1',
        title: 'Entrenar',
        description: undefined,
        startDate: '2026-04-01',
        targetDays: 7,
        minimumSuccessRate: 70,
        active: true,
        lifecycleStatus: 'active',
        resolutionStatus: 'pending',
        punishmentConfig: {
          scope: 'base',
          categoryMode: 'all',
          categoryNames: [],
        },
        createdAt: '2026-04-01T10:00:00.000Z',
        updatedAt: '2026-04-01T10:00:00.000Z',
      },
    ];

    await syncPersistedReminderSettingsUseCase(baseSettings, goals, true);

    expect(getNotificationPermissionsGranted).toHaveBeenCalledTimes(1);
    expect(syncReminderSchedule).toHaveBeenCalledWith(baseSettings, true, true);
    expect(syncGoalResolutionSchedules).toHaveBeenCalledWith(goals, baseSettings, true);
  });

  test('clears both general and goal resolution schedules', async () => {
    await clearReminderScheduleUseCase();

    expect(clearReminderSchedule).toHaveBeenCalledTimes(1);
    expect(clearGoalResolutionSchedules).toHaveBeenCalledTimes(1);
  });
});
