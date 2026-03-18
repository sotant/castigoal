import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Directions, FlingGestureHandler } from 'react-native-gesture-handler';

import { EmptyState } from '@/src/components/EmptyState';
import { ProgressRing } from '@/src/components/ProgressRing';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import { buildMonthCalendar } from '@/src/features/goals/goal-form';
import { getMonthStart, WEEKDAY_LABELS } from '@/src/features/stats/calendar';
import { Goal, GoalCalendarDay } from '@/src/models/types';
import { appRoutes } from '@/src/navigation/app-routes';
import { selectGoalDetail, selectStatsCalendar, useAppStore } from '@/src/store/app-store';
import { addMonths, formatCompactDate, startOfToday } from '@/src/utils/date';

type Props = {
  goal?: Goal;
};

type SummaryStatProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  tone: string;
};

type InfoItemProps = {
  label: string;
  value: string;
};

function SummaryStat({ icon, label, value, tone }: SummaryStatProps) {
  return (
    <View style={styles.miniStatCard}>
      <View style={styles.miniStatHeader}>
        <MaterialCommunityIcons color={tone} name={icon} size={14} />
        <Text numberOfLines={1} style={styles.miniStatLabel}>
          {label}
        </Text>
      </View>
      <Text style={[styles.miniStatValue, { color: tone }]}>{value}</Text>
    </View>
  );
}

function InfoItem({ label, value }: InfoItemProps) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function getCalendarFallback(monthDate: Date): GoalCalendarDay[] {
  return buildMonthCalendar(monthDate).map((day) => ({
    date: day.date,
    dayNumber: day.dayNumber,
    inMonth: day.inMonth,
    status: undefined,
  }));
}

