import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/src/components/EmptyState';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import { HomeGoalSummary } from '@/src/models/types';
import { appRoutes } from '@/src/navigation/app-routes';
import { useAppStore } from '@/src/store/app-store';

type GoalCardViewModel = {
  summary: HomeGoalSummary;
  completedDays: number;
  requiredDays: number;
};

function getDeadlineCopy(remainingDays: number) {
  if (remainingDays <= 0) {
    return 'Acaba hoy';
  }

  return remainingDays === 1 ? 'Acaba en 1 dia' : `Acaba en ${remainingDays} dias`;
}

type ActiveGoalCardProps = GoalCardViewModel & {
  disabled?: boolean;
  onSetCompleted: () => void;
  onSetMissed: () => void;
};

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

  const iconColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [tone.inactiveIcon, tone.activeIcon],
  });

  return (
    <Pressable disabled={disabled} hitSlop={6} onPress={onPress} style={[styles.actionIconButton, style, disabled && styles.actionIconButtonDisabled]}>
      <Animated.View style={[styles.segmentSurface, { backgroundColor }]}>
        <Feather color={active ? tone.activeIcon : tone.inactiveIcon} name={iconName} size={iconSize} style={styles.actionIcon} />
      </Animated.View>
    </Pressable>
  );
}

function ActiveGoalCardView({ summary, completedDays, requiredDays, disabled = false, onSetCompleted, onSetMissed }: ActiveGoalCardProps) {
  const canCheckin = !disabled && summary.active && summary.daysUntilStart === 0 && summary.remainingDays > 0;
  const clampedCompletedDays = Math.max(0, Math.min(completedDays, requiredDays));
  const progressWidth = (requiredDays > 0 ? `${Math.min((clampedCompletedDays / requiredDays) * 100, 100)}%` : '0%') as `${number}%`;
  const separators = Array.from({ length: 9 }, (_, index) => ({
    key: `${summary.goalId}-divider-${index}`,
    left: `${(index + 1) * 10}%` as `${number}%`,
  }));

  return (
    <Pressable onPress={() => router.push(appRoutes.goalDetail(summary.goalId))} style={styles.goalCard}>
      <View style={styles.cardMainRow}>
        <View style={styles.cardCopy}>
          <Text numberOfLines={1} style={styles.goalTitle}>
            {summary.title}
          </Text>

          <View style={styles.progressMetaRow}>
            <Text style={styles.progressLabel}>
              {clampedCompletedDays}/{requiredDays} dias cumplidos
            </Text>
            <Text style={styles.progressDeadline}>{getDeadlineCopy(summary.remainingDays)}</Text>
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
            active={summary.todayStatus === 'completed'}
            disabled={!canCheckin}
            iconName="check"
            iconSize={16}
            onPress={(event) => {
              event.stopPropagation();
              onSetCompleted();
            }}
            tone={{
              inactiveBackground: '#E5E7EB',
              activeBackground: '#DCFCE7',
              inactiveIcon: '#6B7280',
              activeIcon: '#15803D',
            }}
          />

          <StatusSegment
            active={summary.todayStatus === 'missed'}
            disabled={!canCheckin}
            iconName="x"
            iconSize={16}
            onPress={(event) => {
              event.stopPropagation();
              onSetMissed();
            }}
            style={styles.actionIconButtonLast}
            tone={{
              inactiveBackground: '#E5E7EB',
              activeBackground: '#FEE2E2',
              inactiveIcon: '#6B7280',
              activeIcon: '#B91C1C',
            }}
          />
        </View>
      </View>
    </Pressable>
  );
}

export function HomeScreen() {
  const homeSummary = useAppStore((state) => state.homeSummary);
  const goals = useAppStore((state) => state.goals);
  const goalEvaluations = useAppStore((state) => state.goalEvaluations);
  const recordCheckin = useAppStore((state) => state.recordCheckin);
  const clearCheckin = useAppStore((state) => state.clearCheckin);
  const [savingGoalId, setSavingGoalId] = useState<string | null>(null);

  const activeGoals = useMemo(() => {
    return homeSummary.goalSummaries
      .filter((summary) => !(summary.daysUntilStart === 0 && summary.remainingDays === 0))
      .map((summary) => {
        const goal = goals.find((item) => item.id === summary.goalId);
        const evaluation = goalEvaluations[summary.goalId];
        const targetDays = Math.max(goal?.targetDays ?? 1, 1);
        const minimumSuccessRate = Math.max(goal?.minimumSuccessRate ?? 100, 0);
        const requiredDays = Math.max(1, Math.ceil((targetDays * minimumSuccessRate) / 100));

        return {
          summary,
          completedDays: Math.max(evaluation?.completedDays ?? Math.round((summary.completionRate / 100) * targetDays), 0),
          requiredDays,
        };
      })
      .sort((left, right) => {
        return left.summary.remainingDays - right.summary.remainingDays;
      });
  }, [goalEvaluations, goals, homeSummary.goalSummaries]);

  const applyStatus = async (goalId: string, status: 'completed' | 'missed' | 'pending') => {
    if (savingGoalId) {
      return;
    }

    setSavingGoalId(goalId);

    try {
      if (status === 'pending') {
        await clearCheckin({ goalId });
        return;
      }

      const result = await recordCheckin({ goalId, status });

      if (result.assignedPunishment) {
        router.push(appRoutes.punishment(result.assignedPunishment.id));
      }
    } finally {
      setSavingGoalId(null);
    }
  };

  return (
    <ScreenContainer
      title="Para hoy"
      action={
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{activeGoals.length}</Text>
        </View>
      }>
      {homeSummary.goalSummaries.length === 0 ? (
        <EmptyState
          title="No hay objetivos todavia"
          message="Cuando tengas objetivos creados, aqui veras tus tareas del dia para resolverlas rapido."
        />
      ) : (
        <View style={styles.content}>
          {activeGoals.map((item) => (
            <ActiveGoalCardView
              key={item.summary.goalId}
              {...item}
              disabled={savingGoalId === item.summary.goalId}
              onSetCompleted={() => void applyStatus(item.summary.goalId, item.summary.todayStatus === 'completed' ? 'pending' : 'completed')}
              onSetMissed={() => void applyStatus(item.summary.goalId, item.summary.todayStatus === 'missed' ? 'pending' : 'missed')}
            />
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 4,
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
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: palette.line,
    gap: 4,
    ...shadows.card,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  cardCopy: {
    flex: 1,
    gap: 6,
    justifyContent: 'center',
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
    width: 34,
    flexDirection: 'column',
    alignItems: 'stretch',
    overflow: 'hidden',
    borderRadius: radius.sm,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#DCE4EE',
  },
  actionIconButton: {
    width: 34,
    height: 31,
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
