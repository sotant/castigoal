import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { getGoalClosesInCopy, getGoalStartsWhenCopy, getGoalTodayStatusCopy } from '@/src/i18n/goals';
import { GoalEvaluation } from '@/src/models/types';
import { getGoalRequiredDays, isGoalClosed } from '@/src/utils/goal-evaluation';
import { useAppStore } from '@/src/store/app-store';
import { startOfToday } from '@/src/utils/date';

function buildFallbackEvaluation(goalId: string, requiredDays = 1): GoalEvaluation {
  return {
    goalId,
    periodKey: '',
    windowStart: startOfToday(),
    windowEnd: startOfToday(),
    plannedDays: 0,
    requiredDays,
    completedDays: 0,
    completionRate: 0,
    passed: false,
  };
}

export function useGoalListItemData(goalId: string) {
  const { deleteGoal, evaluation, goal, summary } = useAppStore(
    useShallow((state) => ({
      deleteGoal: state.deleteGoal,
      evaluation: state.goalEvaluations[goalId],
      goal: state.goals.find((item) => item.id === goalId),
      summary: state.homeSummary.goalSummaries.find((item) => item.goalId === goalId),
    })),
  );

  return useMemo(() => {
    if (!goal || !summary) {
      return {
        deleteGoal,
        goal: goal ?? null,
      };
    }

    const deadlineLabel =
      summary.daysUntilStart > 0
        ? getGoalStartsWhenCopy(summary.daysUntilStart)
        : getGoalClosesInCopy(summary.remainingDays);

    return {
      bestStreak: summary.bestStreak,
      currentStreak: summary.currentStreak,
      deadlineLabel,
      deadlineWarning: summary.daysUntilStart === 0 && summary.remainingDays > 0 && summary.remainingDays < 5,
      deleteGoal,
      evaluation: evaluation ?? buildFallbackEvaluation(goal.id, getGoalRequiredDays(goal)),
      goal,
      todayLabel: getGoalTodayStatusCopy({
        lifecycleStatus: isGoalClosed(goal) ? 'closed' : 'active',
        resolutionStatus: summary.resolutionStatus,
        todayStatus: summary.todayStatus,
      }),
      todayStatus: summary.todayStatus,
    };
  }, [deleteGoal, evaluation, goal, summary]);
}