function formatCalendarMonthLabel(date: Date) {
  const parts = new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
  }).formatToParts(date);

  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const year = parts.find((part) => part.type === 'year')?.value ?? '';

  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${year}`.trim();
}

export function GoalDetailScreen({ goal }: Props) {
  const detail = useAppStore(selectGoalDetail(goal?.id ?? ''));
  const loadGoalDetail = useAppStore((state) => state.loadGoalDetail);
  const toggleGoalActive = useAppStore((state) => state.toggleGoalActive);
  const loadStatsCalendar = useAppStore((state) => state.loadStatsCalendar);
  const evaluation = useAppStore((state) => (goal ? state.goalEvaluations[goal.id] : undefined));
  const goalSubtitle = goal?.description?.trim() || undefined;
  const [monthOffset, setMonthOffset] = useState(0);

  const monthDate = useMemo(() => {
    const today = startOfToday();
    const monthStart = addMonths(today, monthOffset).slice(0, 8) + '01';
    const [year, month] = monthStart.split('-').map(Number);
    return new Date(year, month - 1, 1);
  }, [monthOffset]);
  const monthStart = useMemo(() => getMonthStart(monthDate), [monthDate]);
  const loadedCalendarDays = useAppStore(selectStatsCalendar(goal?.id ?? '', monthStart));

  useEffect(() => {
    if (!goal) {
      return;
    }

    void loadGoalDetail(goal.id);
  }, [goal, loadGoalDetail]);

  useEffect(() => {
    if (!goal) {
      return;
    }

    void loadStatsCalendar(goal.id, monthStart);
  }, [goal, loadStatsCalendar, monthStart]);

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

  const calendarDays = loadedCalendarDays.length > 0 ? loadedCalendarDays : getCalendarFallback(monthDate);
  const requiredDays = Math.max(Math.ceil((goal.targetDays * goal.minimumSuccessRate) / 100), 1);
  const approvalProgress = Math.min(Math.round((viewModel.evaluation.completedDays / requiredDays) * 100), 100);
  const remainingDaysLabel =
    viewModel.daysUntilStart > 0
      ? `${viewModel.daysUntilStart} ${viewModel.daysUntilStart === 1 ? 'dia' : 'dias'}`
      : `${viewModel.remainingDays} ${viewModel.remainingDays === 1 ? 'dia' : 'dias'}`;
  const remainingDaysTitle = viewModel.daysUntilStart > 0 ? 'Empieza en' : 'Restantes';
  const monthLabel = formatCalendarMonthLabel(monthDate);

  const handleCalendarSwipe = (direction: 'left' | 'right') => {
    setMonthOffset((current) => (direction === 'left' ? current + 1 : current - 1));
  };

  return (
    <ScreenContainer
      title={goal.title}
      subtitle={goalSubtitle}
      action={
        <Pressable
          accessibilityHint="Abre la pantalla para editar este objetivo"
          accessibilityLabel="Editar objetivo"
          onPress={() => router.push(appRoutes.editGoal(goal.id))}
          style={styles.headerAction}>
          <Feather color={palette.primaryDeep} name="edit-2" size={18} />
        </Pressable>
      }>
      <View style={styles.heroCard}>
        <View style={styles.ringWrap}>
          <ProgressRing
            helperText={`${approvalProgress}% completado`}
            showDivider
            size={124}
            value={approvalProgress}
            valueFontSize={28}
            valueText={`${viewModel.evaluation.completedDays}/${requiredDays}`}
          />
        </View>

        <View style={styles.miniStatsRow}>
          <SummaryStat icon="fire" label="Racha" tone={palette.accent} value={`${viewModel.currentStreak} dias`} />
          <SummaryStat icon="trophy-outline" label="Mejor" tone={palette.warning} value={`${viewModel.bestStreak} dias`} />
          <SummaryStat icon="timer-sand" label={remainingDaysTitle} tone={palette.primary} value={remainingDaysLabel} />
        </View>

        <View style={styles.infoGrid}>
          <InfoItem label="Inicio" value={formatCompactDate(goal.startDate)} />
          <InfoItem label="Fin" value={formatCompactDate(viewModel.deadline)} />
          <InfoItem label="Duracion" value={`${goal.targetDays} ${goal.targetDays === 1 ? 'dia' : 'dias'}`} />
          <InfoItem label="Requeridos" value={`${requiredDays} ${requiredDays === 1 ? 'dia' : 'dias'}`} />
        </View>

        <View style={styles.heroActions}>
          <Pressable
            onPress={() => router.push(appRoutes.editGoal(goal.id))}
            style={[styles.secondaryAction, styles.heroActionButton]}>
            <Text style={styles.secondaryActionLabel}>Editar</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              void toggleGoalActive(goal.id);
            }}
            style={[styles.primaryAction, styles.heroActionButton]}>
            <Text style={styles.primaryActionLabel}>{goal.active ? 'Finalizar' : 'Reactivar'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.calendarShell}>
        <View style={styles.calendarHeader}>
          <Pressable onPress={() => setMonthOffset((current) => current - 1)} style={styles.monthButton}>
            <Feather color={palette.slate} name="chevron-left" size={18} />
          </Pressable>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <Pressable onPress={() => setMonthOffset((current) => current + 1)} style={styles.monthButton}>
            <Feather color={palette.slate} name="chevron-right" size={18} />
          </Pressable>
        </View>

        <FlingGestureHandler direction={Directions.LEFT} onActivated={() => handleCalendarSwipe('left')}>
          <FlingGestureHandler direction={Directions.RIGHT} onActivated={() => handleCalendarSwipe('right')}>
            <View style={styles.calendarCard}>
              <View style={styles.weekRow}>
                {WEEKDAY_LABELS.map((label) => (
                  <Text key={label} style={styles.weekday}>
                    {label}
                  </Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {calendarDays.map((day) => {
                  const isStart = day.date === goal.startDate;
                  const isDeadline = day.date === viewModel.deadline;

                  return (
                    <View key={day.date} style={styles.dayCell}>
                      <View
                        style={[
                          styles.dayBubble,
                          day.status === 'completed' ? styles.dayCompleted : null,
                          day.status === 'missed' ? styles.dayMissed : null,
                          !day.inMonth ? styles.dayOutsideMonth : null,
                        ]}>
                        <Text
                          style={[
                            styles.dayLabel,
                            day.status === 'completed' || day.status === 'missed' ? styles.dayLabelActive : null,
                            !day.inMonth ? styles.dayLabelOutsideMonth : null,
                          ]}>
                          {day.dayNumber}
                        </Text>
                        {isStart ? (
                          <View style={styles.dayMarker}>
                            <MaterialIcons color={palette.snow} name="play-arrow" size={10} />
                          </View>
                        ) : null}
                        {isDeadline ? (
                          <View style={styles.dayMarker}>
                            <MaterialCommunityIcons color={palette.snow} name="flag-checkered" size={10} />
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </FlingGestureHandler>
        </FlingGestureHandler>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    padding: spacing.md,
    borderRadius: 32,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: palette.line,
    gap: spacing.md,
    ...shadows.card,
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  miniStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  miniStatCard: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 16,
    backgroundColor: '#FAFBFE',
    borderWidth: 1,
    borderColor: palette.line,
    gap: spacing.xs,
    ...shadows.card,
  },
  miniStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniStatLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: palette.slate,
  },
  miniStatValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.md,
  },
  infoItem: {
    width: '50%',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.ink,
  },
  infoValue: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    color: palette.slate,
  },
  heroActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroActionButton: {
    flex: 1,
  },
  primaryAction: {
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
    backgroundColor: palette.primary,
  },
  primaryActionLabel: {
    color: palette.snow,
    fontWeight: '800',
  },
  secondaryAction: {
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
  },
  secondaryActionLabel: {
    color: palette.ink,
    fontWeight: '800',
  },
  calendarShell: {
    padding: spacing.sm,
    borderRadius: 30,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: palette.line,
    gap: spacing.sm,
    ...shadows.card,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  monthButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
  },
  calendarCard: {
    padding: spacing.md,
    borderRadius: 24,
    backgroundColor: '#FAFBFE',
    borderWidth: 1,
    borderColor: '#E6EDF8',
    gap: spacing.sm,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: palette.slate,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.sm,
  },
  dayCell: {
    width: '14.2857%',
    alignItems: 'center',
  },
  dayBubble: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#DFE6F1',
    backgroundColor: palette.snow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCompleted: {
    backgroundColor: '#EAFBF1',
    borderColor: '#86EFAC',
  },
  dayMissed: {
    backgroundColor: '#FFF1F1',
    borderColor: '#FDA4AF',
  },
  dayOutsideMonth: {
    opacity: 0.45,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.ink,
  },
  dayLabelActive: {
    color: palette.ink,
  },
  dayLabelOutsideMonth: {
    color: palette.slate,
  },
  dayMarker: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
  },
});
