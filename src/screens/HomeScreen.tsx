import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Directions, FlingGestureHandler } from 'react-native-gesture-handler';

import { EmptyState } from '@/src/components/EmptyState';
import { HorizontalDateCalendar } from '@/src/components/HorizontalDateCalendar';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import { Goal, HomeGoalSummary, HomeSummary, Checkin } from '@/src/models/types';
import { appRoutes } from '@/src/navigation/app-routes';
import { useAppStore } from '@/src/store/app-store';
import { loadCheckinsInRangeUseCase, loadHomeSummaryUseCase } from '@/src/use-cases/goal-actions';
import { getGoalDeadline } from '@/src/utils/goal-evaluation';
import { addDays, addMonths, enumerateDates, formatCompactDate, startOfToday, toISODate } from '@/src/utils/date';

type GoalCardViewModel = {
  summary: HomeGoalSummary;
  completedDays: number;
  requiredDays: number;
  selectedStatus: 'completed' | 'pending' | 'missed';
  canEdit: boolean;
  isTodaySelected: boolean;
};

type CalendarMarkerStatus = 'pending';
const CALENDAR_START_OFFSET_MONTHS = -2;
const CALENDAR_END_OFFSET_MONTHS = 1;

function getDeadlineCopy(remainingDays: number) {
  if (remainingDays <= 0) {
    return 'Acaba hoy';
  }

  return remainingDays === 1 ? 'Acaba en 1 dia' : `Acaba en ${remainingDays} dias`;
}

function getDateHeading(selectedDate: string) {
  const today = startOfToday();

  if (selectedDate === today) {
    return 'Para hoy';
  }

  return formatCompactDate(selectedDate);
}

function isGoalVisibleOnDate(goal: Goal | undefined, summary: HomeGoalSummary, date: string) {
  if (!goal) {
    return false;
  }

  if (toISODate(goal.createdAt) > date) {
    return false;
  }

  return summary.daysUntilStart === 0 && summary.remainingDays > 0;
}

function isGoalScheduledOnDate(goal: Goal, date: string) {
  return toISODate(goal.createdAt) <= date && goal.startDate <= date && getGoalDeadline(goal) >= date;
}

function getMarkerForSummary(summary: HomeGoalSummary[], goals: Goal[], date: string) {
  const hasPendingCheckin = summary.some((item) => {
    const goal = goals.find((goalItem) => goalItem.id === item.goalId);

    return isGoalVisibleOnDate(goal, item, date) && !item.todayStatus;
  });

  return hasPendingCheckin ? ('pending' as const) : undefined;
}

function getCalendarMarkersFromCheckins(dates: string[], goals: Goal[], checkins: Checkin[]) {
  const today = startOfToday();
  const checkinKeys = new Set(checkins.map((checkin) => `${checkin.goalId}:${checkin.date}`));

  return Object.fromEntries(
    dates
      .map((date) => {
        if (date > today) {
          return [date, undefined] as const;
        }

        const hasPendingCheckin = goals.some((goal) => isGoalScheduledOnDate(goal, date) && !checkinKeys.has(`${goal.id}:${date}`));

        return [date, hasPendingCheckin ? ('pending' as const) : undefined] as const;
      })
      .filter((entry): entry is [string, CalendarMarkerStatus] => Boolean(entry[1])),
  );
}

type SegmentTone = {
  activeBackground: string;
  inactiveBackground: string;
  activeIcon: string;
  inactiveIcon: string;
};

type StatusSegmentProps = {
  active: boolean;
  disabled: boolean;
  iconName: React.ComponentProps<typeof Feather>['name'];
  iconSize: number;
  onPress: (event: Parameters<NonNullable<React.ComponentProps<typeof Pressable>['onPress']>>[0]) => void;
  style?: object;
  tone: SegmentTone;
};

function StatusSegment({ active, disabled, iconName, iconSize, onPress, style, tone }: StatusSegmentProps) {
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: active ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [active, progress]);

  const backgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [tone.inactiveBackground, tone.activeBackground],
  });

  return (
    <Pressable disabled={disabled} hitSlop={6} onPress={onPress} style={[styles.actionIconButton, style, disabled && styles.actionIconButtonDisabled]}>
      <Animated.View style={[styles.segmentSurface, { backgroundColor }]}>
        <Feather color={active ? tone.activeIcon : tone.inactiveIcon} name={iconName} size={iconSize} style={styles.actionIcon} />
      </Animated.View>
    </Pressable>
  );
}

