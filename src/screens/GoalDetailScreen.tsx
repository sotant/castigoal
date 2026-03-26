import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { type ComponentProps, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Directions, FlingGestureHandler } from 'react-native-gesture-handler';

import { EmptyState } from '@/src/components/EmptyState';
import { GoalActionConfirmationModal } from '@/src/components/GoalActionConfirmationModal';
import { ProgressRing } from '@/src/components/ProgressRing';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { StatusBadge } from '@/src/components/StatusBadge';
import { PUNISHMENT_CATEGORY_OPTIONS } from '@/src/constants/punishments';
import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import { buildMonthCalendar } from '@/src/features/goals/goal-form';
import { getMonthStart, WEEKDAY_LABELS } from '@/src/features/stats/calendar';
import { Goal, GoalCalendarDay } from '@/src/models/types';
import { appRoutes } from '@/src/navigation/app-routes';
import { selectGoalDetail, selectStatsCalendar, useAppStore } from '@/src/store/app-store';
import { addMonths, formatCompactDate, startOfToday } from '@/src/utils/date';
import { getGoalDeadline, getGoalRequiredDays } from '@/src/utils/goal-evaluation';

type Props = {
  goal?: Goal;
};

type DetailStatProps = {
  value: string;
  iconColor: string;
  iconName: ComponentProps<typeof MaterialCommunityIcons>['name'] | ComponentProps<typeof Feather>['name'];
  iconFamily?: 'material-community' | 'feather';
};

type InfoItemProps = {
  label: string;
  value: string;
  iconName: ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconColor: string;
  iconBackgroundColor: string;
};

function DetailStat({ value, iconColor, iconName, iconFamily = 'material-community' }: DetailStatProps) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statContent}>
        {iconFamily === 'feather' ? (
          <Feather color={iconColor} name={iconName as ComponentProps<typeof Feather>['name']} size={18} />
        ) : (
          <MaterialCommunityIcons color={iconColor} name={iconName as ComponentProps<typeof MaterialCommunityIcons>['name']} size={18} />
        )}
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

