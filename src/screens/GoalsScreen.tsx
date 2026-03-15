import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { EmptyState } from '@/src/components/EmptyState';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import { appRoutes } from '@/src/navigation/app-routes';
import { Goal } from '@/src/models/types';
import { useAppStore } from '@/src/store/app-store';

function GoalRow({
  goal,
  isConfirmingDelete,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  onToggleActive,
}: {
  goal: Goal;
  isConfirmingDelete: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onToggleActive: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.copy}>
          <Text style={styles.title}>{goal.title}</Text>
          {goal.description ? <Text style={styles.description}>{goal.description}</Text> : null}
        </View>
        <Text style={[styles.badge, goal.active ? styles.badgeActive : styles.badgeFinalized]}>
          {goal.active ? 'Activo' : 'Finalizado'}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <Pressable onPress={onToggleActive} style={[styles.secondaryButton, goal.active ? styles.finalizeButton : styles.activateButton]}>
          <Text style={[styles.secondaryLabel, goal.active ? styles.finalizeLabel : styles.activateLabel]}>
            {goal.active ? 'Finalizar' : 'Reactivar'}
          </Text>
        </Pressable>
        <Pressable onPress={() => router.push(appRoutes.editGoal(goal.id))} style={styles.secondaryButton}>
          <Text style={styles.secondaryLabel}>Editar</Text>
        </Pressable>
        <Pressable onPress={isConfirmingDelete ? onCancelDelete : onAskDelete} style={styles.dangerButton}>
          <Text style={styles.dangerLabel}>{isConfirmingDelete ? 'Cancelar borrado' : 'Borrar'}</Text>
        </Pressable>
      </View>

      {isConfirmingDelete ? (
        <View style={styles.confirmCard}>
          <Text style={styles.confirmText}>
            Se borrara este objetivo junto con sus check-ins y castigos asignados. Esta accion no se puede deshacer.
          </Text>
          <Pressable onPress={onConfirmDelete} style={styles.confirmDeleteButton}>
            <Text style={styles.confirmDeleteLabel}>Confirmar borrado</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function GoalsScreen() {
  const { deleteGoal, goals, toggleGoalActive } = useAppStore(
    useShallow((state) => ({
      deleteGoal: state.deleteGoal,
      goals: state.goals,
      toggleGoalActive: state.toggleGoalActive,
    })),
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <ScreenContainer
      title="Objetivos"
      subtitle="Lista de objetivos guardados."
      scroll={false}>
      {goals.length === 0 ? (
        <View style={styles.emptyStateWrapper}>
          <EmptyState
            title="No hay objetivos todavia"
            message="Crea tu primer objetivo para empezar a registrar tus progresos."
            actionLabel="Crear objetivo"
            onAction={() => router.push(appRoutes.createGoal)}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {goals.map((goal) => (
            <GoalRow
              key={goal.id}
              goal={goal}
              isConfirmingDelete={confirmDeleteId === goal.id}
              onAskDelete={() => setConfirmDeleteId(goal.id)}
              onCancelDelete={() => setConfirmDeleteId(null)}
              onConfirmDelete={() => {
                void deleteGoal(goal.id).then(() => {
                  setConfirmDeleteId(null);
                });
              }}
              onToggleActive={() => {
                void toggleGoalActive(goal.id);
              }}
            />
          ))}
        </ScrollView>
      )}
      <Pressable onPress={() => router.push(appRoutes.createGoal)} style={styles.fab}>
        <Text style={styles.fabLabel}>+</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: palette.line,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
  },
  description: {
    color: palette.slate,
    lineHeight: 21,
  },
  badge: {
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    fontSize: 12,
    fontWeight: '700',
  },
  badgeActive: {
    backgroundColor: '#DCFCE7',
    color: palette.success,
  },
  badgeFinalized: {
    backgroundColor: '#E0F2FE',
    color: '#075985',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
  },
  secondaryLabel: {
    color: palette.ink,
    fontWeight: '800',
  },
  activateButton: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  activateLabel: {
    color: palette.success,
  },
  finalizeButton: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  finalizeLabel: {
    color: '#C2410C',
  },
  dangerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: '#FEE4E2',
  },
  dangerLabel: {
    color: palette.danger,
    fontWeight: '800',
  },
  confirmCard: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#FEF2F2',
    gap: spacing.sm,
  },
  confirmText: {
    color: palette.slate,
    lineHeight: 20,
  },
  confirmDeleteButton: {
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: palette.danger,
  },
  confirmDeleteLabel: {
    color: palette.snow,
    fontWeight: '800',
  },
  emptyStateWrapper: {
    flex: 1,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: 112,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
    ...shadows.card,
  },
  fabLabel: {
    color: palette.snow,
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '700',
  },
});
