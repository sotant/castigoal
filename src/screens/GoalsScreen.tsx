import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
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
import { appRoutes } from '@/src/navigation/app-routes';
import { HomeGoalSummary, Goal } from '@/src/models/types';
import { useAppStore } from '@/src/store/app-store';
import { addDays, diffInDays, startOfToday } from '@/src/utils/date';

function isHistoricalGoal(summary: HomeGoalSummary) {
  return summary.daysUntilStart === 0 && summary.remainingDays === 0;
}

function canReactivateGoal(goal: Goal, today: string) {
  const deadline = addDays(goal.startDate, Math.max(goal.targetDays - 1, 0));
  return !goal.active && today <= deadline;
}

function getGoalDeadline(goal: Goal) {
  return addDays(goal.startDate, Math.max(goal.targetDays - 1, 0));
}

function compareGoalsByDeadline(left: Goal, right: Goal) {
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

type HistoricalGoalEntry = {
  goal: Goal;
  summary: HomeGoalSummary;
  daysSinceEnd: number;
};

type GoalListEntry =
  | {
      type: 'section';
      key: 'section-active' | 'section-finished';
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
      type: 'finished';
      key: string;
      goal: Goal;
      summary: HomeGoalSummary;
    }
  | {
      type: 'empty';
      key: 'empty-active' | 'empty-finished';
      message: string;
    };

type PendingGoalAction =
  | {
      type: 'delete' | 'finalize' | 'reactivate';
      goal: Goal;
    }
  | null;

type ProcessingGoalAction =
  | {
      type: 'delete' | 'finalize' | 'reactivate';
      goalId: string;
    }
  | null;

export function GoalsScreen() {
  const today = startOfToday();
  const listRef = useRef<FlatList<GoalListEntry>>(null);
  const { deleteGoal, goals, homeSummary, toggleGoalActive } = useAppStore(
    useShallow((state) => ({
      deleteGoal: state.deleteGoal,
      goals: state.goals,
      homeSummary: state.homeSummary,
      toggleGoalActive: state.toggleGoalActive,
    })),
  );
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const floatingButtonBottomOffset = 4;
  const [activeMenuGoalId, setActiveMenuGoalId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingGoalAction>(null);
  const [processingAction, setProcessingAction] = useState<ProcessingGoalAction>(null);
  const [showActiveGoals, setShowActiveGoals] = useState(true);
  const [showFinishedGoals, setShowFinishedGoals] = useState(false);

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
  const visibleGoals = useMemo(() => {
    if (!processingAction) {
      return goals;
    }

    if (processingAction.type === 'delete') {
      return goals.filter((goal) => goal.id !== processingAction.goalId);
    }

    return goals.map((goal) =>
      goal.id === processingAction.goalId
        ? {
            ...goal,
            active: processingAction.type === 'reactivate',
          }
        : goal,
    );
  }, [goals, processingAction]);
  const historicalGoals = useMemo<HistoricalGoalEntry[]>(() => {
    const goalById = new Map(visibleGoals.map((goal) => [goal.id, goal]));

    return homeSummary.goalSummaries
      .flatMap((summary) => {
        const goal = goalById.get(summary.goalId);

        if (!goal || (goal.active && !isHistoricalGoal(summary))) {
          return [];
        }

        const deadline = getGoalDeadline(goal);

        return [
          {
            goal,
            summary,
            daysSinceEnd: Math.max(diffInDays(deadline, today), 0),
          },
        ];
      })
      .sort((left, right) => {
        const byDeadline = compareGoalsByDeadline(left.goal, right.goal);
        if (byDeadline !== 0) {
          return byDeadline;
        }

        return left.daysSinceEnd - right.daysSinceEnd;
      });
  }, [homeSummary.goalSummaries, today, visibleGoals]);
  const historicalGoalIds = useMemo(
    () => new Set(historicalGoals.map((item) => item.summary.goalId)),
    [historicalGoals],
  );
  const activeGoals = useMemo(
    () => visibleGoals.flatMap((goal) => {
      if (historicalGoalIds.has(goal.id)) {
        return [];
      }

      if (!goal.active) {
        return [];
      }

      const summary = summariesByGoalId.get(goal.id);

      if (!summary) {
        return [];
      }

      return [{ goal, summary }];
    }).sort((left, right) => compareGoalsByDeadline(left.goal, right.goal)),
    [historicalGoalIds, summariesByGoalId, visibleGoals],
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
      key: 'section-finished',
      title: 'Finalizados',
      count: historicalGoals.length,
      expanded: showFinishedGoals,
    });

    if (showFinishedGoals) {
      if (historicalGoals.length === 0) {
        items.push({
          type: 'empty',
          key: 'empty-finished',
          message: 'Todavia no hay objetivos finalizados.',
        });
      } else {
        items.push(
          ...historicalGoals.map((item) => ({
            type: 'finished' as const,
            key: `finished-${item.goal.id}`,
            goal: item.goal,
            summary: item.summary,
          })),
        );
      }
    }

    return items;
  }, [activeGoals, historicalGoals, showActiveGoals, showFinishedGoals]);

  const closeMenu = () => setActiveMenuGoalId(null);

  const handleDelete = (goal: Goal) => {
    closeMenu();
    setPendingAction({ type: 'delete', goal });
  };

  const handleFinalize = (goal: Goal) => {
    closeMenu();
    setPendingAction({ type: 'finalize', goal });
  };

  const handleReactivate = (goal: Goal) => {
    closeMenu();
    setPendingAction({ type: 'reactivate', goal });
  };

  const closeConfirmationModal = () => setPendingAction(null);

  const confirmPendingAction = async () => {
    if (!pendingAction) {
      return;
    }

    const { goal, type } = pendingAction;
    setPendingAction(null);
    setProcessingAction({ goalId: goal.id, type });

    try {
      if (type === 'delete') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        await deleteGoal(goal.id);
        return;
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await toggleGoalActive(goal.id);
    } finally {
      setProcessingAction((current) => (current?.goalId === goal.id ? null : current));
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
        description: 'Se borraran tambien sus check-ins y castigos asignados. Esta accion no se puede deshacer.',
        confirmLabel: 'Borrar',
        tone: 'danger' as const,
      };
    }

    return {
      eyebrow: pendingAction.type === 'reactivate' ? 'Reabrir ciclo' : 'Cerrar ciclo',
      title: pendingAction.type === 'reactivate' ? 'Reactivar objetivo' : 'Finalizar objetivo',
      description:
        pendingAction.type === 'reactivate'
          ? 'El objetivo volvera a la lista de activos para que puedas seguir registrando avances hasta su fecha limite.'
          : 'El objetivo dejara de estar activo y saldra de esta seccion. Podras seguir consultandolo despues.',
      confirmLabel: pendingAction.type === 'reactivate' ? 'Reactivar' : 'Finalizar',
      tone: 'default' as const,
    };
  }, [pendingAction]);

  const renderGoal: ListRenderItem<GoalListEntry> = ({ item }) => {
    if (item.type === 'section') {
      const isActiveSection = item.key === 'section-active';

      return (
        <Pressable
          accessibilityHint={`${item.expanded ? 'Oculta' : 'Muestra'} la seccion ${item.title.toLowerCase()}`}
          accessibilityRole="button"
          onPress={() => {
            if (isActiveSection) {
              setShowActiveGoals((current) => !current);
              return;
            }

            setShowFinishedGoals((current) => !current);
          }}
          style={({ pressed }) => [
            styles.sectionHeader,
            !isActiveSection && styles.sectionHeaderFinished,
            pressed && styles.sectionHeaderPressed,
          ]}>
          <View style={styles.sectionHeaderCopy}>
            <Text style={styles.sectionTitle}>{item.title}</Text>
            <Text style={styles.sectionMeta}>{item.count}</Text>
          </View>
          <Feather
            color={palette.primaryDeep}
            name={item.expanded ? 'chevron-down' : 'chevron-right'}
            size={20}
          />
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

    if (item.type === 'finished') {
      return (
        <ObjectiveListItem
          goal={item.goal}
          summary={item.summary}
          showCompletionFlag
          onOpenDetail={() => router.push(appRoutes.goalDetail(item.goal.id))}
          onOpenActions={() => setActiveMenuGoalId(item.goal.id)}
        />
      );
    }

    return (
      <ObjectiveListItem
        goal={item.goal}
        summary={item.summary}
        onOpenDetail={() => router.push(appRoutes.goalDetail(item.goal.id))}
        onOpenActions={() => setActiveMenuGoalId(item.goal.id)}
      />
    );
  };

  return (
    <ScreenContainer
      bodyStyle={styles.screenBody}
      title="Objetivos"
      scroll={false}>
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
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: tabBarHeight + insets.bottom + 88 },
            ]}
            data={listData}
            keyExtractor={(item) => item.key}
            keyboardShouldPersistTaps="handled"
            renderItem={renderGoal}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
      <FloatingAddButton
        bottomOffset={floatingButtonBottomOffset}
        onPress={() => router.push(appRoutes.createGoal)}
      />
      <ObjectiveActionsMenu
        goalTitle={activeMenuGoal?.title ?? ''}
        onClose={closeMenu}
        onFinalize={() => {
          if (activeMenuGoal) {
            handleFinalize(activeMenuGoal);
          }
        }}
        onReactivate={() => {
          if (activeMenuGoal) {
            handleReactivate(activeMenuGoal);
          }
        }}
        onDelete={() => {
          if (activeMenuGoal) {
            handleDelete(activeMenuGoal);
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
        showFinalize={Boolean(activeMenuGoal?.active)}
        showReactivate={Boolean(activeMenuGoal && canReactivateGoal(activeMenuGoal, today))}
        showEdit={Boolean(activeMenuGoal?.active)}
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
  sectionHeaderFinished: {
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
