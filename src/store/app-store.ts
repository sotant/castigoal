import { create } from 'zustand';

import { createAppError } from '@/src/lib/app-error';
import {
  AssignedPunishmentDetail,
  CompletedPunishmentHistoryEntry,
  Goal,
  GoalCalendarDay,
  GoalDetailSummary,
  GoalEvaluation,
  GoalResolutionAnnouncement,
  HomeSummary,
  PendingAssignedPunishmentSummary,
  Punishment,
  PunishmentMutationInput,
  StatsSummary,
  User,
  UserSettings,
} from '@/src/models/types';
import {
  AppSessionState,
  GoalInput,
  loadGoalCalendarMonth,
  loadGoalDetail,
  loadGoalEvaluations,
  loadGoalResolutionAnnouncements,
  loadHomeSummary,
  loadStatsSummary,
  markGoalResolutionAnnouncementSeen,
  resetUserData,
  retryPendingSync,
} from '@/src/services/progress-service';
import { bootstrapAppSession } from '@/src/use-cases/bootstrap-app';
import {
  clearGoalCheckinUseCase,
  createGoalUseCase,
  deleteGoalUseCase,
  finalizeGoalUseCase,
  loadGoalDetailSummaryUseCase,
  recordGoalCheckinUseCase,
  updateGoalUseCase,
} from '@/src/use-cases/goal-actions';
import {
  addCustomPunishmentUseCase,
  completeAssignedPunishmentUseCase,
  deleteCustomPunishmentUseCase,
  loadAssignedPunishmentDetailUseCase,
  loadPunishmentCatalogUseCase,
  loadPunishmentHistoryUseCase,
  updateCustomPunishmentUseCase,
} from '@/src/use-cases/punishment-actions';
import { updateSettingsUseCase } from '@/src/use-cases/settings-actions';

interface AppState {
  hydrated: boolean;
  sessionState: AppSessionState;
  user: User;
  goals: Goal[];
  punishments: Punishment[];
  punishmentsLoaded: boolean;
  pendingPunishments: PendingAssignedPunishmentSummary[];
  completedPunishmentHistory: CompletedPunishmentHistoryEntry[];
  punishmentHistoryLoaded: boolean;
  goalEvaluations: Record<string, GoalEvaluation>;
  goalDetails: Record<string, GoalDetailSummary>;
  homeSummary: HomeSummary;
  statsSummary: StatsSummary;
  statsLoaded: boolean;
  statsCalendars: Record<string, GoalCalendarDay[]>;
  assignedPunishmentDetails: Record<string, AssignedPunishmentDetail>;
  goalResolutionAnnouncements: GoalResolutionAnnouncement[];
  userSettings: UserSettings;
  initializeApp: () => Promise<void>;
  clearRemoteState: () => void;
  retrySync: () => Promise<void>;
  completeOnboarding: (name: string) => void;
  createGoal: (input: GoalInput) => Promise<string>;
  updateGoal: (goalId: string, input: GoalInput) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  finalizeGoal: (goalId: string) => Promise<void>;
  refreshGoalEvaluations: (referenceDate?: string) => Promise<void>;
  refreshHomeSummary: () => Promise<void>;
  refreshStatsSummary: (referenceDate?: string) => Promise<void>;
  refreshPunishmentCatalog: () => Promise<void>;
  refreshPunishmentHistory: () => Promise<void>;
  loadGoalDetail: (goalId: string) => Promise<void>;
  loadStatsCalendar: (goalId: string, monthStart: string) => Promise<void>;
  loadAssignedPunishmentDetail: (assignedId: string) => Promise<void>;
  recordCheckin: (input: {
    goalId: string;
    date?: string;
    status: 'completed' | 'missed';
  }) => Promise<Awaited<ReturnType<typeof recordGoalCheckinUseCase>>>;
  clearCheckin: (input: {
    goalId: string;
    date?: string;
  }) => Promise<Awaited<ReturnType<typeof clearGoalCheckinUseCase>>>;
  completeAssignedPunishment: (assignedId: string) => Promise<void>;
  addCustomPunishment: (input: PunishmentMutationInput) => Promise<void>;
  updateCustomPunishment: (punishmentId: string, input: PunishmentMutationInput) => Promise<void>;
  deleteCustomPunishment: (punishmentId: string) => Promise<void>;
  updateSettings: (input: Partial<UserSettings>) => Promise<void>;
  refreshGoalResolutionAnnouncements: () => Promise<void>;
  dismissGoalResolutionAnnouncement: (outcomeId: string) => Promise<void>;
  hydrateUser: (input: Partial<User> & Pick<User, 'id'>) => void;
  resetApp: () => Promise<void>;
  setHydrated: (hydrated: boolean) => void;
}

