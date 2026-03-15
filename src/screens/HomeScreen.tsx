import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/src/components/EmptyState';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import { HomeGoalSummary } from '@/src/models/types';
import { appRoutes } from '@/src/navigation/app-routes';
import { useAppStore } from '@/src/store/app-store';

function getDeadlineLabel(summary: HomeGoalSummary) {
  if (summary.daysUntilStart > 0) {
    return summary.daysUntilStart === 1 ? 'Empieza manana' : `Empieza en ${summary.daysUntilStart} dias`;
  }

  if (summary.remainingDays > 0) {
    return summary.remainingDays === 1 ? 'Acaba en 1 dia' : `Acaba en ${summary.remainingDays} dias`;
  }

  return 'Plazo finalizado';
}

function getTodayBadge(summary: HomeGoalSummary) {
  if (!summary.active) {
    return {
      label: 'OBJETIVO CERRADO',
      style: styles.todayBadgeMuted,
      textStyle: styles.todayBadgeMutedText,
    };
  }

  if (summary.todayStatus === 'completed') {
    return {
      label: 'HOY: HECHO',
      style: styles.todayBadgeSuccess,
      textStyle: styles.todayBadgeSuccessText,
    };
  }

  if (summary.todayStatus === 'missed') {
    return {
      label: 'HOY: FALLADO',
      style: styles.todayBadgeMissed,
      textStyle: styles.todayBadgeMissedText,
    };
  }

  return {
    label: 'HOY: PENDIENTE',
    style: styles.todayBadgePending,
    textStyle: styles.todayBadgePendingText,
  };
}

function getCheckAction(summary: HomeGoalSummary) {
  const canCheckin = summary.active && summary.daysUntilStart === 0 && summary.remainingDays > 0;

  if (!canCheckin) {
    return {
      label: 'Ver detalle',
      icon: 'arrow-right' as const,
      buttonStyle: styles.actionButtonGhost,
      labelStyle: styles.actionButtonGhostLabel,
      disabled: false,
      navigateToCheckin: false,
    };
  }

  if (summary.todayStatus === 'completed') {
    return {
      label: 'Hecho',
      icon: 'check' as const,
      buttonStyle: styles.actionButtonDone,
      labelStyle: styles.actionButtonDoneLabel,
      disabled: true,
      navigateToCheckin: false,
    };
  }

  if (summary.todayStatus === 'missed') {
    return {
      label: 'Fallado',
      icon: 'x' as const,
      buttonStyle: styles.actionButtonMissed,
      labelStyle: styles.actionButtonMissedLabel,
      disabled: true,
      navigateToCheckin: false,
    };
  }

  return {
    label: 'Check-in',
    icon: 'check-circle' as const,
    buttonStyle: styles.actionButtonPrimary,
    labelStyle: styles.actionButtonPrimaryLabel,
    disabled: false,
    navigateToCheckin: true,
  };
}

function getProgressTone(value: number) {
  if (value >= 80) {
    return '#31C56D';
  }

  if (value >= 40) {
    return '#4A86F7';
  }

  return '#F59E0B';
}

function getArcStyle(value: number) {
  if (value >= 75) {
    return styles.progressArcFull;
  }

  if (value >= 50) {
    return styles.progressArcHalf;
  }

  if (value >= 25) {
    return styles.progressArcQuarter;
  }

  return styles.progressArcTiny;
}

function ProgressBadge({ value }: { value: number }) {
  const tone = getProgressTone(value);

  return (
    <View style={styles.progressShell}>
      <View style={styles.progressTrack} />
      <View style={[styles.progressArcBase, getArcStyle(value), { borderTopColor: tone, borderRightColor: tone, borderBottomColor: tone }]} />
      <View style={styles.progressInner}>
        <Text style={styles.progressValue}>{value}%</Text>
      </View>
    </View>
  );
}

