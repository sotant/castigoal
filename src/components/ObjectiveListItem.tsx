import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Goal } from '@/src/models/types';
import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import { StatusBadge } from '@/src/components/StatusBadge';

type Props = {
  goal: Goal;
  onOpenDetail: () => void;
  onOpenActions: () => void;
  onToggleActive: () => void;
};

export function ObjectiveListItem({ goal, onOpenDetail, onOpenActions, onToggleActive }: Props) {
  const primaryActionLabel = goal.active ? 'Finalizar' : 'Reactivar';

  return (
    <Pressable
      accessibilityHint="Abre el detalle del objetivo"
      accessibilityRole="button"
      onPress={onOpenDetail}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.title}>
            {goal.title}
          </Text>
          {goal.description ? (
            <Text numberOfLines={2} style={styles.description}>
              {goal.description}
            </Text>
          ) : (
            <Text numberOfLines={1} style={styles.placeholder}>
              Sin descripcion adicional
            </Text>
          )}
        </View>
        <StatusBadge active={goal.active} />
      </View>

      <View style={styles.footer}>
        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Feather color="#6D7B91" name="calendar" size={13} />
            <Text style={styles.metaText}>
              {goal.targetDays} {goal.targetDays === 1 ? 'dia' : 'dias'} por ciclo
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityHint={`${primaryActionLabel} este objetivo`}
            accessibilityRole="button"
            onPress={onToggleActive}
            style={({ pressed }) => [
              styles.primaryAction,
              goal.active ? styles.finishAction : styles.reactivateAction,
              pressed && styles.actionPressed,
            ]}>
            <Feather color={goal.active ? '#B45309' : '#177245'} name={goal.active ? 'pause-circle' : 'rotate-ccw'} size={15} />
            <Text style={[styles.primaryActionLabel, goal.active ? styles.finishLabel : styles.reactivateLabel]}>
              {primaryActionLabel}
            </Text>
          </Pressable>

          <Pressable
            accessibilityHint="Muestra mas acciones para este objetivo"
            accessibilityLabel={`Abrir menu de ${goal.title}`}
            accessibilityRole="button"
            onPress={onOpenActions}
            style={({ pressed }) => [styles.moreButton, pressed && styles.actionPressed]}>
            <Feather color={palette.ink} name="more-horizontal" size={18} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: 24,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: '#E4EAF3',
    gap: 14,
    ...shadows.card,
  },
  cardPressed: {
    opacity: 0.97,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: 6,
    paddingTop: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5E6E84',
  },
  placeholder: {
    fontSize: 14,
    lineHeight: 20,
    color: '#97A4B7',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metaRow: {
    flex: 1,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: '#F4F7FB',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6D7B91',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  finishAction: {
    backgroundColor: '#FFF5E8',
    borderColor: '#F7D2A7',
  },
  reactivateAction: {
    backgroundColor: '#EAF8F0',
    borderColor: '#CBECD8',
  },
  primaryActionLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  finishLabel: {
    color: '#B45309',
  },
  reactivateLabel: {
    color: '#177245',
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F7FB',
  },
  actionPressed: {
    opacity: 0.9,
  },
});
