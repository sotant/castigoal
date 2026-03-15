import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProgressRing } from '@/src/components/ProgressRing';
import { palette, radius, shadows, spacing } from '@/src/constants/theme';

type Props = {
  title: string;
  description?: string;
  currentStreak: number;
  bestStreak: number;
  todayLabel: string;
  deadlineLabel?: string;
  deadlineWarning?: boolean;
  todayStatus?: 'completed' | 'pending' | 'missed';
  completionRate: number;
  onDelete?: () => void;
  onPress?: () => void;
  onQuickCheck?: () => void;
  disabled?: boolean;
  muted?: boolean;
};

export function GoalCard({
  title,
  description,
  currentStreak,
  bestStreak,
  todayLabel,
  deadlineLabel,
  deadlineWarning = false,
  todayStatus,
  completionRate,
  onDelete,
  onPress,
  onQuickCheck,
  disabled = false,
  muted = false,
}: Props) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.card, muted && styles.cardDisabled]}>
      <View style={styles.topRow}>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, muted && styles.titleDisabled]}>{title}</Text>
            {onDelete && !disabled ? (
              <Pressable
                hitSlop={10}
                onPress={(event) => {
                  event.stopPropagation();
                  onDelete();
                }}
                style={styles.deleteButton}>
                <Feather color={palette.danger} name="trash-2" size={18} />
              </Pressable>
            ) : null}
          </View>
          {description ? <Text style={[styles.description, muted && styles.copyDisabled]}>{description}</Text> : null}
          <Text
            style={[
              styles.status,
              todayStatus === 'completed' && styles.statusCompleted,
              todayStatus === 'pending' && styles.statusPending,
              todayStatus === 'missed' && styles.statusMissed,
              muted && styles.statusDisabled,
            ]}>
            {todayLabel}
          </Text>
          {deadlineLabel ? (
            <Text style={[styles.deadline, deadlineWarning && styles.deadlineWarning, muted && styles.copyDisabled]}>
              {deadlineLabel}
            </Text>
          ) : null}
        </View>
        <ProgressRing value={completionRate} />
      </View>

      <View style={styles.footer}>
        <Text style={[styles.meta, muted && styles.copyDisabled]}>Racha {currentStreak} d</Text>
        <Text style={[styles.meta, muted && styles.copyDisabled]}>Mejor {bestStreak} d</Text>
        {!muted && onQuickCheck ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onQuickCheck();
            }}
            style={styles.quickButton}>
            <Text style={styles.quickButtonLabel}>Check-in</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: palette.line,
    ...shadows.card,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: palette.ink,
  },
  titleDisabled: {
    color: palette.slate,
  },
  deleteButton: {
    padding: 6,
    borderRadius: radius.pill,
    backgroundColor: '#FEF2F2',
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: palette.slate,
  },
  copyDisabled: {
    color: palette.slate,
  },
  status: {
    marginTop: spacing.sm,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusCompleted: {
    color: palette.success,
  },
  statusPending: {
    color: '#FFA500',
  },
  statusMissed: {
    color: palette.danger,
  },
  statusDisabled: {
    color: palette.slate,
  },
  deadline: {
    fontSize: 13,
    lineHeight: 19,
    color: palette.primaryDeep,
    fontWeight: '600',
  },
  deadlineWarning: {
    color: palette.warning,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  meta: {
    fontSize: 13,
    color: palette.slate,
  },
  quickButton: {
    marginLeft: 'auto',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: palette.primary,
  },
  quickButtonLabel: {
    color: palette.snow,
    fontWeight: '700',
  },
});