function InfoItem({ label, value, iconName, iconColor, iconBackgroundColor }: InfoItemProps) {
  return (
    <View style={styles.infoItem}>
      <View style={styles.infoItemHeader}>
        <View style={[styles.infoIconWrap, { backgroundColor: iconBackgroundColor }]}>
          <MaterialCommunityIcons color={iconColor} name={iconName} size={18} />
        </View>
        <Text style={styles.infoItemLabel}>{label}</Text>
      </View>
      <Text style={styles.infoItemValue}>{value}</Text>
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

function formatResolutionSource(source?: Goal['resolutionSource']) {
  if (source === 'manual') {
    return 'Manual';
  }

  if (source === 'expired') {
    return 'Por expiracion';
  }

  return 'Pendiente';
}

function formatLifecycle(goal: Goal) {
  if (goal.lifecycleStatus === 'active') {
    return 'Activo';
  }

  if (goal.lifecycleStatus === 'paused') {
    return 'Pausado';
  }

  return 'Finalizado';
}

function formatResolution(goal: Goal) {
  if (goal.resolutionStatus === 'passed') {
    return 'Aprobado';
  }

  if (goal.resolutionStatus === 'failed') {
    return 'Fallido';
  }

  return 'Pendiente';
}

function buildPunishmentPoolSummary(goal: Goal) {
  const scopeLabel =
    goal.punishmentConfig.scope === 'base'
      ? 'Castigos estandar'
      : goal.punishmentConfig.scope === 'personal'
        ? 'Castigos personales'
        : 'Ambos origenes';

  if (goal.punishmentConfig.categoryMode === 'all') {
    return `${scopeLabel} + todas las categorias`;
  }

  const labels = PUNISHMENT_CATEGORY_OPTIONS.filter((option) => goal.punishmentConfig.categoryNames.includes(option.name)).map((option) => option.label);
  return `${scopeLabel} + ${labels.join(', ')}`;
}

export function GoalDetailScreen({ goal }: Props) {
  const detail = useAppStore(selectGoalDetail(goal?.id ?? ''));
  const loadGoalDetail = useAppStore((state) => state.loadGoalDetail);
  const loadStatsCalendar = useAppStore((state) => state.loadStatsCalendar);
  const pauseGoal = useAppStore((state) => state.pauseGoal);
  const resumeGoal = useAppStore((state) => state.resumeGoal);
  const finalizeGoal = useAppStore((state) => state.finalizeGoal);
  const evaluation = useAppStore((state) => (goal ? state.goalEvaluations[goal.id] : undefined));
  const goalSubtitle = goal?.description?.trim() || undefined;
  const [monthOffset, setMonthOffset] = useState(0);
  const [showFinalizeConfirmation, setShowFinalizeConfirmation] = useState(false);

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

  const requiredDays = evaluation?.requiredDays ?? detail?.evaluation.requiredDays ?? getGoalRequiredDays(goal);
  const viewModel = detail ?? {
    goalId: goal.id,
    deadline: getGoalDeadline(goal),
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
      requiredDays,
      completedDays: 0,
      completionRate: 0,
      passed: false,
    },
  };

  const calendarDays = loadedCalendarDays.length > 0 ? loadedCalendarDays : getCalendarFallback(monthDate);
  const safeRequiredDays = Math.max(requiredDays, 1);
  const approvalProgress = Math.min(Math.round((viewModel.evaluation.completedDays / safeRequiredDays) * 100), 100);
  const pendingRequiredDays = Math.max(safeRequiredDays - viewModel.evaluation.completedDays, 0);
  const isResolvedPassed = goal.resolutionStatus === 'passed';
  const isResolvedFailed = goal.resolutionStatus === 'failed';
  const canPause = goal.lifecycleStatus === 'active';
  const canResume = goal.lifecycleStatus === 'paused';
  const canFinalize = goal.lifecycleStatus !== 'closed';
  const canEdit = goal.lifecycleStatus !== 'closed';
  const showUnreachableHint = goal.lifecycleStatus === 'active' && viewModel.daysUntilStart === 0 && pendingRequiredDays > viewModel.remainingDays;
  const monthLabel = formatCalendarMonthLabel(monthDate);
  const progressTone = isResolvedFailed ? palette.danger : isResolvedPassed ? palette.success : goal.lifecycleStatus === 'paused' ? palette.warning : palette.primary;
  const progressHint = isResolvedPassed
    ? 'Objetivo aprobado. El ciclo ya quedo resuelto.'
    : isResolvedFailed
      ? viewModel.outcome?.assignedPunishmentId
        ? 'Objetivo fallido. El castigo de este ciclo ya fue asignado.'
        : 'Objetivo fallido sin castigo asignado. El pool guardado ya no tenia opciones elegibles.'
      : goal.lifecycleStatus === 'paused'
        ? 'Objetivo pausado. No admite nuevos check-ins hasta que lo reanudes.'
        : showUnreachableHint
          ? `Objetivo no alcanzable. Necesitas ${pendingRequiredDays} ${pendingRequiredDays === 1 ? 'dia cumplido' : 'dias cumplidos'} y solo quedan ${viewModel.remainingDays}.`
          : approvalProgress < 25
            ? 'El ciclo acaba de arrancar. Ve sumando dias cumplidos.'
            : approvalProgress < 50
              ? 'Vas por buen camino.'
              : approvalProgress < 75
                ? 'Ya superaste la mitad del objetivo.'
                : approvalProgress < 100
                  ? `Quedan ${pendingRequiredDays} ${pendingRequiredDays === 1 ? 'dia' : 'dias'} para aprobarlo.`
                  : 'Ya tienes el minimo necesario para aprobar si cierras hoy.';

  const handleCalendarSwipe = (direction: 'left' | 'right') => {
    setMonthOffset((current) => (direction === 'left' ? current + 1 : current - 1));
  };

  return (
    <ScreenContainer resetScrollOnFocus title={goal.title} subtitle={goalSubtitle}>
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <StatusBadge lifecycleStatus={goal.lifecycleStatus} resolutionStatus={goal.resolutionStatus} />
          <Text style={styles.progressStatusText}>{formatLifecycle(goal)} · {formatResolution(goal)}</Text>
        </View>

        <ProgressRing
          helperText={`${approvalProgress}% completado`}
          helperColor={palette.slate}
          showDivider
          size={124}
          toneColor={progressTone}
          value={approvalProgress}
          valueColor={palette.slate}
          valueFontSize={28}
          valueText={`${viewModel.evaluation.completedDays}/${safeRequiredDays}`}
        />

        <Text style={[styles.progressHint, isResolvedFailed ? styles.progressHintDanger : null, isResolvedPassed ? styles.progressHintSuccess : null]}>
          {progressHint}
        </Text>

        {(canPause || canResume || canFinalize || canEdit) ? (
          <View style={styles.actionRow}>
            {canEdit ? (
              <Pressable onPress={() => router.push(appRoutes.editGoal(goal.id))} style={styles.secondaryActionButton}>
                <Text style={styles.secondaryActionLabel}>Editar</Text>
              </Pressable>
            ) : null}
            {canPause ? (
              <Pressable onPress={() => void pauseGoal(goal.id)} style={styles.secondaryActionButton}>
                <Text style={styles.secondaryActionLabel}>Pausar</Text>
              </Pressable>
            ) : null}
            {canResume ? (
              <Pressable onPress={() => void resumeGoal(goal.id)} style={styles.secondaryActionButton}>
                <Text style={styles.secondaryActionLabel}>Reanudar</Text>
              </Pressable>
            ) : null}
            {canFinalize ? (
              <Pressable onPress={() => setShowFinalizeConfirmation(true)} style={styles.primaryActionButton}>
                <Text style={styles.primaryActionLabel}>Finalizar</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.statsSection}>
        <View style={styles.statsLegend}>
          <Text style={styles.legendText}>Racha actual</Text>
          <Text style={styles.legendText}>Mejor racha</Text>
          <Text style={styles.legendText}>{viewModel.daysUntilStart > 0 ? 'Dias para empezar' : 'Dias restantes'}</Text>
        </View>

        <View style={styles.statsRow}>
          <DetailStat iconColor="#F97316" iconName="fire" value={`${viewModel.currentStreak}`} />
          <DetailStat iconColor="#B45309" iconFamily="feather" iconName="award" value={`${viewModel.bestStreak}`} />
          <DetailStat iconColor={palette.ink} iconName="flag-checkered" value={viewModel.daysUntilStart > 0 ? `${viewModel.daysUntilStart}` : `${viewModel.remainingDays}`} />
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Estado del objetivo</Text>
        <View style={styles.infoGrid}>
          <InfoItem
            iconBackgroundColor="#E8F1FF"
            iconColor={palette.primaryDeep}
            iconName="calendar-start"
            label="Inicio"
            value={formatCompactDate(goal.startDate)}
          />
          <InfoItem
            iconBackgroundColor="#FFF2E7"
            iconColor={palette.accent}
            iconName="calendar-end"
            label="Fin"
            value={formatCompactDate(viewModel.deadline)}
          />
          <InfoItem
            iconBackgroundColor="#EEF8F0"
            iconColor={palette.success}
            iconName="progress-check"
            label="Estado"
            value={formatLifecycle(goal)}
          />
          <InfoItem
            iconBackgroundColor="#FFF6E5"
            iconColor={palette.warning}
            iconName="check-decagram"
            label="Resultado"
            value={formatResolution(goal)}
          />
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Regla y resolucion</Text>
        <Text style={styles.copyLine}>{`Debes completar ${safeRequiredDays} de ${goal.targetDays} ${goal.targetDays === 1 ? 'dia' : 'dias'} para aprobar.`}</Text>
        <Text style={styles.copyLine}>{`Origen de resolucion: ${formatResolutionSource(goal.resolutionSource)}`}</Text>
        {goal.closedOn ? <Text style={styles.copyLine}>{`Fecha de cierre: ${formatCompactDate(goal.closedOn)}`}</Text> : null}
        {goal.resolvedAt ? <Text style={styles.copyLine}>{`Resuelto el: ${formatCompactDate(goal.resolvedAt.slice(0, 10))}`}</Text> : null}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Pool de castigos</Text>
        <Text style={styles.copyLine}>{buildPunishmentPoolSummary(goal)}</Text>
      </View>

      {goal.lifecycleStatus === 'closed' ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Outcome persistido</Text>
          <Text style={styles.copyLine}>{`Dias completados: ${viewModel.evaluation.completedDays}/${safeRequiredDays}`}</Text>
          <Text style={styles.copyLine}>{`Tasa de cumplimiento: ${viewModel.evaluation.completionRate}%`}</Text>
          {isResolvedPassed ? (
            <Text style={[styles.copyLine, styles.successText]}>El objetivo quedo aprobado.</Text>
          ) : isResolvedFailed ? (
            viewModel.outcome?.assignedPunishmentId ? (
              <>
                <Text style={[styles.copyLine, styles.dangerText]}>El objetivo quedo fallido y este ciclo tiene un castigo asignado.</Text>
                <Pressable onPress={() => router.push(appRoutes.punishment(viewModel.outcome!.assignedPunishmentId!))} style={styles.secondaryActionButton}>
                  <Text style={styles.secondaryActionLabel}>Ver castigo</Text>
                </Pressable>
              </>
            ) : (
              <Text style={[styles.copyLine, styles.dangerText]}>
                El objetivo quedo fallido sin castigo asignado porque el pool guardado en este objetivo ya no tenia castigos elegibles.
              </Text>
            )
          ) : null}
        </View>
      ) : null}

      <View style={styles.calendarSection}>
        <View style={styles.calendarHeader}>
          <Text style={styles.sectionTitle}>Calendario</Text>
          <View style={styles.monthSwitcher}>
            <Pressable onPress={() => setMonthOffset((current) => current - 1)} style={styles.monthButton}>
              <Feather color={palette.primaryDeep} name="chevron-left" size={18} />
            </Pressable>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <Pressable onPress={() => setMonthOffset((current) => current + 1)} style={styles.monthButton}>
              <Feather color={palette.primaryDeep} name="chevron-right" size={18} />
            </Pressable>
          </View>
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
                          day.status === 'missed' ? styles.dayMissed : styles.dayEmpty,
                          !day.inMonth ? styles.dayOutsideMonth : null,
                        ]}>
                        <Text style={[styles.dayLabel, !day.inMonth ? styles.dayLabelOutsideMonth : null]}>{day.dayNumber}</Text>
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

      <GoalActionConfirmationModal
        confirmLabel="Finalizar"
        description="El objetivo se cerrara y se resolvera ahora mismo con la misma logica que usa la app cuando expira."
        eyebrow="Cerrar ciclo"
        onCancel={() => setShowFinalizeConfirmation(false)}
        onConfirm={() => {
          setShowFinalizeConfirmation(false);
          void finalizeGoal(goal.id);
        }}
        title="Finalizar objetivo"
        visible={showFinalizeConfirmation}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  progressCard: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.card,
  },
  progressHeader: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.xs,
  },
  progressStatusText: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.slate,
  },
  progressHint: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: palette.slate,
  },
  progressHintDanger: {
    color: palette.danger,
  },
  progressHintSuccess: {
    color: palette.success,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  primaryActionButton: {
    minWidth: 110,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    alignItems: 'center',
    backgroundColor: palette.primary,
  },
  primaryActionLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.snow,
  },
  secondaryActionButton: {
    minWidth: 110,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#F7F9FD',
  },
  secondaryActionLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.ink,
  },
  statsSection: {
    gap: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statsLegend: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  legendText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    color: palette.slate,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: palette.line,
    ...shadows.card,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 19,
    fontWeight: '800',
    color: palette.slate,
  },
  infoCard: {
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
    gap: spacing.sm,
    ...shadows.card,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 2,
  },
  infoItem: {
    width: '49.5%',
    minWidth: 0,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6ECF5',
    backgroundColor: '#F8FBFF',
    gap: 3,
    justifyContent: 'center',
  },
  infoItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoItemLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: palette.slate,
  },
  infoItemValue: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '800',
    color: palette.slate,
  },
  copyLine: {
    fontSize: 14,
    lineHeight: 21,
    color: palette.slate,
  },
  successText: {
    color: palette.success,
    fontWeight: '700',
  },
  dangerText: {
    color: palette.danger,
    fontWeight: '700',
  },
  calendarSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
  },
  calendarHeader: {
    gap: spacing.sm,
  },
  monthSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
    gap: spacing.sm,
    ...shadows.card,
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
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCompleted: {
    backgroundColor: '#EAFBF1',
    borderColor: '#86EFAC',
  },
  dayMissed: {
    backgroundColor: '#FFF1F1',
    borderColor: '#FCA5A5',
  },
  dayEmpty: {
    backgroundColor: palette.snow,
  },
  dayOutsideMonth: {
    opacity: 0.35,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '700',
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
    backgroundColor: '#000000',
  },
});
