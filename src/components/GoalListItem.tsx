import { Alert } from 'react-native';
import { router } from 'expo-router';

import { GoalCard } from '@/src/components/GoalCard';
import { commonCopy } from '@/src/i18n/common';
import { getGoalDeadlineCopy, getGoalStartsInDaysCopy, goalsCopy } from '@/src/i18n/goals';
import { HomeGoalSummary } from '@/src/models/types';
import { appRoutes } from '@/src/navigation/app-routes';
import { useAppStore } from '@/src/store/app-store';

type Props = {
  summary: HomeGoalSummary;
};

function getDeadlineLabel(summary: HomeGoalSummary) {
  if (summary.daysUntilStart > 0) {
    return summary.daysUntilStart === 1
      ? goalsCopy.home.scheduleStatus.startsTomorrow
      : getGoalStartsInDaysCopy(summary.daysUntilStart);
  }

  if (summary.remainingDays > 0) {
    return getGoalDeadlineCopy(summary.remainingDays);
  }

  return goalsCopy.home.scheduleStatus.deadlineFinished;
}

export function GoalListItem({ summary }: Props) {
  const deleteGoal = useAppStore((state) => state.deleteGoal);
  const deadlineWarning = summary.daysUntilStart === 0 && summary.remainingDays > 0 && summary.remainingDays < 5;
  const canOpenGoal = true;

  return (
    <GoalCard
      title={summary.title}
      description={summary.description}
      completionRate={summary.completionRate}
      currentStreak={summary.currentStreak}
      bestStreak={summary.bestStreak}
      todayLabel={
        summary.active
          ? summary.todayStatus === 'completed'
            ? goalsCopy.home.todayStatus.completed
            : summary.todayStatus === 'missed'
              ? goalsCopy.home.todayStatus.failed
              : goalsCopy.home.todayStatus.pending
          : goalsCopy.home.todayStatus.finished
      }
      deadlineLabel={getDeadlineLabel(summary)}
      deadlineWarning={deadlineWarning}
      todayStatus={summary.todayStatus ?? 'pending'}
      muted={!summary.active}
      onDelete={() => {
        Alert.alert(goalsCopy.list.confirmation.delete.title, goalsCopy.list.confirmation.delete.description, [
          { text: commonCopy.actions.cancel, style: 'cancel' },
          {
            text: commonCopy.actions.delete,
            style: 'destructive',
            onPress: () => {
              void deleteGoal(summary.goalId);
            },
          },
        ]);
      }}
      disabled={!canOpenGoal}
      onPress={canOpenGoal ? () => router.push(appRoutes.goalDetail(summary.goalId)) : undefined}
    />
  );
}