const defaultUser: User = {
  id: 'user-main',
  name: '',
  onboardingCompleted: false,
  createdAt: new Date().toISOString(),
};

const defaultSettings: UserSettings = {
  remindersEnabled: true,
  reminderHour: 20,
  reminderMinute: 0,
  pendingPunishmentReminderEnabled: true,
};

const defaultHomeSummary: HomeSummary = {
  activeGoalsCount: 0,
  pendingPunishmentsCount: 0,
  goalSummaries: [],
};

const defaultStatsSummary: StatsSummary = {
  averageRate: 0,
  completionRatio: 0,
  goalsActiveCount: 0,
  completedPunishments: 0,
  totalCheckins: 0,
};

const EMPTY_CALENDAR_DAYS: GoalCalendarDay[] = [];

const initialState = {
  hydrated: false,
  sessionState: {
    activeOwnerId: 'guest',
    guestId: 'guest',
    mode: 'guest' as const,
    syncStatus: 'idle' as const,
  },
  user: defaultUser,
  goals: [] as Goal[],
  punishments: [] as Punishment[],
  punishmentsLoaded: false,
  pendingPunishments: [] as PendingAssignedPunishmentSummary[],
  completedPunishmentHistory: [] as CompletedPunishmentHistoryEntry[],
  punishmentHistoryLoaded: false,
  goalEvaluations: {} as Record<string, GoalEvaluation>,
  goalDetails: {} as Record<string, GoalDetailSummary>,
  homeSummary: defaultHomeSummary,
  statsSummary: defaultStatsSummary,
  statsLoaded: false,
  statsCalendars: {} as Record<string, GoalCalendarDay[]>,
  assignedPunishmentDetails: {} as Record<string, AssignedPunishmentDetail>,
  goalResolutionAnnouncements: [] as GoalResolutionAnnouncement[],
  userSettings: defaultSettings,
};

function buildCalendarKey(goalId: string, monthStart: string) {
  return `${goalId}:${monthStart}`;
}

