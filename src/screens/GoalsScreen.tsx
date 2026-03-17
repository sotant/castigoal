import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Alert, FlatList, ListRenderItem, Pressable, StyleSheet, Text, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { EmptyState } from '@/src/components/EmptyState';
import { FloatingAddButton } from '@/src/components/FloatingAddButton';
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

export function GoalsScreen() {
  const today = startOfToday();
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
  const [showActiveGoals, setShowActiveGoals] = useState(true);
  const [showFinishedGoals, setShowFinishedGoals] = useState(false);

  const activeMenuGoal = useMemo(
    () => goals.find((goal) => goal.id === activeMenuGoalId) ?? null,
    [activeMenuGoalId, goals],
  );
  const summariesByGoalId = useMemo(
    () => new Map(homeSummary.goalSummaries.map((summary) => [summary.goalId, summary])),
    [homeSummary.goalSummaries],
  );
  const historicalGoals = useMemo<HistoricalGoalEntry[]>(() => {
    const goalById = new Map(goals.map((goal) => [goal.id, goal]));

    return homeSummary.goalSummaries
      .filter(isHistoricalGoal)
      .flatMap((summary) => {
        const goal = goalById.get(summary.goalId);

        if (!goal) {
          return [];
        }

        const deadline = addDays(goal.startDate, Math.max(goal.targetDays - 1, 0));

        return [{
          goal,
          summary,
          daysSinceEnd: Math.max(diffInDays(deadline, today), 0),
        }];
      })
      .sort((left, right) => left.daysSinceEnd - right.daysSinceEnd);
  }, [goals, homeSummary.goalSummaries, today]);
  const historicalGoalIds = useMemo(
    () => new Set(historicalGoals.map((item) => item.summary.goalId)),
    [historicalGoals],
  );
  const activeGoals = useMemo(
    () => goals.flatMap((goal) => {
      if (historicalGoalIds.has(goal.id)) {
        return [];
      }

      const summary = summariesByGoalId.get(goal.id);

      if (!summary) {
        return [];
      }

      return [{ goal, summary }];
    }),
    [goals, historicalGoalIds, summariesByGoalId],
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
    Alert.alert(
      'Borrar objetivo',
      'Se borraran tambien sus check-ins y castigos asignados. Esta accion no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            void deleteGoal(goal.id);
          },
        },
      ],
    );
  };

  const handleFinalize = (goal: Goal) => {
    closeMenu();
    Alert.alert(
      'Finalizar objetivo',
      'El objetivo dejara de estar activo y saldra de esta seccion. Podras seguir consultandolo despues.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            void toggleGoalActive(goal.id);
          },
        },
      ],
    );
  };

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
          style={({ pressed }) => [styles.sectionHeader, pressed && styles.sectionHeaderPressed]}>
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
        visible={Boolean(activeMenuGoal)}
      />
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
