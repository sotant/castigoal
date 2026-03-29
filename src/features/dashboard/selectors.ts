import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { getPunishmentDisplay } from '@/src/constants/punishments';
import { useCurrentLanguage } from '@/src/i18n';
import { Goal } from '@/src/models/types';
import { useAppStore } from '@/src/store/app-store';

export function useGoalMetrics(goal?: Goal) {
  const detail = useAppStore((state) => (goal ? state.goalDetails[goal.id] : undefined));
  const summary = useAppStore((state) => (goal ? state.homeSummary.goalSummaries.find((item) => item.goalId === goal.id) : undefined));

  return useMemo(() => {
    if (!goal) {
      return {
        todayStatus: undefined,
        currentStreak: 0,
        bestStreak: 0,
      };
    }

    return {
      todayStatus: summary?.todayStatus,
      currentStreak: detail?.currentStreak ?? summary?.currentStreak ?? 0,
      bestStreak: detail?.bestStreak ?? summary?.bestStreak ?? 0,
    };
  }, [detail, goal, summary]);
}

export function useHomeSummary() {
  const { goals, homeSummary } = useAppStore(
    useShallow((state) => ({
      goals: state.goals,
      homeSummary: state.homeSummary,
    })),
  );
  const currentLanguage = useCurrentLanguage();

  return useMemo(() => {
    void currentLanguage;
    const activeGoals = goals.filter((goal) => goal.lifecycleStatus === 'active');
    const inactiveGoals = goals.filter((goal) => goal.lifecycleStatus !== 'active');
    const latestPending = homeSummary.latestPending
      ? {
          ...homeSummary.latestPending,
          punishment: getPunishmentDisplay(homeSummary.latestPending.punishment),
        }
      : undefined;

    return {
      activeGoalsCount: homeSummary.activeGoalsCount,
      latestPending,
      latestPunishment: latestPending?.punishment,
      orderedGoals: [...activeGoals, ...inactiveGoals],
      pendingPunishmentsCount: homeSummary.pendingPunishmentsCount,
    };
  }, [currentLanguage, goals, homeSummary]);
}
