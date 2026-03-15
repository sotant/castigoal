import { Alert } from 'react-native';
import { router } from 'expo-router';

import { GoalCard } from '@/src/components/GoalCard';
import { HomeGoalSummary } from '@/src/models/types';
import { appRoutes } from '@/src/navigation/app-routes';
import { useAppStore } from '@/src/store/app-store';

type Props = {
  summary: HomeGoalSummary;
};

function getDeadlineLabel(summary: HomeGoalSummary) {
  if (summary.daysUntilStart > 0) {
    return summary.daysUntilStart === 1 ? 'Empieza manana' : `Empieza en ${summary.daysUntilStart} dias`;
  }

  if (summary.remainingDays > 0) {
    return summary.remainingDays === 1 ? 'Acaba en 1 dia' : `Acaba en ${summary.remainingDays} dias`;
  }

  return 'Plazo finalizado';
}

export function GoalListItem({ summary }: Props) {
  const deleteGoal = useAppStore((state) => state.deleteGoal);
  const deadlineWarning = summary.daysUntilStart === 0 && summary.remainingDays > 0 && summary.remainingDays < 5;
  const canOpenGoal = true;
  const canQuickCheck = summary.active && summary.daysUntilStart === 0 && summary.remainingDays > 0;

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
            ? 'Hoy: hecho'
            : summary.todayStatus === 'missed'
              ? 'Hoy: fallado'
              : 'Hoy: pendiente'
          : 'Objetivo finalizado'
      }
      deadlineLabel={getDeadlineLabel(summary)}
      deadlineWarning={deadlineWarning}
      todayStatus={summary.todayStatus ?? 'pending'}
      muted={!summary.active}
      onDelete={() => {
        Alert.alert('Eliminar desafio', 'Se borraran tambien sus check-ins y castigos asignados. Esta accion no se puede deshacer.', [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => {
              void deleteGoal(summary.goalId);
            },
          },
        ]);
      }}
      disabled={!canOpenGoal}
      onPress={canOpenGoal ? () => router.push(appRoutes.goalDetail(summary.goalId)) : undefined}
      onQuickCheck={canQuickCheck ? () => router.push(appRoutes.checkin(summary.goalId)) : undefined}
    />
  );
}