type ActiveGoalCardProps = GoalCardViewModel & {
  disabled?: boolean;
  selectedDate: string;
  onOpenDetail: () => void;
  onSetCompleted: () => void;
  onSetMissed: () => void;
};

function ActiveGoalCardView({
  summary,
  completedDays,
  requiredDays,
  selectedStatus,
  canEdit,
  isTodaySelected,
  disabled = false,
  onOpenDetail,
  onSetCompleted,
  onSetMissed,
}: ActiveGoalCardProps) {
  const safeRequiredDays = Math.max(requiredDays, 1);
  const clampedCompletedDays = Math.max(0, Math.min(completedDays, safeRequiredDays));
  const progressWidth = (safeRequiredDays > 0 ? `${Math.min((clampedCompletedDays / safeRequiredDays) * 100, 100)}%` : '0%') as `${number}%`;
  const readOnly = !canEdit;
  const separators = Array.from({ length: 9 }, (_, index) => ({
    key: `${summary.goalId}-divider-${index}`,
    left: `${(index + 1) * 10}%` as `${number}%`,
  }));

  return (
    <Pressable
      onPress={() => {
        onOpenDetail();
        router.push(appRoutes.goalDetail(summary.goalId));
      }}
      style={[styles.goalCard, readOnly && styles.goalCardReadOnly]}>
      <View style={styles.cardMainRow}>
        <View style={styles.cardCopy}>
          <Text numberOfLines={1} style={styles.goalTitle}>
            {summary.title}
          </Text>

          <View style={styles.progressMetaRow}>
            <Text style={styles.progressLabel}>
              {clampedCompletedDays}/{safeRequiredDays} dias cumplidos
            </Text>
            {isTodaySelected ? <Text style={styles.progressDeadline}>{getDeadlineCopy(summary.remainingDays)}</Text> : null}
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: progressWidth }]} />
            {separators.map((separator) => (
              <View key={separator.key} style={[styles.progressDivider, { left: separator.left }]} />
            ))}
          </View>
        </View>

        <View style={styles.actionsGroup}>
          <StatusSegment
            active={selectedStatus === 'completed'}
            disabled={!canEdit || disabled}
            iconName="check"
            iconSize={16}
            onPress={(event) => {
              event.stopPropagation();
              onSetCompleted();
            }}
            tone={{
              inactiveBackground: '#F3F4F6',
              activeBackground: '#DCFCE7',
              inactiveIcon: '#9CA3AF',
              activeIcon: '#15803D',
            }}
          />

          <StatusSegment
            active={selectedStatus === 'missed'}
            disabled={!canEdit || disabled}
            iconName="x"
            iconSize={16}
            onPress={(event) => {
              event.stopPropagation();
              onSetMissed();
            }}
            style={styles.actionIconButtonLast}
            tone={{
              inactiveBackground: '#F3F4F6',
              activeBackground: '#FEE2E2',
              inactiveIcon: '#9CA3AF',
              activeIcon: '#B91C1C',
            }}
          />
        </View>
      </View>
    </Pressable>
  );
}

function LoadingGoalsModal({ visible }: { visible: boolean }) {
  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.loadingOverlay}>
        <View style={styles.loadingModal}>
          <ActivityIndicator color={palette.primary} size="small" />
          <Text style={styles.loadingModalTitle}>Actualizando objetivos</Text>
          <Text style={styles.loadingModalCopy}>Cargando el estado del dia seleccionado...</Text>
        </View>
      </View>
    </Modal>
  );
}

