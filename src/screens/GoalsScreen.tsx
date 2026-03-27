import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, ListRenderItem, Pressable, StyleSheet, Text, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { EmptyState } from '@/src/components/EmptyState';
import { FloatingAddButton } from '@/src/components/FloatingAddButton';
import { GoalActionConfirmationModal } from '@/src/components/GoalActionConfirmationModal';
import { ObjectiveActionsMenu } from '@/src/components/ObjectiveActionsMenu';
import { ObjectiveListItem } from '@/src/components/ObjectiveListItem';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, spacing } from '@/src/constants/theme';
import { HomeGoalSummary, Goal } from '@/src/models/types';
import { appRoutes } from '@/src/navigation/app-routes';
import { useAppStore } from '@/src/store/app-store';
import { getGoalDeadline } from '@/src/utils/goal-evaluation';

type GoalSectionKey = 'active' | 'closed';

type GoalListEntry =
  | {
      type: 'section';
      key: `section-${GoalSectionKey}`;
      title: string;
      count: number;
      expanded: boolean;
    }
  | {
      type: 'goal';
      key: string;
      goal: Goal;
      summary: HomeGoalSummary;
    }
  | {
      type: 'empty';
      key: `empty-${GoalSectionKey}`;
      message: string;
    };

type PendingGoalAction =
  | {
      type: 'delete' | 'finalize';
      goal: Goal;
    }
  | null;

type BusyGoalAction =
  | {
      type: 'delete' | 'finalize';
      goalId: string;
    }
  | null;

function compareUpcomingGoals(left: Goal, right: Goal) {
  const leftDeadline = getGoalDeadline(left);
  const rightDeadline = getGoalDeadline(right);

  if (leftDeadline !== rightDeadline) {
    return leftDeadline.localeCompare(rightDeadline);
  }

  if (left.startDate !== right.startDate) {
    return left.startDate.localeCompare(right.startDate);
  }

  if (left.createdAt !== right.createdAt) {
    return left.createdAt.localeCompare(right.createdAt);
  }

  return left.id.localeCompare(right.id);
}

function compareClosedGoals(left: Goal, right: Goal) {
  const leftDate = left.resolvedAt ?? left.closedOn ?? getGoalDeadline(left);
  const rightDate = right.resolvedAt ?? right.closedOn ?? getGoalDeadline(right);

  if (leftDate !== rightDate) {
    return rightDate.localeCompare(leftDate);
  }

  return compareUpcomingGoals(left, right);
}

function buildGoalEntries(goals: Goal[], summariesByGoalId: Map<string, HomeGoalSummary>) {
  return goals
    .flatMap((goal) => {
      const summary = summariesByGoalId.get(goal.id);
      return summary ? [{ goal, summary }] : [];
    })
    .sort((left, right) => compareUpcomingGoals(left.goal, right.goal));
}

function buildClosedGoalEntries(goals: Goal[], summariesByGoalId: Map<string, HomeGoalSummary>) {
  return goals
    .flatMap((goal) => {
      const summary = summariesByGoalId.get(goal.id);
      return summary ? [{ goal, summary }] : [];
    })
    .sort((left, right) => compareClosedGoals(left.goal, right.goal));
}

