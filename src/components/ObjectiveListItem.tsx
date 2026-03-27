import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/src/components/StatusBadge';
import { palette, shadows, spacing } from '@/src/constants/theme';
import { Goal, HomeGoalSummary } from '@/src/models/types';
import { formatWeekdayShort } from '@/src/utils/date';

type Props = {
  goal: Goal;
  summary: HomeGoalSummary;
  showCompletionFlag?: boolean;
  onOpenDetail: () => void;
  onOpenActions: () => void;
};

function getRecentDayStyles(status: HomeGoalSummary['recentDays'][number]['status']) {
  switch (status) {
    case 'completed':
      return {
        container: styles.recentDayCompleted,
        label: styles.recentDayLabelCompleted,
      };
    case 'missed':
      return {
        container: styles.recentDayMissed,
        label: styles.recentDayLabelMissed,
      };
    case 'pending':
      return {
        container: styles.recentDayPending,
        label: styles.recentDayLabelPending,
      };
    default:
      return {
        container: styles.recentDayUnavailable,
        label: styles.recentDayLabelUnavailable,
      };
  }
}

export function ObjectiveListItem({ goal, summary, showCompletionFlag = false, onOpenDetail, onOpenActions }: Props) {
  const closingCopy =
    goal.lifecycleStatus === 'closed'
      ? summary.resolutionStatus === 'passed'
        ? 'Cerrado y aprobado'
        : summary.resolutionStatus === 'failed'
          ? 'Cerrado y fallido'
          : 'Cerrado'
      : `${summary.completedDays}/${summary.requiredDays} dias cumplidos`;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            {showCompletionFlag ? (
              <View
                style={[
                  styles.completionFlagBadge,
                  summary.passed ? styles.completionFlagBadgeSuccess : styles.completionFlagBadgeDanger,
                ]}>
                <Feather
                  color={summary.passed ? palette.success : palette.danger}
                  name={summary.passed ? 'check' : 'x'}
                  size={14}
                />
              </View>
            ) : null}
            <Text numberOfLines={1} style={styles.title}>
              {goal.title}
            </Text>
          </View>
          <Text numberOfLines={1} style={styles.subtitle}>
            {closingCopy}
          </Text>
        </View>
        <StatusBadge lifecycleStatus={goal.lifecycleStatus} resolutionStatus={goal.resolutionStatus} />
      </View>

      <View style={styles.recentSection}>
        <Text style={styles.recentLabel}>{goal.lifecycleStatus === 'closed' ? 'Ultimos dias del ciclo' : 'Ultimos 5 dias'}</Text>
        <View style={styles.recentCompact}>
          {summary.recentDays.map((day, index) => {
            const stateStyles = getRecentDayStyles(day.status);
            const weekdayLabel = day.date ? formatWeekdayShort(day.date) : '';

            return (
              <View key={`${goal.id}-${day.date ?? `empty-${index}`}`} style={styles.recentCell}>
                <View style={[styles.recentDay, stateStyles.container]}>
                  <Text style={styles.recentWeekdayLabel}>{weekdayLabel}</Text>
                  <Text style={[styles.recentDayLabel, stateStyles.label]}>{day.status === 'unavailable' ? 'X' : day.dayNumber}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.streakRow}>
          {!showCompletionFlag ? (
            <View style={styles.streakBadge}>
              <View style={styles.diamond}>
                <View style={styles.diamondInner}>
                  <MaterialCommunityIcons color="#F97316" name="fire" size={16} />
                </View>
              </View>
              <Text style={styles.streakValue}>{summary.currentStreak}</Text>
            </View>
          ) : null}
          <View style={styles.streakBadge}>
            <View style={styles.diamond}>
              <View style={styles.diamondInner}>
                <Feather color="#B45309" name="award" size={15} />
              </View>
            </View>
            <Text style={styles.streakValue}>{summary.bestStreak}</Text>
          </View>
          {!showCompletionFlag ? (
            <View style={styles.streakBadge}>
              <View style={styles.diamond}>
                <View style={styles.diamondInner}>
                  <MaterialCommunityIcons color={palette.ink} name="flag-checkered" size={16} />
                </View>
              </View>
              <Text style={styles.streakValue}>
                {goal.lifecycleStatus === 'closed' ? `${summary.completedDays}/${summary.requiredDays}` : summary.remainingDays}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityHint="Abre el detalle del objetivo"
            accessibilityLabel={`Ver detalle de ${goal.title}`}
            accessibilityRole="button"
            onPress={onOpenDetail}
            style={({ pressed }) => [styles.iconButton, pressed && styles.actionPressed]}>
            <Feather color={palette.ink} name="eye" size={18} />
          </Pressable>

          <Pressable
            accessibilityHint="Muestra mas acciones para este objetivo"
            accessibilityLabel={`Abrir menu de ${goal.title}`}
            accessibilityRole="button"
            onPress={(event) => {
              event.stopPropagation();
              onOpenActions();
            }}
            style={({ pressed }) => [styles.iconButton, pressed && styles.actionPressed]}>
            <Feather color={palette.ink} name="more-horizontal" size={18} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: '#D7DEE9',
    gap: 6,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleBlock: {
    flex: 1,
    paddingRight: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  completionFlagBadge: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  completionFlagBadgeSuccess: {
    backgroundColor: '#ECFDF3',
  },
  completionFlagBadgeDanger: {
    backgroundColor: '#FEF2F2',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
    lineHeight: 22,
    flex: 1,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: palette.slate,
    fontWeight: '600',
  },
  recentSection: {
    gap: 5,
  },
  recentLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.1,
  },
  recentCompact: {
    flexDirection: 'row',
    borderRadius: 10,
    alignSelf: 'flex-start',
    gap: 4,
  },
  recentCell: {
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    width: 38,
  },
  recentWeekdayLabel: {
    minHeight: 9,
    fontSize: 8,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'capitalize',
  },
  recentDay: {
    width: '100%',
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  recentDayCompleted: {
    backgroundColor: '#ECFDF3',
  },
  recentDayMissed: {
    backgroundColor: '#FFF1F2',
  },
  recentDayPending: {
    backgroundColor: '#FFFBEB',
  },
  recentDayUnavailable: {
    backgroundColor: '#F8FAFC',
  },
  recentDayLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  recentDayLabelCompleted: {
    color: '#15803D',
  },
  recentDayLabelMissed: {
    color: '#DC2626',
  },
  recentDayLabelPending: {
    color: '#CA8A04',
  },
  recentDayLabelUnavailable: {
    color: '#94A3B8',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  diamond: {
    width: 18,
    height: 18,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  diamondInner: {
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakValue: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.slate,
    marginLeft: -1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 36,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D7DEE9',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPressed: {
    opacity: 0.86,
  },
});