function ActiveGoalCard({ summary }: { summary: HomeGoalSummary }) {
  const todayBadge = getTodayBadge(summary);
  const action = getCheckAction(summary);

  return (
    <Pressable onPress={() => router.push(appRoutes.goalDetail(summary.goalId))} style={styles.goalCard}>
      <View style={styles.goalCardTop}>
        <View style={styles.goalCardCopy}>
          <Text style={styles.goalTitle}>{summary.title}</Text>
          <View style={styles.goalMetaRow}>
            <View style={[styles.todayBadge, todayBadge.style]}>
              <Text style={[styles.todayBadgeText, todayBadge.textStyle]}>{todayBadge.label}</Text>
            </View>
            <Text style={styles.goalDeadline}>{getDeadlineLabel(summary)}</Text>
          </View>
        </View>
        <ProgressBadge value={summary.completionRate} />
      </View>

      <View style={styles.goalCardBottom}>
        <View style={styles.streakRow}>
          <Feather color="#97A3B6" name="clock" size={12} />
          <Text style={styles.streakText}>Racha: {summary.currentStreak} d</Text>
        </View>

        <Pressable
          disabled={action.disabled}
          onPress={(event) => {
            event.stopPropagation();

            if (action.navigateToCheckin) {
              router.push(appRoutes.checkin(summary.goalId));
              return;
            }

            router.push(appRoutes.goalDetail(summary.goalId));
          }}
          style={[styles.actionButton, action.buttonStyle, action.disabled && styles.actionButtonDisabled]}>
          <Feather color={action.disabled ? '#9AA5B5' : undefined} name={action.icon} size={14} style={styles.actionIcon} />
          <Text style={[styles.actionButtonLabel, action.labelStyle]}>{action.label}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export function HomeScreen() {
  const homeSummary = useAppStore((state) => state.homeSummary);

  const activeGoals = useMemo(() => {
    return homeSummary.goalSummaries
      .filter((summary) => !(summary.daysUntilStart === 0 && summary.remainingDays === 0))
      .sort((left, right) => {
        const leftPending = left.todayStatus !== 'completed' ? 0 : 1;
        const rightPending = right.todayStatus !== 'completed' ? 0 : 1;

        if (leftPending !== rightPending) {
          return leftPending - rightPending;
        }

        return left.remainingDays - right.remainingDays;
      });
  }, [homeSummary.goalSummaries]);

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
          {activeGoals.map((summary) => (
            <ActiveGoalCard key={summary.goalId} summary={summary} />
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
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
    padding: spacing.md,
    borderRadius: 18,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: spacing.md,
    ...shadows.card,
  },
  goalCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  goalCardCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#14213D',
  },
  goalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  todayBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  todayBadgePending: {
    backgroundColor: '#FFF0CC',
  },
  todayBadgePendingText: {
    color: '#D97706',
  },
  todayBadgeSuccess: {
    backgroundColor: '#DCFCE7',
  },
  todayBadgeSuccessText: {
    color: '#16A34A',
  },
  todayBadgeMissed: {
    backgroundColor: '#FEE2E2',
  },
  todayBadgeMissedText: {
    color: '#DC2626',
  },
  todayBadgeMuted: {
    backgroundColor: '#E5E7EB',
  },
  todayBadgeMutedText: {
    color: '#64748B',
  },
  goalDeadline: {
    fontSize: 13,
    color: '#718096',
  },
  goalCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakText: {
    fontSize: 13,
    color: '#8A94A6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: radius.pill,
  },
  actionIcon: {
    marginTop: 1,
  },
  actionButtonLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  actionButtonPrimary: {
    backgroundColor: '#4A86F7',
  },
  actionButtonPrimaryLabel: {
    color: palette.snow,
  },
  actionButtonDone: {
    backgroundColor: '#F8FAF9',
  },
  actionButtonDoneLabel: {
    color: '#9ACFAE',
  },
  actionButtonMissed: {
    backgroundColor: '#FFF5F5',
  },
  actionButtonMissedLabel: {
    color: '#E67C73',
  },
  actionButtonGhost: {
    backgroundColor: '#EFF4FF',
  },
  actionButtonGhostLabel: {
    color: '#4A86F7',
  },
  actionButtonDisabled: {
    opacity: 1,
  },
  progressShell: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
    borderWidth: 6,
    borderColor: '#E8EDF4',
    backgroundColor: palette.snow,
  },
  progressArcBase: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
    borderWidth: 6,
    borderColor: 'transparent',
  },
  progressArcTiny: {
    borderTopColor: '#000',
  },
  progressArcQuarter: {
    borderTopColor: '#000',
    borderRightColor: '#000',
  },
  progressArcHalf: {
    borderTopColor: '#000',
    borderRightColor: '#000',
    transform: [{ rotate: '45deg' }],
  },
  progressArcFull: {
    borderTopColor: '#000',
    borderRightColor: '#000',
    borderBottomColor: '#000',
    transform: [{ rotate: '45deg' }],
  },
  progressInner: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.snow,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#14213D',
  },
});
