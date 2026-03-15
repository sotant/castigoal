import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { EmptyState } from '@/src/components/EmptyState';
import { ProgressRing } from '@/src/components/ProgressRing';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { StatisticCard } from '@/src/components/StatisticCard';
import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import { appRoutes } from '@/src/navigation/app-routes';
import { Goal } from '@/src/models/types';
import { selectGoalDetail, useAppStore } from '@/src/store/app-store';
import { formatLongDate, formatShortDate } from '@/src/utils/date';
import { getGoalRemainingDays } from '@/src/utils/goal-evaluation';

type Props = {
  goal?: Goal;
};

export function GoalDetailScreen({ goal }: Props) {
  const detail = useAppStore(selectGoalDetail(goal?.id ?? ''));
  const loadGoalDetail = useAppStore((state) => state.loadGoalDetail);
  const toggleGoalActive = useAppStore((state) => state.toggleGoalActive);
  const evaluation = useAppStore((state) => (goal ? state.goalEvaluations[goal.id] : undefined));

  useEffect(() => {
    if (!goal) {
      return;
    }

    void loadGoalDetail(goal.id);
  }, [goal, loadGoalDetail]);

  if (!goal) {
    return (
      <ScreenContainer title="Objetivo" subtitle="No he encontrado ese objetivo.">
        <EmptyState title="Objetivo no disponible" message="Puede haber sido eliminado o nunca se guardo." />
      </ScreenContainer>
    );
  }

  const viewModel = detail ?? {
    goalId: goal.id,
    deadline: goal.startDate,
    daysUntilStart: 0,
    remainingDays: 0,
    scheduleStatus: 'Cargando historial del objetivo...',
    currentStreak: 0,
    bestStreak: 0,
    recentCheckins: [],
    evaluation: evaluation ?? {
      goalId: goal.id,
      periodKey: '',
      windowStart: goal.startDate,
      windowEnd: goal.startDate,
      plannedDays: 0,
      completedDays: 0,
      completionRate: 0,
      passed: false,
    },
  };
  const canCheckIn = goal.active && getGoalRemainingDays(goal) > 0;

  return (
    <ScreenContainer
      title={goal.title}
      subtitle={goal.description || 'Objetivo sin descripcion.'}
      overlay={
        <Pressable onPress={() => router.push(appRoutes.editGoal(goal.id))} style={styles.fab}>
          <Text style={styles.fabLabel}>Editar</Text>
        </Pressable>
      }>
      <View style={styles.summary}>
        <ProgressRing value={viewModel.evaluation.completionRate} size={110} />
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryTitle}>Ventana actual</Text>
          <Text style={styles.summaryText}>
            {viewModel.evaluation.completedDays}/{viewModel.evaluation.plannedDays} dias completados
          </Text>
          <Text style={styles.summaryText}>Minimo exigido: {goal.minimumSuccessRate}%</Text>
          <Text style={styles.summaryText}>Inicio: {formatLongDate(goal.startDate)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Plazo configurado</Text>
        <Text style={styles.cardText}>Inicio: {formatLongDate(goal.startDate)}</Text>
        <Text style={styles.cardText}>Duracion: {goal.targetDays} {goal.targetDays === 1 ? 'dia' : 'dias'}</Text>
        <Text style={styles.cardText}>Fin: {formatLongDate(viewModel.deadline)}</Text>
        <Text style={styles.scheduleStatus}>{viewModel.scheduleStatus}</Text>
      </View>

      <View style={styles.statsRow}>
        <StatisticCard label="Racha actual" value={`${viewModel.currentStreak} d`} tone={palette.success} />
        <StatisticCard label="Mejor racha" value={`${viewModel.bestStreak} d`} tone={palette.accent} />
      </View>

      <View style={styles.actions}>
        <Pressable
          disabled={!canCheckIn}
          onPress={() => router.push(appRoutes.checkin(goal.id))}
          style={[styles.primaryAction, !canCheckIn && styles.primaryActionDisabled]}>
          <Text style={styles.primaryActionLabel}>Hacer check-in</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            void toggleGoalActive(goal.id);
          }}
          style={styles.secondaryAction}>
          <Text style={styles.secondaryActionLabel}>{goal.active ? 'Finalizar' : 'Reactivar'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Historial reciente</Text>
        {viewModel.recentCheckins.length === 0 ? (
          <Text style={styles.cardText}>Todavia no hay registros.</Text>
        ) : (
          viewModel.recentCheckins.map((checkin) => (
            <View key={checkin.id} style={styles.historyRow}>
              <Text style={styles.cardText}>{formatShortDate(checkin.date)}</Text>
              <Text style={[styles.badge, checkin.status === 'completed' ? styles.badgeSuccess : styles.badgeDanger]}>
                {checkin.status === 'completed' ? 'Cumplido' : 'Fallado'}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.fabOffset} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  summary: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: palette.line,
    gap: spacing.md,
    alignItems: 'center',
  },
  summaryCopy: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.ink,
  },
  summaryText: {
    color: palette.slate,
  },
  scheduleStatus: {
    color: palette.primaryDeep,
    fontWeight: '700',
    lineHeight: 21,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryAction: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: palette.primaryDeep,
  },
  primaryActionDisabled: {
    opacity: 0.45,
  },
  primaryActionLabel: {
    color: palette.snow,
    fontWeight: '800',
  },
  secondaryAction: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
  },
  secondaryActionLabel: {
    color: palette.ink,
    fontWeight: '800',
  },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: palette.line,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
  },
  cardText: {
    fontSize: 14,
    color: palette.slate,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    fontSize: 12,
    fontWeight: '700',
  },
  badgeSuccess: {
    backgroundColor: '#DCFCE7',
    color: palette.success,
  },
  badgeDanger: {
    backgroundColor: '#FEE4E2',
    color: palette.danger,
  },
  fabOffset: {
    height: 76,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: 20,
    minWidth: 56,
    height: 56,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
    ...shadows.card,
  },
  fabLabel: {
    color: palette.snow,
    fontSize: 16,
    fontWeight: '800',
  },
});