function getMonthStartFromDate(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function mergeGoalResolutionAnnouncements(
  current: GoalResolutionAnnouncement[],
  incoming: GoalResolutionAnnouncement[],
) {
  const byOutcomeId = new Map(current.map((announcement) => [announcement.outcomeId, announcement]));

  for (const announcement of incoming) {
    byOutcomeId.set(announcement.outcomeId, announcement);
  }

  return Array.from(byOutcomeId.values()).sort((left, right) => right.evaluatedAt.localeCompare(left.evaluatedAt));
}

export const useAppStore = create<AppState>()((set, get) => ({
  ...initialState,
  setHydrated: (hydrated) => set({ hydrated }),
  clearRemoteState: () =>
    set({
      ...initialState,
      hydrated: true,
    }),
  initializeApp: async () => {
    set({ hydrated: false });

    const snapshot = await bootstrapAppSession();
    const goalResolutionAnnouncements = await loadGoalResolutionAnnouncements();

    set({
      ...initialState,
      ...snapshot,
      goalResolutionAnnouncements,
      hydrated: true,
    });
  },
  retrySync: async () => {
    const sessionState = await retryPendingSync();
    set({ sessionState });
    await get().initializeApp();
  },
  completeOnboarding: (name) =>
    set((state) => ({
      user: {
        ...state.user,
        name: name.trim(),
        onboardingCompleted: true,
      },
    })),
  createGoal: async (input) => {
    const result = await createGoalUseCase(input);
    set((state) => ({
      goals: [result.goal, ...state.goals],
      goalEvaluations: result.goalEvaluations,
      homeSummary: result.homeSummary,
      statsSummary: result.statsSummary,
      statsLoaded: true,
    }));
    return result.goal.id;
  },
  updateGoal: async (goalId, input) => {
    const result = await updateGoalUseCase(goalId, input);
    set((state) => ({
      goals: state.goals.map((item) => (item.id === goalId ? result.goal : item)),
      goalEvaluations: result.goalEvaluations,
      homeSummary: result.homeSummary,
      statsSummary: result.statsSummary,
      statsLoaded: true,
      goalDetails: state.goalDetails[goalId]
        ? {
            ...state.goalDetails,
            [goalId]: {
              ...state.goalDetails[goalId],
              evaluation: result.goalEvaluations[goalId] ?? state.goalDetails[goalId].evaluation,
            },
          }
        : state.goalDetails,
    }));
  },
  deleteGoal: async (goalId) => {
    const result = await deleteGoalUseCase(goalId);

    set((state) => {
      const nextCalendars = { ...state.statsCalendars };
      const nextGoalDetails = { ...state.goalDetails };
      const nextAssignedDetails = Object.fromEntries(
        Object.entries(state.assignedPunishmentDetails).filter(([, detail]) => detail.assigned.goalId !== goalId),
      );

      delete nextGoalDetails[goalId];
      Object.keys(nextCalendars).forEach((key) => {
        if (key.startsWith(`${goalId}:`)) {
          delete nextCalendars[key];
        }
      });

      return {
        goals: state.goals.filter((goal) => goal.id !== result.goalId),
        goalEvaluations: result.goalEvaluations,
        goalDetails: nextGoalDetails,
        assignedPunishmentDetails: nextAssignedDetails,
        homeSummary: result.homeSummary,
        statsSummary: result.statsSummary,
        statsLoaded: true,
        statsCalendars: nextCalendars,
      };
    });
  },
  finalizeGoal: async (goalId) => {
    const goal = get().goals.find((item) => item.id === goalId);

    if (!goal || goal.lifecycleStatus === 'closed') {
      return;
    }

    const result = await finalizeGoalUseCase(goalId);
    set((state) => ({
      goals: state.goals.map((item) => (item.id === goalId ? result.goal : item)),
      goalEvaluations: result.goalEvaluations,
      goalResolutionAnnouncements: result.goalResolutionAnnouncement
        ? mergeGoalResolutionAnnouncements(state.goalResolutionAnnouncements, [result.goalResolutionAnnouncement])
        : state.goalResolutionAnnouncements,
      homeSummary: result.homeSummary,
      statsSummary: result.statsSummary,
      statsLoaded: true,
      assignedPunishmentDetails:
        result.assignedPunishment && state.assignedPunishmentDetails[result.assignedPunishment.id]
          ? {
              ...state.assignedPunishmentDetails,
              [result.assignedPunishment.id]: {
                ...state.assignedPunishmentDetails[result.assignedPunishment.id],
                assigned: result.assignedPunishment,
              },
            }
          : state.assignedPunishmentDetails,
    }));

    if (get().goalDetails[goalId]) {
      await get().loadGoalDetail(goalId);
    }

    if (get().punishmentHistoryLoaded || result.assignedPunishment) {
      await get().refreshPunishmentHistory();
    }

    await get().refreshGoalResolutionAnnouncements();
  },
  refreshGoalEvaluations: async (referenceDate) => {
    const goalEvaluations = await loadGoalEvaluations(referenceDate);
    set({ goalEvaluations });
  },
  refreshHomeSummary: async () => {
    const homeSummary = await loadHomeSummary();
    set({ homeSummary });
  },
  refreshStatsSummary: async (referenceDate) => {
    const statsSummary = await loadStatsSummary(referenceDate);
    set({ statsSummary, statsLoaded: true });
  },
  refreshPunishmentCatalog: async () => {
    const punishments = await loadPunishmentCatalogUseCase();
    set({ punishments, punishmentsLoaded: true });
  },
  refreshPunishmentHistory: async () => {
    const { completedPunishmentHistory, pendingPunishments } = await loadPunishmentHistoryUseCase();
    set({
      completedPunishmentHistory,
      pendingPunishments,
      punishmentHistoryLoaded: true,
    });
  },
  refreshGoalResolutionAnnouncements: async () => {
    const goalResolutionAnnouncements = await loadGoalResolutionAnnouncements();
    set({ goalResolutionAnnouncements });
  },
  dismissGoalResolutionAnnouncement: async (outcomeId) => {
    const goalResolutionAnnouncements = await markGoalResolutionAnnouncementSeen(outcomeId);
    set({ goalResolutionAnnouncements });
  },
  loadGoalDetail: async (goalId) => {
    const detail = await loadGoalDetail(goalId);
    if (!detail) {
      return;
    }
    set((state) => ({
      goalDetails: {
        ...state.goalDetails,
        [goalId]: detail,
      },
    }));
  },
  loadStatsCalendar: async (goalId, monthStart) => {
    const days = await loadGoalCalendarMonth(goalId, monthStart);
    set((state) => ({
      statsCalendars: {
        ...state.statsCalendars,
        [buildCalendarKey(goalId, monthStart)]: days,
      },
    }));
  },
  loadAssignedPunishmentDetail: async (assignedId) => {
    const detail = await loadAssignedPunishmentDetailUseCase(assignedId);
    set((state) => {
      const nextDetails = { ...state.assignedPunishmentDetails };

      if (detail) {
        nextDetails[assignedId] = detail;
      } else {
        delete nextDetails[assignedId];
      }

      return {
        assignedPunishmentDetails: nextDetails,
      };
    });
  },
  recordCheckin: async (input) => {
    const result = await recordGoalCheckinUseCase(input);
    const goal = get().goals.find((item) => item.id === input.goalId);
    const monthStart = getMonthStartFromDate(result.date);
    const calendarKey = buildCalendarKey(input.goalId, monthStart);

    set((state) => ({
      goalEvaluations: result.goalEvaluations,
      homeSummary: result.homeSummary,
      statsSummary: result.statsSummary,
      statsLoaded: true,
      assignedPunishmentDetails:
        result.assignedPunishment && state.assignedPunishmentDetails[result.assignedPunishment.id]
          ? {
              ...state.assignedPunishmentDetails,
              [result.assignedPunishment.id]: {
                ...state.assignedPunishmentDetails[result.assignedPunishment.id],
                assigned: result.assignedPunishment,
              },
            }
          : state.assignedPunishmentDetails,
    }));

    if (goal && get().goalDetails[input.goalId]) {
      const detail = await loadGoalDetailSummaryUseCase(goal, result.evaluation);
      set((state) => ({
        goalDetails: {
          ...state.goalDetails,
          [goal.id]: detail,
        },
      }));
    }

    if (calendarKey in get().statsCalendars) {
      const days = await loadGoalCalendarMonth(input.goalId, monthStart);
      set((state) => ({
        statsCalendars: {
          ...state.statsCalendars,
          [calendarKey]: days,
        },
      }));
    }

    return result;
  },
  clearCheckin: async (input) => {
    const result = await clearGoalCheckinUseCase(input);
    const goal = get().goals.find((item) => item.id === input.goalId);
    const monthStart = getMonthStartFromDate(result.date);
    const calendarKey = buildCalendarKey(input.goalId, monthStart);

    set((state) => {
      const nextAssignedDetails = { ...state.assignedPunishmentDetails };

      if (result.removedAssignedPunishmentId) {
        delete nextAssignedDetails[result.removedAssignedPunishmentId];
      }

      return {
        assignedPunishmentDetails: nextAssignedDetails,
        goalEvaluations: result.goalEvaluations,
        homeSummary: result.homeSummary,
        statsSummary: result.statsSummary,
        statsLoaded: true,
      };
    });

    if (goal && get().goalDetails[input.goalId]) {
      const detail = await loadGoalDetailSummaryUseCase(goal, result.evaluation);
      set((state) => ({
        goalDetails: {
          ...state.goalDetails,
          [goal.id]: detail,
        },
      }));
    }

    if (calendarKey in get().statsCalendars) {
      const days = await loadGoalCalendarMonth(input.goalId, monthStart);
      set((state) => ({
        statsCalendars: {
          ...state.statsCalendars,
          [calendarKey]: days,
        },
      }));
    }

    return result;
  },
  completeAssignedPunishment: async (assignedId) => {
    const result = await completeAssignedPunishmentUseCase(assignedId);
    set((state) => ({
      completedPunishmentHistory: result.completedPunishmentHistory,
      homeSummary: result.homeSummary,
      pendingPunishments: result.pendingPunishments,
      punishmentHistoryLoaded: true,
      statsSummary: result.statsSummary,
      statsLoaded: true,
      assignedPunishmentDetails: state.assignedPunishmentDetails[assignedId]
        ? {
            ...state.assignedPunishmentDetails,
            [assignedId]: {
              ...state.assignedPunishmentDetails[assignedId],
              assigned: result.assigned,
            },
          }
        : state.assignedPunishmentDetails,
    }));
  },
  addCustomPunishment: async (input) => {
    const punishments = await addCustomPunishmentUseCase(input);
    set({ punishments, punishmentsLoaded: true });
  },
  updateCustomPunishment: async (punishmentId, input) => {
    const current = get().punishments.find((item) => item.id === punishmentId);

    if (!current || current.scope !== 'personal') {
      throw createAppError('Solo se pueden editar castigos personalizados.', 'PUNISHMENT_EDIT_NOT_ALLOWED');
    }

    const punishments = await updateCustomPunishmentUseCase(punishmentId, input);
    set({ punishments, punishmentsLoaded: true });
    await get().refreshHomeSummary();
  },
  deleteCustomPunishment: async (punishmentId) => {
    const current = get().punishments.find((item) => item.id === punishmentId);

    if (!current || current.scope !== 'personal') {
      throw createAppError('Solo se pueden borrar castigos personalizados.', 'PUNISHMENT_DELETE_NOT_ALLOWED');
    }

    const punishments = await deleteCustomPunishmentUseCase(punishmentId);
    set({ punishments, punishmentsLoaded: true });
    await get().refreshHomeSummary();
  },
  updateSettings: async (input) => {
    const userSettings = await updateSettingsUseCase(get().userSettings, input);
    set({ userSettings });
  },
  hydrateUser: (input) =>
    set((state) => ({
      user: {
        ...state.user,
        ...input,
      },
    })),
  resetApp: async () => {
    await resetUserData();
    await get().initializeApp();
  },
}));

export function selectGoal(goalId: string) {
  return (state: AppState) => state.goals.find((goal) => goal.id === goalId);
}

export function selectGoalDetail(goalId: string) {
  return (state: AppState) => state.goalDetails[goalId];
}

export function selectAssignedPunishmentDetail(assignedId: string) {
  return (state: AppState) => state.assignedPunishmentDetails[assignedId];
}

export function selectStatsCalendar(goalId: string, monthStart: string) {
  return (state: AppState) => state.statsCalendars[buildCalendarKey(goalId, monthStart)] ?? EMPTY_CALENDAR_DAYS;
}