export function HomeScreen() {
  const homeSummary = useAppStore((state) => state.homeSummary);
  const goals = useAppStore((state) => state.goals);
  const recordCheckin = useAppStore((state) => state.recordCheckin);
  const clearCheckin = useAppStore((state) => state.clearCheckin);
  const refreshHomeSummary = useAppStore((state) => state.refreshHomeSummary);
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [selectedSummary, setSelectedSummary] = useState(homeSummary);
  const [calendarMarkers, setCalendarMarkers] = useState<Partial<Record<string, CalendarMarkerStatus>>>({});
  const [todayProgressSummary, setTodayProgressSummary] = useState(homeSummary);
  const [loadingDate, setLoadingDate] = useState(false);
  const [savingGoalId, setSavingGoalId] = useState<string | null>(null);
  const preserveSelectedDateOnNextFocus = useRef(false);
  const summaryCache = useRef<Record<string, HomeSummary>>({});
  const today = startOfToday();
  const calendarStartDate = addMonths(today, CALENDAR_START_OFFSET_MONTHS);
  const calendarEndDate = addMonths(today, CALENDAR_END_OFFSET_MONTHS);
  const calendarDates = useMemo(() => enumerateDates(calendarStartDate, calendarEndDate), [calendarEndDate, calendarStartDate]);

  useFocusEffect(
    useCallback(() => {
      if (preserveSelectedDateOnNextFocus.current) {
        preserveSelectedDateOnNextFocus.current = false;
        return;
      }

      setSelectedDate(today);
    }, [today]),
  );

  useEffect(() => {
    setTodayProgressSummary(homeSummary);

    if (selectedDate === today) {
      setSelectedSummary(homeSummary);
      summaryCache.current[selectedDate] = homeSummary;
    }
  }, [homeSummary, selectedDate, today]);

  useEffect(() => {
    let cancelled = false;

    const loadCalendarMarkers = async () => {
      const checkins = await loadCheckinsInRangeUseCase({
        startDate: calendarStartDate,
        endDate: calendarEndDate,
      });

      if (cancelled) {
        return;
      }

      setCalendarMarkers(getCalendarMarkersFromCheckins(calendarDates, goals, checkins));
    };

    void loadCalendarMarkers();

    return () => {
      cancelled = true;
    };
  }, [calendarDates, calendarEndDate, calendarStartDate, goals]);

  useEffect(() => {
    let cancelled = false;

    const loadForDate = async () => {
      const cachedSummary = summaryCache.current[selectedDate];

      setLoadingDate(!cachedSummary);

      try {
        const summary = cachedSummary ? cachedSummary : await loadHomeSummaryUseCase(selectedDate);

        if (cancelled) {
          return;
        }

        summaryCache.current[selectedDate] = summary;
        setSelectedSummary(summary);
      } finally {
        if (!cancelled) {
          setLoadingDate(false);
        }
      }
    };

    void loadForDate();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const isFutureSelected = selectedDate > startOfToday();

  const activeGoals = useMemo(() => {
    return selectedSummary.goalSummaries
      .filter((summary) => {
        const goal = goals.find((item) => item.id === summary.goalId);
        return isGoalVisibleOnDate(goal, summary, selectedDate);
      })
      .map((summary) => {
        const goal = goals.find((item) => item.id === summary.goalId);
        const todayGoalSummary = todayProgressSummary.goalSummaries.find((item) => item.goalId === summary.goalId);
        const targetDays = Math.max(todayGoalSummary?.targetDays ?? summary.targetDays ?? goal?.targetDays ?? 1, 1);
        const minimumSuccessRate = Math.max(goal?.minimumSuccessRate ?? 100, 0);
        const requiredDays = Math.max(1, Math.ceil((targetDays * minimumSuccessRate) / 100));
        const completedDays = todayGoalSummary?.completedDays ?? summary.completedDays;

        return {
          summary,
          canEdit: !isFutureSelected && summary.active,
          completedDays: Math.max(completedDays, 0),
          requiredDays,
          isTodaySelected: selectedDate === startOfToday(),
          selectedStatus: summary.todayStatus ?? 'pending',
        } satisfies GoalCardViewModel;
      })
      .sort((left, right) => {
        return left.summary.remainingDays - right.summary.remainingDays;
      });
  }, [goals, isFutureSelected, selectedDate, selectedSummary.goalSummaries, todayProgressSummary.goalSummaries]);

  const applyOptimisticStatus = (goalId: string, status: HomeGoalSummary['todayStatus']) => {
    setSelectedSummary((current) => {
      const goalSummaries = current.goalSummaries.map((item) => (item.goalId === goalId ? { ...item, todayStatus: status } : item));
      const marker = getMarkerForSummary(goalSummaries, goals, selectedDate);
      const nextSummary = {
        ...current,
        goalSummaries,
      };

      setCalendarMarkers((previous) => ({
        ...previous,
        [selectedDate]: marker,
      }));
      summaryCache.current[selectedDate] = nextSummary;

      return nextSummary;
    });
  };

  const applyStatus = async (goalId: string, status: 'completed' | 'missed' | 'pending') => {
    if (savingGoalId) {
      return;
    }

    setSavingGoalId(goalId);
    applyOptimisticStatus(goalId, status === 'pending' ? undefined : status);

    try {
      let freshTodaySummary = todayProgressSummary;

      if (status === 'pending') {
        const result = await clearCheckin({ date: selectedDate, goalId });
        freshTodaySummary = result.homeSummary;
      } else {
        const result = await recordCheckin({ date: selectedDate, goalId, status });
        freshTodaySummary = result.homeSummary;

        if (result.assignedPunishment) {
          router.push(appRoutes.punishment(result.assignedPunishment.id));
        }
      }

      setTodayProgressSummary(freshTodaySummary);
      summaryCache.current[today] = freshTodaySummary;
      if (selectedDate === today) {
        setSelectedSummary(freshTodaySummary);
      }
      void refreshHomeSummary();
    } finally {
      setSavingGoalId(null);
    }
  };

  const handleDateSwipe = useCallback(
    (direction: 'left' | 'right') => {
      setSelectedDate((current) => {
        const nextDate = addDays(current, direction === 'left' ? 1 : -1);

        if (nextDate < calendarStartDate || nextDate > calendarEndDate) {
          return current;
        }

        return nextDate;
      });
    },
    [calendarEndDate, calendarStartDate],
  );

  return (
    <ScreenContainer
      enableTabSwipe={false}
      title={getDateHeading(selectedDate)}
      action={
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{activeGoals.length}</Text>
        </View>
      }>
      <HorizontalDateCalendar
        endDate={calendarEndDate}
        markerByDate={calendarMarkers}
        onSelectDate={setSelectedDate}
        selectedDate={selectedDate}
        startDate={calendarStartDate}
      />
      <LoadingGoalsModal visible={loadingDate} />

      <FlingGestureHandler direction={Directions.LEFT} onActivated={() => handleDateSwipe('left')}>
        <FlingGestureHandler direction={Directions.RIGHT} onActivated={() => handleDateSwipe('right')}>
          <View style={styles.swipeArea}>
            {selectedSummary.goalSummaries.length === 0 ? (
              <EmptyState
                title="No hay objetivos todavia"
                message="Cuando tengas objetivos creados, aqui veras tus tareas del dia para resolverlas rapido."
              />
            ) : activeGoals.length === 0 ? (
              <EmptyState
                title="No habia objetivos vigentes ese dia"
                message="Cambia la fecha para revisar otro momento o crea un nuevo objetivo para empezar a registrar actividad."
              />
            ) : (
              <View style={styles.content}>
                {activeGoals.map((item) => (
                  <ActiveGoalCardView
                    key={`${item.summary.goalId}-${selectedDate}`}
                    {...item}
                    disabled={savingGoalId === item.summary.goalId}
                    selectedDate={selectedDate}
                    onOpenDetail={() => {
                      preserveSelectedDateOnNextFocus.current = true;
                    }}
                    onSetCompleted={() => void applyStatus(item.summary.goalId, item.selectedStatus === 'completed' ? 'pending' : 'completed')}
                    onSetMissed={() => void applyStatus(item.summary.goalId, item.selectedStatus === 'missed' ? 'pending' : 'missed')}
                  />
                ))}
              </View>
            )}
          </View>
        </FlingGestureHandler>
      </FlingGestureHandler>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 2,
  },
  swipeArea: {
    flexGrow: 1,
    minHeight: 420,
  },
  loadingOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(20, 33, 61, 0.22)',
  },
  loadingModal: {
    minWidth: 220,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderWidth: 1,
    borderColor: '#DCE6F3',
    ...shadows.card,
  },
  loadingModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.ink,
  },
  loadingModalCopy: {
    fontSize: 13,
    textAlign: 'center',
    color: palette.slate,
  },
  headerBadge: {
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    backgroundColor: '#E9F0FF',
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4A86F7',
  },
  goalCard: {
    borderRadius: radius.md,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: palette.line,
    overflow: 'hidden',
    ...shadows.card,
  },
  goalCardReadOnly: {
    backgroundColor: '#F8FAFD',
    borderColor: '#DCE6F3',
    opacity: 0.72,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cardCopy: {
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    paddingBottom: 10,
    paddingRight: spacing.sm,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.ink,
  },
  progressLabel: {
    fontSize: 11,
    color: palette.slate,
  },
  progressMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  progressDeadline: {
    fontSize: 11,
    color: palette.slate,
  },
  progressTrack: {
    position: 'relative',
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: palette.mist,
    borderWidth: 1,
    borderColor: '#D7E1F0',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: palette.primary,
  },
  progressDivider: {
    position: 'absolute',
    top: 1,
    bottom: 1,
    width: 1,
    backgroundColor: '#C6D3E5',
  },
  actionsGroup: {
    width: 52,
    flexDirection: 'column',
    alignItems: 'stretch',
    alignSelf: 'stretch',
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 1,
    borderLeftColor: '#DCE4EE',
  },
  actionIconButton: {
    flex: 1,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  actionIconButtonDisabled: {
    opacity: 0.45,
  },
  actionIconButtonLast: {
    borderBottomWidth: 0,
  },
  segmentSurface: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    marginTop: 0.5,
  },
});
