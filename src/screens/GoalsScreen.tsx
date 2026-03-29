import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, InteractionManager, ListRenderItem, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { commonCopy, formatPageCounter } from '@/src/i18n/common';
import { getGoalSectionToggleHint, goalsCopy } from '@/src/i18n/goals';
import { HomeGoalSummary, Goal } from '@/src/models/types';
import { appRoutes } from '@/src/navigation/app-routes';
import { useAppStore } from '@/src/store/app-store';
import { getGoalDeadline } from '@/src/utils/goal-evaluation';

type GoalSectionKey = 'active' | 'closed';
const GOALS_PAGE_SIZE = 10;

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
    }
  | {
      type: 'pagination';
      key: `pagination-${GoalSectionKey}`;
      section: GoalSectionKey;
      currentPage: number;
      totalPages: number;
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

function getTotalPages(itemCount: number) {
  return Math.max(1, Math.ceil(itemCount / GOALS_PAGE_SIZE));
}

function paginateEntries<T>(entries: T[], page: number) {
  const startIndex = (page - 1) * GOALS_PAGE_SIZE;
  return entries.slice(startIndex, startIndex + GOALS_PAGE_SIZE);
}

export function GoalsScreen() {
  useTranslation();
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
  const [activePage, setActivePage] = useState(1);
  const [closedPage, setClosedPage] = useState(1);
  const [pendingSectionScroll, setPendingSectionScroll] = useState<GoalSectionKey | null>(null);

  useFocusEffect(
    useCallback(() => {
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      });
    }, []),
  );

  const queueSectionScroll = useCallback((section: GoalSectionKey) => {
    setPendingSectionScroll(section);
  }, []);

  const scrollToSectionStart = useCallback((section: GoalSectionKey, items: GoalListEntry[]) => {
    const sectionKey = `section-${section}` as const;
    const sectionIndex = items.findIndex((entry) => entry.key === sectionKey);

    if (sectionIndex < 0) {
      setPendingSectionScroll(null);
      return;
    }

    listRef.current?.scrollToIndex({
      index: sectionIndex,
      animated: true,
      viewPosition: 0,
    });
    setPendingSectionScroll(null);
  }, []);

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
  const totalActivePages = useMemo(() => getTotalPages(activeGoals.length), [activeGoals.length]);
  const totalClosedPages = useMemo(() => getTotalPages(closedGoals.length), [closedGoals.length]);
  const currentActivePage = Math.min(activePage, totalActivePages);
  const currentClosedPage = Math.min(closedPage, totalClosedPages);
  const paginatedActiveGoals = useMemo(
    () => paginateEntries(activeGoals, currentActivePage),
    [activeGoals, currentActivePage],
  );
  const paginatedClosedGoals = useMemo(
    () => paginateEntries(closedGoals, currentClosedPage),
    [closedGoals, currentClosedPage],
  );

  useEffect(() => {
    setActivePage((current) => Math.min(current, totalActivePages));
  }, [totalActivePages]);

  useEffect(() => {
    setClosedPage((current) => Math.min(current, totalClosedPages));
  }, [totalClosedPages]);

  const listData = useMemo<GoalListEntry[]>(() => {
    const items: GoalListEntry[] = [
      {
        type: 'section',
        key: 'section-active',
        title: goalsCopy.list.sections.active,
        count: activeGoals.length,
        expanded: showActiveGoals,
      },
    ];

    if (showActiveGoals) {
      if (activeGoals.length === 0) {
        items.push({
          type: 'empty',
          key: 'empty-active',
          message: goalsCopy.list.empty.active,
        });
      } else {
        items.push(
          ...paginatedActiveGoals.map(({ goal, summary }) => ({
            type: 'goal' as const,
            key: goal.id,
            goal,
            summary,
          })),
        );

        if (activeGoals.length > GOALS_PAGE_SIZE) {
          items.push({
            type: 'pagination',
            key: 'pagination-active',
            section: 'active',
            currentPage: currentActivePage,
            totalPages: totalActivePages,
          });
        }
      }
    }

    items.push({
      type: 'section',
      key: 'section-closed',
      title: goalsCopy.list.sections.closed,
      count: closedGoals.length,
      expanded: showClosedGoals,
    });

    if (showClosedGoals) {
      if (closedGoals.length === 0) {
        items.push({
          type: 'empty',
          key: 'empty-closed',
          message: goalsCopy.list.empty.closed,
        });
      } else {
        items.push(
          ...paginatedClosedGoals.map(({ goal, summary }) => ({
            type: 'goal' as const,
            key: `closed-${goal.id}`,
            goal,
            summary,
          })),
        );

        if (closedGoals.length > GOALS_PAGE_SIZE) {
          items.push({
            type: 'pagination',
            key: 'pagination-closed',
            section: 'closed',
            currentPage: currentClosedPage,
            totalPages: totalClosedPages,
          });
        }
      }
    }

    return items;
  }, [
    activeGoals,
    closedGoals,
    currentActivePage,
    currentClosedPage,
    paginatedActiveGoals,
    paginatedClosedGoals,
    showActiveGoals,
    showClosedGoals,
    totalActivePages,
    totalClosedPages,
  ]);

  useEffect(() => {
    if (!pendingSectionScroll) {
      return;
    }

    const interaction = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        scrollToSectionStart(pendingSectionScroll, listData);
      });
    });

    return () => interaction.cancel();
  }, [listData, pendingSectionScroll, scrollToSectionStart]);

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
        eyebrow: goalsCopy.list.confirmation.delete.eyebrow,
        title: goalsCopy.list.confirmation.delete.title,
        description: goalsCopy.list.confirmation.delete.description,
        confirmLabel: goalsCopy.list.confirmation.delete.confirm,
        tone: 'danger' as const,
      };
    }

    return {
      eyebrow: '',
      title: goalsCopy.list.confirmation.finalize.title,
      description: goalsCopy.list.confirmation.finalize.description,
      confirmLabel: goalsCopy.list.confirmation.finalize.confirm,
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
          accessibilityHint={getGoalSectionToggleHint(item.expanded ? commonCopy.actions.hide : commonCopy.actions.view, item.title)}
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

    if (item.type === 'pagination') {
      const isActiveSection = item.section === 'active';
      const onPrevious = () => {
        if (isActiveSection) {
          setActivePage((current) => Math.max(1, current - 1));
          queueSectionScroll('active');
          return;
        }

        setClosedPage((current) => Math.max(1, current - 1));
        queueSectionScroll('closed');
      };
      const onNext = () => {
        if (isActiveSection) {
          setActivePage((current) => Math.min(item.totalPages, current + 1));
          queueSectionScroll('active');
          return;
        }

        setClosedPage((current) => Math.min(item.totalPages, current + 1));
        queueSectionScroll('closed');
      };

      return (
        <View style={styles.paginationRow}>
          <Pressable
            accessibilityRole="button"
            disabled={item.currentPage === 1}
            onPress={onPrevious}
            style={({ pressed }) => [
              styles.paginationButton,
              item.currentPage === 1 && styles.paginationButtonDisabled,
              pressed && item.currentPage > 1 && styles.paginationButtonPressed,
            ]}>
            <Feather color={palette.primaryDeep} name="chevron-left" size={16} />
            <Text style={styles.paginationButtonLabel}>{goalsCopy.list.pagination.previous}</Text>
          </Pressable>

          <Text style={styles.paginationLabel}>
            {formatPageCounter(item.currentPage, item.totalPages)}
          </Text>

          <Pressable
            accessibilityRole="button"
            disabled={item.currentPage === item.totalPages}
            onPress={onNext}
            style={({ pressed }) => [
              styles.paginationButton,
              item.currentPage === item.totalPages && styles.paginationButtonDisabled,
              pressed && item.currentPage < item.totalPages && styles.paginationButtonPressed,
            ]}>
            <Text style={styles.paginationButtonLabel}>{goalsCopy.list.pagination.next}</Text>
            <Feather color={palette.primaryDeep} name="chevron-right" size={16} />
          </Pressable>
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
    <ScreenContainer bodyStyle={styles.screenBody} title={goalsCopy.list.screenTitle} scroll={false}>
      {goals.length === 0 ? (
        <View style={styles.contentSurface}>
          <View style={[styles.emptyStateWrapper, { paddingBottom: tabBarHeight + insets.bottom + 96 }]}>
            <EmptyState
              title={goalsCopy.list.empty.noGoalsTitle}
              message={goalsCopy.list.empty.noGoalsMessage}
              actionLabel={goalsCopy.form.buttons.createGoal}
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
            onScrollToIndexFailed={(info) => {
              listRef.current?.scrollToOffset({
                offset: Math.max(0, info.averageItemLength * info.index),
                animated: true,
              });

              requestAnimationFrame(() => {
                listRef.current?.scrollToIndex({
                  index: info.index,
                  animated: true,
                  viewPosition: 0,
                });
              });
            }}
            renderItem={renderGoal}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      <FloatingAddButton
        accessibilityHint={goalsCopy.form.buttons.createGoal}
        accessibilityLabel={goalsCopy.form.buttons.createGoal}
        bottomOffset={floatingButtonBottomOffset}
        rightOffset={floatingButtonRightOffset}
        onPress={() => router.push(appRoutes.createGoal)}
      />

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
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  paginationButton: {
    minWidth: 112,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CFE0FF',
    backgroundColor: '#EEF4FF',
  },
  paginationButtonPressed: {
    opacity: 0.84,
  },
  paginationButtonDisabled: {
    opacity: 0.45,
  },
  paginationButtonLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: palette.primaryDeep,
  },
  paginationLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: palette.slate,
  },
});
