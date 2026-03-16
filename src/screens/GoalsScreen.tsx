import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, ListRenderItem, StyleSheet, Text, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { EmptyState } from '@/src/components/EmptyState';
import { FloatingAddButton } from '@/src/components/FloatingAddButton';
import { ObjectiveHistoryCard } from '@/src/components/ObjectiveHistoryCard';
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

export function GoalsScreen() {
  const today = startOfToday();
  const { deleteGoal, goals, homeSummary } = useAppStore(
    useShallow((state) => ({
      deleteGoal: state.deleteGoal,
      goals: state.goals,
      homeSummary: state.homeSummary,
    })),
  );
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const [activeMenuGoalId, setActiveMenuGoalId] = useState<string | null>(null);

  const activeMenuGoal = useMemo(
    () => goals.find((goal) => goal.id === activeMenuGoalId) ?? null,
    [activeMenuGoalId, goals],
  );
  const summariesByGoalId = useMemo(
    () => new Map(homeSummary.goalSummaries.map((summary) => [summary.goalId, summary])),
    [homeSummary.goalSummaries],
  );
  const historicalGoals = useMemo(() => {
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
          summary,
          daysSinceEnd: Math.max(diffInDays(deadline, today), 0),
          passed: summary.completionRate >= goal.minimumSuccessRate,
        }];
      })
      .sort((left, right) => left.daysSinceEnd - right.daysSinceEnd);
  }, [goals, homeSummary.goalSummaries, today]);

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

  const renderGoal: ListRenderItem<Goal> = ({ item }) => {
    const summary = summariesByGoalId.get(item.id);

    if (!summary) {
      return null;
    }

    return (
      <ObjectiveListItem
        goal={item}
        summary={summary}
        onOpenDetail={() => router.push(appRoutes.goalDetail(item.id))}
        onOpenActions={() => setActiveMenuGoalId(item.id)}
      />
    );
  };

  const listFooter = historicalGoals.length > 0 ? (
    <View style={styles.historySection}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyEyebrow}>Historico</Text>
        <Text style={styles.historyTitle}>Objetivos cerrados recientemente</Text>
        <Text style={styles.historySubtitle}>
          Consulta rapido como terminaron tus ciclos anteriores sin cargar la pantalla de hoy.
        </Text>
      </View>
      {historicalGoals.map((item) => (
        <ObjectiveHistoryCard key={item.summary.goalId} item={item} />
      ))}
    </View>
  ) : null;

  return (
    <ScreenContainer
      title="Objetivos"
      scroll={false}>
      {goals.length === 0 ? (
        <View style={[styles.emptyStateWrapper, { paddingBottom: tabBarHeight + insets.bottom + 96 }]}>
          <EmptyState
            title="No hay objetivos todavia"
            message="Crea tu primer objetivo para empezar a registrar avances, cerrar ciclos y mantener el foco."
            actionLabel="Crear objetivo"
            onAction={() => router.push(appRoutes.createGoal)}
          />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: tabBarHeight + insets.bottom + 104 },
          ]}
          data={goals}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={listFooter}
          renderItem={renderGoal}
          showsVerticalScrollIndicator={false}
        />
      )}
      <FloatingAddButton
        bottomOffset={tabBarHeight - 30}
        onPress={() => router.push(appRoutes.createGoal)}
      />
      <ObjectiveActionsMenu
        goalTitle={activeMenuGoal?.title ?? ''}
        onClose={closeMenu}
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
  listContent: {
    gap: 3,
  },
  historySection: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  historyHeader: {
    gap: 4,
    paddingTop: 4,
  },
  historyEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: palette.primaryDeep,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.ink,
  },
  historySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.slate,
  },
});