export function GoalsScreen() {
  const listRef = useRef<FlatList<GoalListEntry>>(null);
  const { deleteGoal, finalizeGoal, goals, homeSummary } = useAppStore(
    useShallow((state) => ({
      deleteGoal: state.deleteGoal,
      finalizeGoal: state.finalizeGoal,
      goals: state.goals,
      homeSummary: state.homeSummary,
    })),
  );
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const floatingButtonBottomOffset = 26;
  const floatingButtonRightOffset = 6;
  const [activeMenuGoalId, setActiveMenuGoalId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingGoalAction>(null);
  const [busyAction, setBusyAction] = useState<BusyGoalAction>(null);
  const [showActiveGoals, setShowActiveGoals] = useState(true);
  const [showClosedGoals, setShowClosedGoals] = useState(false);

  useFocusEffect(
    useCallback(() => {
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      });
    }, []),
  );

  const activeMenuGoal = useMemo(
    () => goals.find((goal) => goal.id === activeMenuGoalId) ?? null,
    [activeMenuGoalId, goals],
  );
  const summariesByGoalId = useMemo(
    () => new Map(homeSummary.goalSummaries.map((summary) => [summary.goalId, summary])),
    [homeSummary.goalSummaries],
  );

  const activeGoals = useMemo(
    () => buildGoalEntries(goals.filter((goal) => goal.lifecycleStatus === 'active'), summariesByGoalId),
    [goals, summariesByGoalId],
  );
  const closedGoals = useMemo(
    () => buildClosedGoalEntries(goals.filter((goal) => goal.lifecycleStatus === 'closed'), summariesByGoalId),
    [goals, summariesByGoalId],
  );

  const listData = useMemo<GoalListEntry[]>(() => {
    const items: GoalListEntry[] = [
      {
        type: 'section',
        key: 'section-active',
        title: 'Activos',
        count: activeGoals.length,
        expanded: showActiveGoals,
      },
    ];

    if (showActiveGoals) {
      if (activeGoals.length === 0) {
        items.push({
          type: 'empty',
          key: 'empty-active',
          message: 'No tienes objetivos activos ahora mismo.',
        });
      } else {
        items.push(
          ...activeGoals.map(({ goal, summary }) => ({
            type: 'goal' as const,
            key: goal.id,
            goal,
            summary,
          })),
        );
      }
    }

    items.push({
      type: 'section',
      key: 'section-closed',
      title: 'Finalizados',
      count: closedGoals.length,
      expanded: showClosedGoals,
    });

    if (showClosedGoals) {
      if (closedGoals.length === 0) {
        items.push({
          type: 'empty',
          key: 'empty-closed',
          message: 'Todavia no hay objetivos finalizados.',
        });
      } else {
        items.push(
          ...closedGoals.map(({ goal, summary }) => ({
            type: 'goal' as const,
            key: `closed-${goal.id}`,
            goal,
            summary,
          })),
        );
      }
    }

    return items;
  }, [activeGoals, closedGoals, showActiveGoals, showClosedGoals]);

  const closeMenu = () => setActiveMenuGoalId(null);
  const closeConfirmationModal = () => setPendingAction(null);

  const confirmPendingAction = async () => {
    if (!pendingAction || busyAction) {
      return;
    }

    const { goal, type } = pendingAction;
    setPendingAction(null);
    setBusyAction({ goalId: goal.id, type });

    try {
      if (type === 'delete') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        await deleteGoal(goal.id);
        return;
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await finalizeGoal(goal.id);
    } finally {
      setBusyAction((current) => (current?.goalId === goal.id ? null : current));
    }
  };

  const confirmationCopy = useMemo(() => {
    if (!pendingAction) {
      return null;
    }

    if (pendingAction.type === 'delete') {
      return {
        eyebrow: 'Eliminar objetivo',
        title: 'Borrar objetivo',
        description: 'Se borraran tambien sus check-ins, outcomes y castigos asignados. Esta accion no se puede deshacer.',
        confirmLabel: 'Borrar',
        tone: 'danger' as const,
      };
    }

    return {
      eyebrow: 'Cerrar ciclo',
      title: 'Finalizar objetivo',
      description: 'Se cerrara el objetivo y se resolvera ahora mismo con la misma logica que usa la app al expirar.',
      confirmLabel: 'Finalizar',
      tone: 'default' as const,
    };
  }, [pendingAction]);

  const renderGoal: ListRenderItem<GoalListEntry> = ({ item }) => {
    if (item.type === 'section') {
      const onToggle =
        item.key === 'section-active'
          ? () => setShowActiveGoals((current) => !current)
          : () => setShowClosedGoals((current) => !current);

      return (
        <Pressable
          accessibilityHint={`${item.expanded ? 'Oculta' : 'Muestra'} la seccion ${item.title.toLowerCase()}`}
          accessibilityRole="button"
          onPress={onToggle}
          style={({ pressed }) => [styles.sectionHeader, item.key !== 'section-active' && styles.sectionHeaderSpaced, pressed && styles.sectionHeaderPressed]}>
          <View style={styles.sectionHeaderCopy}>
            <Text style={styles.sectionTitle}>{item.title}</Text>
            <Text style={styles.sectionMeta}>{item.count}</Text>
          </View>
          <Feather color={palette.primaryDeep} name={item.expanded ? 'chevron-down' : 'chevron-right'} size={20} />
        </Pressable>
      );
    }

    if (item.type === 'empty') {
      return (
        <View style={styles.sectionEmpty}>
          <Text style={styles.sectionEmptyText}>{item.message}</Text>
        </View>
      );
    }

    return (
      <ObjectiveListItem
        goal={item.goal}
        summary={item.summary}
        showCompletionFlag={item.goal.lifecycleStatus === 'closed'}
        onOpenDetail={() => router.push(appRoutes.goalDetail(item.goal.id))}
        onOpenActions={() => {
          if (!busyAction) {
            setActiveMenuGoalId(item.goal.id);
          }
        }}
      />
    );
  };

  return (
    <ScreenContainer bodyStyle={styles.screenBody} title="Objetivos" scroll={false}>
      {goals.length === 0 ? (
        <View style={styles.contentSurface}>
          <View style={[styles.emptyStateWrapper, { paddingBottom: tabBarHeight + insets.bottom + 96 }]}>
            <EmptyState
              title="No hay objetivos todavia"
              message="Crea tu primer objetivo para empezar a registrar avances, cerrar ciclos y mantener el foco."
              actionLabel="Crear objetivo"
              onAction={() => router.push(appRoutes.createGoal)}
            />
          </View>
        </View>
      ) : (
        <View style={styles.contentSurface}>
          <FlatList
            ref={listRef}
            style={styles.list}
            contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + insets.bottom + 88 }]}
            data={listData}
            keyExtractor={(item) => item.key}
            keyboardShouldPersistTaps="handled"
            renderItem={renderGoal}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      <FloatingAddButton bottomOffset={floatingButtonBottomOffset} rightOffset={floatingButtonRightOffset} onPress={() => router.push(appRoutes.createGoal)} />

      <ObjectiveActionsMenu
        goalTitle={activeMenuGoal?.title ?? ''}
        onClose={closeMenu}
        onFinalize={() => {
          if (activeMenuGoal) {
            closeMenu();
            setPendingAction({ type: 'finalize', goal: activeMenuGoal });
          }
        }}
        onDelete={() => {
          if (activeMenuGoal) {
            closeMenu();
            setPendingAction({ type: 'delete', goal: activeMenuGoal });
          }
        }}
        onEdit={() => {
          if (!activeMenuGoal) {
            return;
          }

          const goalId = activeMenuGoal.id;
          closeMenu();
          router.push(appRoutes.editGoal(goalId));
        }}
        showFinalize={Boolean(activeMenuGoal && activeMenuGoal.lifecycleStatus !== 'closed')}
        showEdit={Boolean(activeMenuGoal && activeMenuGoal.lifecycleStatus !== 'closed')}
        visible={Boolean(activeMenuGoal)}
      />

      {confirmationCopy ? (
        <GoalActionConfirmationModal
          confirmLabel={confirmationCopy.confirmLabel}
          description={confirmationCopy.description}
          eyebrow={confirmationCopy.eyebrow}
          onCancel={closeConfirmationModal}
          onConfirm={confirmPendingAction}
          title={confirmationCopy.title}
          tone={confirmationCopy.tone}
          visible
        />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  emptyStateWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  screenBody: {
    paddingBottom: 0,
  },
  contentSurface: {
    flex: 1,
  },
  listContent: {
    gap: 3,
  },
  list: {
    flex: 1,
  },
  sectionHeader: {
    marginTop: spacing.xs,
    marginBottom: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#ECF2FB',
    borderWidth: 1,
    borderColor: '#D6E1F1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionHeaderSpaced: {
    marginTop: spacing.lg,
  },
  sectionHeaderPressed: {
    opacity: 0.86,
  },
  sectionHeaderCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.ink,
  },
  sectionMeta: {
    minWidth: 24,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: palette.snow,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: palette.primaryDeep,
  },
  sectionEmpty: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 18,
    backgroundColor: '#F1F5FB',
    borderWidth: 1,
    borderColor: '#D6E1F1',
  },
  sectionEmptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.slate,
  },
});
