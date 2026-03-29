import { Feather, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { type ComponentProps, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Directions, FlingGestureHandler } from 'react-native-gesture-handler';

import { EmptyState } from '@/src/components/EmptyState';
import { GoalActionConfirmationModal } from '@/src/components/GoalActionConfirmationModal';
import { ProgressRing } from '@/src/components/ProgressRing';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { StatusBadge } from '@/src/components/StatusBadge';
import { getPunishmentCategoryOptions, getPunishmentDisplay } from '@/src/constants/punishments';
import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import { buildMonthCalendar } from '@/src/features/goals/goal-form';
import { usePunishmentCatalog } from '@/src/features/punishments/selectors';
import { commonCopy, formatDays } from '@/src/i18n/common';
import {
  getGoalProgressAlmostThere,
  getGoalProgressHelper,
  getGoalProgressUnreachable,
  getGoalPunishmentScopeLabel,
  goalsCopy,
} from '@/src/i18n/goals';
import { getMonthStart, getWeekdayLabels } from '@/src/features/stats/calendar';
import { Goal, GoalCalendarDay } from '@/src/models/types';
import { appRoutes } from '@/src/navigation/app-routes';
import { selectAssignedPunishmentDetail, selectGoalDetail, selectStatsCalendar, useAppStore } from '@/src/store/app-store';
import { addMonths, diffInDays, formatCompactDate, formatDatePartsByLocale, startOfToday } from '@/src/utils/date';
import { getGoalDeadline, getGoalRequiredDays } from '@/src/utils/goal-evaluation';

type Props = {
  goal?: Goal;
};

type DetailStatProps = {
  label: string;
  value: string;
  iconColor: string;
  iconName: ComponentProps<typeof MaterialCommunityIcons>['name'] | ComponentProps<typeof Feather>['name'];
  iconFamily?: 'material-community' | 'feather';
};

type InfoItemProps = {
  label: string;
  value: string;
  iconName: ComponentProps<typeof MaterialCommunityIcons>['name'] | ComponentProps<typeof MaterialIcons>['name'];
  iconColor: string;
  iconBackgroundColor: string;
  iconFamily?: 'material-community' | 'material';
};

function DetailStat({ label, value, iconColor, iconName, iconFamily = 'material-community' }: DetailStatProps) {
  return (
    <View style={styles.statColumn}>
      <Text style={styles.statLabel}>{label}</Text>
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
    </View>
  );
}

function InfoItem({ label, value, iconName, iconColor, iconBackgroundColor, iconFamily = 'material-community' }: InfoItemProps) {
  return (
    <View style={styles.infoItem}>
      <View style={styles.infoItemHeader}>
        <View style={[styles.infoIconWrap, { backgroundColor: iconBackgroundColor }]}>
          {iconFamily === 'material' ? (
            <MaterialIcons color={iconColor} name={iconName as ComponentProps<typeof MaterialIcons>['name']} size={18} />
          ) : (
            <MaterialCommunityIcons color={iconColor} name={iconName as ComponentProps<typeof MaterialCommunityIcons>['name']} size={18} />
          )}
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
  const parts = formatDatePartsByLocale(date, {
    month: 'long',
    year: 'numeric',
  });
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const year = parts.find((part) => part.type === 'year')?.value ?? '';

  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${year}`.trim();
}

export function GoalDetailScreen({ goal }: Props) {
  useTranslation();
  const detail = useAppStore(selectGoalDetail(goal?.id ?? ''));
  const assignedPunishmentId = detail?.outcome?.assignedPunishmentId;
  const assignedPunishmentDetail = useAppStore(selectAssignedPunishmentDetail(assignedPunishmentId ?? ''));
  const loadGoalDetail = useAppStore((state) => state.loadGoalDetail);
  const loadAssignedPunishmentDetail = useAppStore((state) => state.loadAssignedPunishmentDetail);
  const loadStatsCalendar = useAppStore((state) => state.loadStatsCalendar);
  const finalizeGoal = useAppStore((state) => state.finalizeGoal);
  const { punishmentsLoaded, refreshPunishmentCatalog, basePunishments, personalPunishments } = usePunishmentCatalog();
  const evaluation = useAppStore((state) => (goal ? state.goalEvaluations[goal.id] : undefined));
  const punishmentCategoryOptions = getPunishmentCategoryOptions();
  const weekdayLabels = getWeekdayLabels();
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

  useEffect(() => {
    if (!punishmentsLoaded) {
      void refreshPunishmentCatalog().catch(() => undefined);
    }
  }, [punishmentsLoaded, refreshPunishmentCatalog]);

  useEffect(() => {
    if (!assignedPunishmentId || assignedPunishmentDetail) {
      return;
    }

    void loadAssignedPunishmentDetail(assignedPunishmentId).catch(() => undefined);
  }, [assignedPunishmentDetail, assignedPunishmentId, loadAssignedPunishmentDetail]);

  if (!goal) {
    return (
      <ScreenContainer title={goalsCopy.detail.screenTitle} subtitle={goalsCopy.detail.notFound.subtitle}>
        <EmptyState title={goalsCopy.detail.notFound.title} message={goalsCopy.detail.notFound.message} />
      </ScreenContainer>
    );
  }

  const requiredDays = evaluation?.requiredDays ?? detail?.evaluation.requiredDays ?? getGoalRequiredDays(goal);
  const viewModel = detail ?? {
    goalId: goal.id,
    deadline: getGoalDeadline(goal),
    daysUntilStart: 0,
    remainingDays: 0,
    scheduleStatus: goalsCopy.detail.loadingScheduleStatus,
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
  const canFinalize = goal.lifecycleStatus !== 'closed';
  const canEdit = goal.lifecycleStatus !== 'closed';
  const showUnreachableHint = goal.lifecycleStatus === 'active' && viewModel.daysUntilStart === 0 && pendingRequiredDays > viewModel.remainingDays;
  const monthLabel = formatCalendarMonthLabel(monthDate);
  const progressTone = isResolvedFailed ? palette.danger : isResolvedPassed ? palette.success : palette.primary;
  const durationDays = diffInDays(goal.startDate, viewModel.deadline) + 1;
  const displayedAssignedPunishment = assignedPunishmentDetail ? getPunishmentDisplay(assignedPunishmentDetail.punishment) : null;
  const eligiblePunishments = (() => {
    const sourcePunishments =
      goal.punishmentConfig.scope === 'base'
        ? basePunishments
        : goal.punishmentConfig.scope === 'personal'
          ? personalPunishments
          : [...basePunishments, ...personalPunishments];

    return sourcePunishments.filter((punishment) => {
      if (goal.punishmentConfig.categoryMode === 'all') {
        return true;
      }

      return goal.punishmentConfig.categoryNames.includes(punishment.categoryName);
    });
  })();
  const progressHint = isResolvedPassed
    ? goalsCopy.detail.progress.approvedHint
    : isResolvedFailed
      ? viewModel.outcome?.assignedPunishmentId
        ? goalsCopy.detail.progress.failedAssignedHint
        : goalsCopy.detail.progress.failedWithoutPunishmentHint
      : showUnreachableHint
        ? getGoalProgressUnreachable(pendingRequiredDays, viewModel.remainingDays)
        : approvalProgress < 25
          ? goalsCopy.detail.progress.justStarted
          : approvalProgress < 50
            ? goalsCopy.detail.progress.onTrack
            : approvalProgress < 75
              ? goalsCopy.detail.progress.halfway
              : approvalProgress < 100
                ? getGoalProgressAlmostThere(pendingRequiredDays)
                : goalsCopy.detail.progress.minimumReached;

  const handleCalendarSwipe = (direction: 'left' | 'right') => {
    setMonthOffset((current) => (direction === 'left' ? current + 1 : current - 1));
  };

  return (
    <ScreenContainer resetScrollOnFocus title={goal.title} subtitle={goalSubtitle}>
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <StatusBadge lifecycleStatus={goal.lifecycleStatus} resolutionStatus={goal.resolutionStatus} />
        </View>

        <ProgressRing
          helperText={getGoalProgressHelper(approvalProgress)}
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

        {(canFinalize || canEdit) ? (
          <View style={styles.actionRow}>
            {canEdit ? (
              <Pressable onPress={() => router.push(appRoutes.editGoal(goal.id))} style={styles.secondaryActionButton}>
                <Text style={styles.secondaryActionLabel}>{goalsCopy.detail.actions.edit}</Text>
              </Pressable>
            ) : null}
            {canFinalize ? (
              <Pressable onPress={() => setShowFinalizeConfirmation(true)} style={styles.primaryActionButton}>
                <Text style={styles.primaryActionLabel}>{goalsCopy.detail.actions.finalize}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.statsSection}>
        <View style={styles.statsRow}>
          <DetailStat label={goalsCopy.detail.labels.currentStreak} iconColor="#F97316" iconName="fire" value={`${viewModel.currentStreak}`} />
          <DetailStat label={goalsCopy.detail.labels.bestStreak} iconColor="#B45309" iconFamily="feather" iconName="award" value={`${viewModel.bestStreak}`} />
          <DetailStat
            label={viewModel.daysUntilStart > 0 ? goalsCopy.detail.labels.daysUntilStart : goalsCopy.detail.labels.daysRemaining}
            iconColor={palette.ink}
            iconName="flag-checkered"
            value={viewModel.daysUntilStart > 0 ? `${viewModel.daysUntilStart}` : `${viewModel.remainingDays}`}
          />
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>{goalsCopy.detail.infoTitle}</Text>
        <View style={styles.infoGrid}>
          <InfoItem
            iconBackgroundColor="#E8F1FF"
            iconColor={palette.primaryDeep}
            iconName="calendar-start"
            label={goalsCopy.detail.labels.start}
            value={formatCompactDate(goal.startDate)}
          />
          <InfoItem
            iconBackgroundColor="#FFF2E7"
            iconColor={palette.accent}
            iconName="calendar-end"
            label={goalsCopy.detail.labels.end}
            value={formatCompactDate(viewModel.deadline)}
          />
          <InfoItem
            iconBackgroundColor="#EAF8EF"
            iconColor="#43B66E"
            iconFamily="material"
            iconName="hourglass-top"
            label={goalsCopy.detail.labels.duration}
            value={formatDays(durationDays)}
          />
          <InfoItem
            iconBackgroundColor="#FFF6E5"
            iconColor={palette.warning}
            iconName="check-decagram"
            label={goalsCopy.detail.labels.requirement}
            value={formatDays(safeRequiredDays)}
          />
        </View>
      </View>

      {goal.lifecycleStatus === 'active' ? (
        <View style={styles.infoCard}>
          <View style={styles.contentSectionHeader}>
            <Text style={styles.infoTitle}>{goalsCopy.detail.labels.possiblePunishments}</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeLabel}>{eligiblePunishments.length}</Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.punishmentChipsRow}
            style={styles.punishmentChipsScroll}>
            <View style={[styles.filterChipOption, styles.filterChipOptionActive]}>
              <Text style={[styles.filterChipOptionLabel, styles.filterChipOptionLabelActive]}>{getGoalPunishmentScopeLabel(goal.punishmentConfig.scope)}</Text>
            </View>
            {goal.punishmentConfig.categoryMode === 'all' ? (
              <View style={[styles.filterChipOption, styles.filterChipOptionActive]}>
                <Text style={[styles.filterChipOptionLabel, styles.filterChipOptionLabelActive]}>{goalsCopy.form.categoryMode.all}</Text>
              </View>
            ) : (
              punishmentCategoryOptions.filter((option) => goal.punishmentConfig.categoryNames.includes(option.name)).map((option) => (
                <View
                  key={option.name}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: option.accent,
                      borderColor: option.accent,
                    },
                  ]}>
                  <View
                    style={[
                      styles.categoryChipIconWrap,
                      {
                        backgroundColor: `${palette.snow}22`,
                      },
                    ]}>
                    <Ionicons color={palette.snow} name={option.icon} size={18} />
                  </View>
                  <Text style={[styles.categoryChipTitle, styles.categoryChipTitleActive]}>{option.label}</Text>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.availablePunishmentsCard}>
            {punishmentsLoaded ? (
              eligiblePunishments.length > 0 ? (
                <View style={styles.availablePunishmentsScrollWrap}>
                  <ScrollView
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.availablePunishmentsContent}
                    style={styles.availablePunishmentsScroll}>
                    {eligiblePunishments.map((punishment) => {
                      const categoryOption = punishmentCategoryOptions.find((option) => option.name === punishment.categoryName);

                      return (
                        <View key={punishment.id} style={styles.availablePunishmentRow}>
                          <View
                            style={[
                              styles.availablePunishmentIconWrap,
                              {
                                backgroundColor: categoryOption?.tint ?? '#EEF4FF',
                              },
                            ]}>
                            <Ionicons color={categoryOption?.accent ?? palette.primaryDeep} name={categoryOption?.icon ?? 'sparkles-outline'} size={14} />
                          </View>
                          <Text style={styles.availablePunishmentTitle}>{punishment.title}</Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : (
                <Text style={styles.availablePunishmentEmpty}>{goalsCopy.form.summary.noAvailablePunishments}</Text>
              )
            ) : (
              <Text style={styles.availablePunishmentEmpty}>{goalsCopy.form.summary.availablePunishmentsLoading}</Text>
            )}
          </View>
        </View>
      ) : null}

      {isResolvedFailed ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{goalsCopy.detail.consequenceTitle}</Text>
          {assignedPunishmentId ? (
            assignedPunishmentDetail ? (
              <View style={styles.consequenceCard}>
                <View style={styles.consequenceHeader}>
                  <Text style={styles.consequenceTitle}>{displayedAssignedPunishment?.title}</Text>
                  <View style={styles.consequenceMetaRow}>
                    <View style={[styles.filterChipOption, styles.consequenceTypeChip]}>
                      <Text style={[styles.filterChipOptionLabel, styles.consequenceTypeChipLabel]}>
                        {displayedAssignedPunishment?.scope === 'personal' ? commonCopy.filters.personal : commonCopy.filters.base}
                      </Text>
                    </View>
                    {(() => {
                      const categoryOption = punishmentCategoryOptions.find(
                        (option) => option.name === displayedAssignedPunishment?.categoryName,
                      );

                      if (!categoryOption) {
                        return null;
                      }

                      return (
                        <View
                          style={[
                            styles.categoryChip,
                            styles.consequenceCategoryChip,
                            {
                              backgroundColor: categoryOption.tint,
                              borderColor: categoryOption.accent,
                            },
                          ]}>
                          <View style={[styles.categoryChipIconWrap, styles.consequenceCategoryIconWrap]}>
                            <Ionicons color={categoryOption.accent} name={categoryOption.icon} size={14} />
                          </View>
                          <Text style={[styles.categoryChipTitle, styles.consequenceCategoryChipLabel]}>{categoryOption.label}</Text>
                        </View>
                      );
                    })()}
                  </View>
                </View>
                <Text style={styles.consequenceDescription}>{displayedAssignedPunishment?.description}</Text>
              </View>
            ) : (
              <Text style={styles.copyLine}>{goalsCopy.detail.assignedPunishmentLoading}</Text>
            )
          ) : (
            <Text style={[styles.copyLine, styles.dangerText]}>{goalsCopy.detail.failureWithoutEligiblePunishment}</Text>
          )}
        </View>
      ) : null}

      <View style={styles.infoCard}>
        <View style={styles.calendarSection}>
          <View style={styles.calendarHeader}>
            <Text style={styles.sectionTitle}>{goalsCopy.detail.calendarTitle}</Text>
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
                  {weekdayLabels.map((label) => (
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

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.dayCompleted]} />
              <Text style={styles.legendText}>{commonCopy.calendar.legend.completed}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.dayMissed]} />
              <Text style={styles.legendText}>{commonCopy.calendar.legend.missed}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.dayEmpty]} />
              <Text style={styles.legendText}>{commonCopy.calendar.legend.noCheckin}</Text>
            </View>
          </View>

        </View>
      </View>

      <GoalActionConfirmationModal
        confirmLabel={goalsCopy.list.confirmation.finalize.confirm}
        description={goalsCopy.list.confirmation.finalize.description}
        eyebrow=""
        onCancel={() => setShowFinalizeConfirmation(false)}
        onConfirm={() => {
          setShowFinalizeConfirmation(false);
          void finalizeGoal(goal.id);
        }}
        title={goalsCopy.list.confirmation.finalize.title}
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
    gap: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statColumn: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  statLabel: {
    flex: 1,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    color: palette.slate,
  },
  statCard: {
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
  contentSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
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
  availablePunishmentsCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6ECF5',
    backgroundColor: '#F8FBFF',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  availablePunishmentsScrollWrap: {
    maxHeight: 220,
  },
  availablePunishmentsScroll: {
    flexGrow: 0,
  },
  availablePunishmentsContent: {
    gap: spacing.xs,
  },
  availablePunishmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  availablePunishmentIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availablePunishmentTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: palette.ink,
  },
  availablePunishmentEmpty: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.slate,
  },
  consequenceCard: {
    padding: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FFD3D3',
    backgroundColor: '#FFF6F6',
    gap: spacing.xs,
  },
  consequenceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  consequenceTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    color: palette.ink,
  },
  consequenceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  consequenceTypeChip: {
    backgroundColor: '#EEF4FF',
    borderColor: '#D6E1F1',
  },
  consequenceTypeChipLabel: {
    color: palette.primaryDeep,
  },
  consequenceCategoryChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    minHeight: 0,
  },
  consequenceCategoryIconWrap: {
    width: 18,
    height: 18,
    backgroundColor: palette.snow,
  },
  consequenceCategoryChipLabel: {
    color: palette.ink,
    fontSize: 11,
  },
  consequenceDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.slate,
  },
  countBadge: {
    minWidth: 24,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF3FB',
  },
  countBadgeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: palette.primaryDeep,
  },
  filterChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  punishmentChipsScroll: {
    marginHorizontal: -2,
  },
  punishmentChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 2,
  },
  filterChipOption: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#D6E1F1',
    backgroundColor: '#EEF4FF',
  },
  filterChipOptionActive: {
    backgroundColor: palette.primaryDeep,
    borderColor: palette.primaryDeep,
  },
  filterChipOptionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: palette.primaryDeep,
  },
  filterChipOptionLabelActive: {
    color: palette.snow,
  },
  categoryChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 28,
  },
  categoryChipIconWrap: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  categoryChipTitleActive: {
    color: palette.snow,
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
    textTransform: 'capitalize',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
  },
  legendText: {
    fontSize: 11,
    color: palette.slate,
  },
  calendarCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
    borderRadius: 20,
    borderWidth: 0,
    backgroundColor: 'transparent',
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
    width: 34,
    height: 34,
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
