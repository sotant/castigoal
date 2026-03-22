import { create } from 'zustand';

import type { OnboardingDecision, OnboardingState, OnboardingStatus } from '@/src/features/onboarding/types';
import { createAppError } from '@/src/lib/app-error';
import { getCurrentSession } from '@/src/repositories/auth-repository';
import {
  completeOnboardingIntro,
  completeOnboarding as completeOnboardingService,
  dismissGoalCreationHighlight as dismissGoalCreationHighlightService,
  markFirstCheckinCompleted,
  markGoalCreationCompleted,
  markGoalCreationStarted,
  markOnboardingStarted,
  markOnboardingStepViewed,
  markPunishmentsReinforcementSeen as markPunishmentsReinforcementSeenService,
  markPunishmentsTooltipSeen as markPunishmentsTooltipSeenService,
  markStatsTooltipSeen as markStatsTooltipSeenService,
  markTodayActionTooltipSeen as markTodayActionTooltipSeenService,
  markTodayCastigoTooltipSeen as markTodayCastigoTooltipSeenService,
  markTodayProgressTooltipSeen as markTodayProgressTooltipSeenService,
  markTodayScreenViewed,
  reconcileOnboarding,
  resetOnboarding as resetOnboardingService,
  setOnboardingIntroSlide as setOnboardingIntroSlideService,
  skipOnboarding as skipOnboardingService,
} from '@/src/services/onboarding-service';
import {
  AssignedPunishmentDetail,
  CompletedPunishmentHistoryEntry,
  Goal,
  GoalCalendarDay,
  GoalDetailSummary,
  GoalEvaluation,
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
  loadHomeSummary,
  loadStatsSummary,
  resetUserData,
  retryPendingSync,
} from '@/src/services/progress-service';
import { bootstrapAppSession } from '@/src/use-cases/bootstrap-app';
import {
  clearGoalCheckinUseCase,
  createGoalUseCase,
  deleteGoalUseCase,
  loadGoalDetailSummaryUseCase,
  recordGoalCheckinUseCase,
  toggleGoalActiveUseCase,
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
  onboarding: OnboardingState;
  onboardingDecision: OnboardingDecision;
  user: User;
  goals: Goal[];
  punishments: Punishment[];
  punishmentsLoaded: boolean;
  showFirstGoalSuccess: boolean;
  showFirstCheckinSuccess: boolean;
  showOnboardingCompletedMessage: boolean;
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
  userSettings: UserSettings;
  initializeApp: () => Promise<void>;
  clearRemoteState: () => void;
  retrySync: () => Promise<void>;
  startOnboarding: () => Promise<void>;
  setOnboardingIntroSlide: (index: number) => Promise<void>;
  completeOnboardingIntro: () => Promise<void>;
  viewOnboardingStep: (step: OnboardingStatus) => Promise<void>;
  refreshOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  dismissGoalCreationHighlight: () => Promise<void>;
  dismissFirstGoalSuccess: () => void;
  markTodayViewed: () => Promise<void>;
  markTodayProgressTooltipSeen: () => Promise<void>;
  markTodayActionTooltipSeen: () => Promise<void>;
  markTodayCastigoTooltipSeen: () => Promise<void>;
  markPunishmentsTooltipSeen: () => Promise<void>;
  markPunishmentsReinforcementSeen: () => Promise<void>;
  markStatsTooltipSeen: () => Promise<void>;
  dismissFirstCheckinSuccess: () => void;
  dismissOnboardingCompletedMessage: () => void;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  createGoal: (input: GoalInput) => Promise<string>;
  updateGoal: (goalId: string, input: GoalInput) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  toggleGoalActive: (goalId: string) => Promise<void>;
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

const defaultOnboardingState: OnboardingState = {
  localUserId: 'guest',
  hasSeenOnboarding: false,
  isCompleted: false,
  isSkipped: false,
  currentStep: 'not_started',
  onboardingVersion: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  introSlideIndex: 0,
  goalCreationHighlightDismissed: false,
  todayProgressTooltipSeen: false,
  todayActionTooltipSeen: false,
  todayCastigoTooltipSeen: false,
  punishmentsTooltipSeen: false,
  punishmentsReinforcementSeen: false,
  statsTooltipSeen: false,
  hasCreatedFirstGoal: false,
  hasLoggedFirstDay: false,
};

const defaultOnboardingDecision: OnboardingDecision = {
  shouldShowOnboarding: true,
  shouldShowIntro: true,
  shouldGuideGoalCreation: false,
  shouldGuidePunishments: false,
  shouldGuideStats: false,
  shouldResume: false,
  activeStep: 'not_started',
  canSkip: true,
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
  onboarding: defaultOnboardingState,
  onboardingDecision: defaultOnboardingDecision,
  user: defaultUser,
  goals: [] as Goal[],
  punishments: [] as Punishment[],
  punishmentsLoaded: false,
  showFirstGoalSuccess: false,
  showFirstCheckinSuccess: false,
  showOnboardingCompletedMessage: false,
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
  userSettings: defaultSettings,
};

function buildCalendarKey(goalId: string, monthStart: string) {
  return `${goalId}:${monthStart}`;
}

function applyOnboardingSnapshot(
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void,
  snapshot: {
    decision: OnboardingDecision;
    state: OnboardingState;
  },
) {
  set((state) => ({
    onboarding: snapshot.state,
    onboardingDecision: snapshot.decision,
    user: {
      ...state.user,
      onboardingCompleted: snapshot.state.isCompleted,
    },
  }));
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

    set({
      ...initialState,
      ...snapshot,
      hydrated: true,
    });
  },
  startOnboarding: async () => {
    const snapshot = await markOnboardingStarted(await getCurrentSession());
    applyOnboardingSnapshot(set, snapshot);
  },
  setOnboardingIntroSlide: async (index) => {
    const snapshot = await setOnboardingIntroSlideService(index, await getCurrentSession());
    applyOnboardingSnapshot(set, snapshot);
  },
  completeOnboardingIntro: async () => {
    const snapshot = await completeOnboardingIntro(await getCurrentSession());
    applyOnboardingSnapshot(set, snapshot);
  },
  viewOnboardingStep: async (step) => {
    const snapshot = await markOnboardingStepViewed(step, await getCurrentSession());
    applyOnboardingSnapshot(set, snapshot);
  },
  refreshOnboarding: async () => {
    const snapshot = await reconcileOnboarding(await getCurrentSession());
    applyOnboardingSnapshot(set, snapshot);
  },
  skipOnboarding: async () => {
    const snapshot = await skipOnboardingService(await getCurrentSession());
    applyOnboardingSnapshot(set, snapshot);
  },
  dismissGoalCreationHighlight: async () => {
    const snapshot = await dismissGoalCreationHighlightService(await getCurrentSession());
    applyOnboardingSnapshot(set, snapshot);
  },
  dismissFirstGoalSuccess: () => set({ showFirstGoalSuccess: false }),
  markTodayViewed: async () => {
    const snapshot = await markTodayScreenViewed(await getCurrentSession());
    applyOnboardingSnapshot(set, snapshot);
  },
  markTodayProgressTooltipSeen: async () => {
    const snapshot = await markTodayProgressTooltipSeenService(await getCurrentSession());
    applyOnboardingSnapshot(set, snapshot);
  },
  markTodayActionTooltipSeen: async () => {
    const snapshot = await markTodayActionTooltipSeenService(await getCurrentSession());
    applyOnboardingSnapshot(set, snapshot);
  },
  markTodayCastigoTooltipSeen: async () => {
    const snapshot = await markTodayCastigoTooltipSeenService(await getCurrentSession());
    applyOnboardingSnapshot(set, snapshot);
  },
  markPunishmentsTooltipSeen: async () => {
    const snapshot = await markPunishmentsTooltipSeenService(await getCurrentSession());
    applyOnboardingSnapshot(set, snapshot);
  },
  markPunishmentsReinforcementSeen: async () => {
    const snapshot = await markPunishmentsReinforcementSeenService(await getCurrentSession());
    applyOnboardingSnapshot(set, snapshot);
  },
  markStatsTooltipSeen: async () => {
    const snapshot = await markStatsTooltipSeenService(await getCurrentSession());
    applyOnboardingSnapshot(set, snapshot);
  },
  dismissFirstCheckinSuccess: () => set({ showFirstCheckinSuccess: false }),
  dismissOnboardingCompletedMessage: () => set({ showOnboardingCompletedMessage: false }),
  retrySync: async () => {
    const sessionState = await retryPendingSync();
    set({ sessionState });
    await get().initializeApp();
  },
  completeOnboarding: async () => {
    const snapshot = await completeOnboardingService(await getCurrentSession());
    applyOnboardingSnapshot(set, snapshot);
    set({ showOnboardingCompletedMessage: true });
  },
  resetOnboarding: async () => {
    const snapshot = await resetOnboardingService(await getCurrentSession());
    applyOnboardingSnapshot(set, snapshot);
    set({
      showFirstGoalSuccess: false,
      showFirstCheckinSuccess: false,
      showOnboardingCompletedMessage: false,
    });
  },
  createGoal: async (input) => {
    const hadNoGoalsBeforeCreate = get().goals.length === 0;
    await markGoalCreationStarted(await getCurrentSession());
    const result = await createGoalUseCase(input);
    set((state) => ({
      goals: [result.goal, ...state.goals],
      goalEvaluations: result.goalEvaluations,
      homeSummary: result.homeSummary,
      statsSummary: result.statsSummary,
      statsLoaded: true,
    }));
    await get().refreshOnboarding();
    await markGoalCreationCompleted(await getCurrentSession());
    if (hadNoGoalsBeforeCreate) {
      set({ showFirstGoalSuccess: true });
    }
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
    await get().refreshOnboarding();
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
    await get().refreshOnboarding();
  },
  toggleGoalActive: async (goalId) => {
    const goal = get().goals.find((item) => item.id === goalId);

    if (!goal) {
      return;
    }

    const result = await toggleGoalActiveUseCase(goalId, !goal.active);
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
    await get().refreshOnboarding();
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
    const hadLoggedFirstDayBefore = get().onboarding.hasLoggedFirstDay;
    const result = await recordGoalCheckinUseCase(input);
    const goal = get().goals.find((item) => item.id === input.goalId);

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

    await get().refreshOnboarding();
    if (!hadLoggedFirstDayBefore) {
      await markFirstCheckinCompleted(await getCurrentSession());
      set({ showFirstCheckinSuccess: true });
    }
    return result;
  },
  clearCheckin: async (input) => {
    const result = await clearGoalCheckinUseCase(input);
    const goal = get().goals.find((item) => item.id === input.goalId);

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

    await get().refreshOnboarding();
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
        onboardingCompleted:
          state.onboarding.isCompleted || input.onboardingCompleted || false,
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
