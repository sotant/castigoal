import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

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
        ? summary.daysUntilStart === 1
          ? 'Empieza manana'
          : `Empieza en ${summary.daysUntilStart} dias`
        : summary.remainingDays > 0
          ? summary.remainingDays === 1
            ? 'Acaba en 1 dia'
            : `Acaba en ${summary.remainingDays} dias`
          : 'Plazo finalizado';

    return {
      bestStreak: summary.bestStreak,
      currentStreak: summary.currentStreak,
      deadlineLabel,
      deadlineWarning: summary.daysUntilStart === 0 && summary.remainingDays > 0 && summary.remainingDays < 5,
      deleteGoal,
      evaluation: evaluation ?? buildFallbackEvaluation(goal.id, getGoalRequiredDays(goal)),
      goal,
      todayLabel: !isGoalClosed(goal)
        ? summary.todayStatus === 'completed'
          ? 'Hoy: hecho'
          : summary.todayStatus === 'missed'
            ? 'Hoy: fallado'
            : 'Hoy: pendiente'
        : summary.resolutionStatus === 'passed'
          ? 'Objetivo aprobado'
          : summary.resolutionStatus === 'failed'
            ? 'Objetivo fallido'
            : 'Objetivo cerrado',
      todayStatus: summary.todayStatus,
    };
  }, [deleteGoal, evaluation, goal, summary]);
}
