import { useEffect, useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Directions, FlingGestureHandler } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/src/components/EmptyState';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import { formatMonthLabel, getMonthDate, getMonthStart, WEEKDAY_LABELS } from '@/src/features/stats/calendar';
import { selectStatsCalendar, useAppStore } from '@/src/store/app-store';

type OverviewCard = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  tone: string;
  value: number;
};

export function StatsScreen() {
  const goals = useAppStore((state) => state.goals);
  const homeSummary = useAppStore((state) => state.homeSummary);
  const statsSummary = useAppStore((state) => state.statsSummary);
  const statsLoaded = useAppStore((state) => state.statsLoaded);
  const loadStatsCalendar = useAppStore((state) => state.loadStatsCalendar);
  const refreshStatsSummary = useAppStore((state) => state.refreshStatsSummary);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(goals[0]?.id ?? null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [isGoalDropdownOpen, setIsGoalDropdownOpen] = useState(false);
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!statsLoaded) {
      void refreshStatsSummary();
    }
  }, [refreshStatsSummary, statsLoaded]);

  useEffect(() => {
    if (!selectedGoalId || !goals.some((goal) => goal.id === selectedGoalId)) {
      setSelectedGoalId(goals[0]?.id ?? null);
    }
  }, [goals, selectedGoalId]);

  useEffect(() => {
    if (goals.length <= 1) {
      setIsGoalDropdownOpen(false);
    }
  }, [goals.length]);

  const hasGoals = goals.length > 0;
  const hasMultipleGoals = goals.length > 1;
  const selectedGoal = goals.find((goal) => goal.id === selectedGoalId) ?? goals[0] ?? null;
  const monthDate = getMonthDate(monthOffset);
  const monthLabel = formatMonthLabel(monthDate);
  const monthStart = useMemo(() => getMonthStart(monthDate), [monthDate]);
  const calendarDays = useAppStore(selectStatsCalendar(selectedGoal?.id ?? '', monthStart));
  const completedGoalsCount = useMemo(
    () => homeSummary.goalSummaries.filter((summary) => !summary.active && summary.passed).length,
    [homeSummary.goalSummaries],
  );
  const failedGoalsCount = useMemo(
    () => homeSummary.goalSummaries.filter((summary) => !summary.active && !summary.passed).length,
    [homeSummary.goalSummaries],
  );
  const overviewCards = useMemo<OverviewCard[]>(
    () => [
      {
        icon: 'check-square',
        label: 'Total check-ins',
        tone: palette.primaryDeep,
        value: statsSummary.totalCheckins,
      },
      {
        icon: 'target',
        label: 'Total objetivos',
        tone: '#7C4DFF',
        value: goals.length,
      },
      {
        icon: 'play-circle',
        label: 'Objetivos activos',
        tone: palette.accent,
        value: statsSummary.goalsActiveCount,
      },
      {
        icon: 'award',
        label: 'Objetivos cumplidos',
        tone: palette.success,
        value: completedGoalsCount,
      },
      {
        icon: 'x-octagon',
        label: 'Objetivos fallados',
        tone: palette.danger,
        value: failedGoalsCount,
      },
      {
        icon: 'shield',
        label: 'Castigos cumplidos',
        tone: '#F59E0B',
        value: statsSummary.completedPunishments,
      },
    ],
    [completedGoalsCount, failedGoalsCount, goals.length, statsSummary],
  );

  useEffect(() => {
    if (!selectedGoal) {
      return;
    }

    void loadStatsCalendar(selectedGoal.id, monthStart);
  }, [loadStatsCalendar, monthStart, selectedGoal]);

  const handleCalendarSwipe = (direction: 'left' | 'right') => {
    setMonthOffset((current) => (direction === 'left' ? current + 1 : current - 1));
  };

  return (
    <ScreenContainer
      bodyStyle={styles.screenBody}
      scroll={false}
      title="Stats">
      <View style={styles.contentSurface}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: tabBarHeight + insets.bottom + spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <View style={styles.overviewHero}>
              <View style={styles.heroGlowPrimary} />
              <View style={styles.heroGlowSecondary} />
              <View style={styles.heroHeader}>
                <View style={styles.heroBadge}>
                  <Feather color={palette.primaryDeep} name="bar-chart-2" size={14} />
                  <Text style={styles.heroBadgeText}>Resumen general</Text>
                </View>
              </View>

              <View style={styles.overviewGrid}>
                {overviewCards.map((card) => (
                  <View key={card.label} style={styles.overviewCard}>
                    <View style={styles.overviewCardHeader}>
                      <View style={[styles.overviewIconWrap, { backgroundColor: `${card.tone}18` }]}>
                        <Feather color={card.tone} name={card.icon} size={15} />
                      </View>
                      <Text style={styles.overviewLabel}>{card.label}</Text>
                    </View>
                    <Text style={[styles.overviewValue, { color: card.tone }]}>{card.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.goalModule}>
              <View style={styles.goalModuleGlowPrimary} />
              <View style={styles.goalModuleGlowSecondary} />

              <View style={styles.goalModuleHeader}>
                <View style={styles.goalModuleBadge}>
                  <Feather color={palette.primaryDeep} name="calendar" size={14} />
                  <Text style={styles.goalModuleBadgeText}>Objetivo y calendario</Text>
                </View>
              </View>

              <View style={[styles.goalSection, styles.goalModuleContent]}>
                {!hasGoals ? (
                  <View style={styles.goalEmptyCard}>
                    <EmptyState
                      title="Sin objetivos registrados"
                      message="Todavia no tienes objetivos registrados. Crea uno para ver su progreso en estadisticas."
                    />
                  </View>
                ) : hasMultipleGoals ? (
                  <View style={styles.dropdownArea}>
                    <Pressable
                      onPress={() => setIsGoalDropdownOpen((current) => !current)}
                      style={[styles.goalButton, isGoalDropdownOpen && styles.goalButtonSelected]}>
                      <View style={styles.goalButtonRow}>
                        <View style={styles.goalCopy}>
                          <View style={styles.goalTitleRow}>
                            <Feather
                              color={isGoalDropdownOpen ? palette.primaryDeep : palette.slate}
                              name={selectedGoal?.active ? 'play' : 'flag'}
                              size={14}
                            />
                            <Text style={[styles.goalButtonTitle, isGoalDropdownOpen && styles.goalButtonTitleSelected]}>
                              {selectedGoal?.title}
                            </Text>
                          </View>
                        </View>
                        <Feather
                          color={isGoalDropdownOpen ? palette.primaryDeep : palette.slate}
                          name={isGoalDropdownOpen ? 'chevron-up' : 'chevron-down'}
                          size={18}
                        />
                      </View>
                    </Pressable>

                    {isGoalDropdownOpen ? (
                      <View style={styles.dropdownMenu}>
                        {goals.map((goal) => {
                          const isSelected = goal.id === selectedGoal?.id;

                          return (
                            <Pressable
                              key={goal.id}
                              onPress={() => {
                                setSelectedGoalId(goal.id);
                                setIsGoalDropdownOpen(false);
                              }}
                              style={[styles.dropdownOption, isSelected && styles.dropdownOptionSelected]}>
                              <View style={styles.goalTitleRow}>
                                <Feather
                                  color={isSelected ? palette.primaryDeep : palette.slate}
                                  name={goal.active ? 'play' : 'flag'}
                                  size={14}
                                />
                                <Text style={[styles.dropdownOptionTitle, isSelected && styles.dropdownOptionTitleSelected]}>
                                  {goal.title}
                                </Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <View style={[styles.goalButton, styles.goalButtonSelected]}>
                    <View style={styles.goalButtonRow}>
                      <View style={styles.goalCopy}>
                        <View style={styles.goalTitleRow}>
                          <Feather color={palette.primaryDeep} name={selectedGoal?.active ? 'play' : 'flag'} size={14} />
                          <Text style={[styles.goalButtonTitle, styles.goalButtonTitleSelected]}>{selectedGoal?.title}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {selectedGoal ? (
                  <View style={styles.calendarSection}>
                    <View style={styles.calendarHeader}>
                      <View style={styles.monthSwitcher}>
                        <Pressable onPress={() => setMonthOffset((current) => current - 1)} style={styles.monthButton}>
                          <Feather color={palette.primaryDeep} name="chevron-left" size={18} />
                        </Pressable>
                        <Text style={styles.monthLabel}>{monthLabel}</Text>
                        <Pressable onPress={() => setMonthOffset((current) => current + 1)} style={styles.monthButton}>
                          <Feather color={palette.primaryDeep} name="chevron-right" size={18} />
                        </Pressable>
                      </View>
                    </View>

                    <FlingGestureHandler direction={Directions.LEFT} onActivated={() => handleCalendarSwipe('left')}>
                      <FlingGestureHandler direction={Directions.RIGHT} onActivated={() => handleCalendarSwipe('right')}>
                        <View style={styles.calendarCard}>
                          <View style={styles.weekRow}>
                            {WEEKDAY_LABELS.map((label) => (
                              <Text key={label} style={styles.weekday}>
                                {label}
                              </Text>
                            ))}
                          </View>

                          <View style={styles.calendarGrid}>
                            {calendarDays.map((day) => (
                              <View key={day.date} style={styles.dayCell}>
                                <View
                                  style={[
                                    styles.dayBubble,
                                    day.status === 'completed'
                                      ? styles.dayCompleted
                                      : day.status === 'missed'
                                        ? styles.dayMissed
                                        : styles.dayEmpty,
                                    !day.inMonth && styles.dayOutsideMonth,
                                  ]}>
                                  <Text style={[styles.dayLabel, !day.inMonth && styles.dayLabelOutsideMonth]}>
                                    {day.dayNumber}
                                  </Text>
                                </View>
                              </View>
                            ))}
                          </View>
                        </View>
                      </FlingGestureHandler>
                    </FlingGestureHandler>

                    <View style={styles.legend}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, styles.dayCompleted]} />
                        <Text style={styles.legendText}>Cumplido</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, styles.dayMissed]} />
                        <Text style={styles.legendText}>Fallado</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, styles.dayEmpty]} />
                        <Text style={styles.legendText}>Sin check-in</Text>
                      </View>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenBody: {
    paddingBottom: 0,
  },
  contentSurface: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  overviewHero: {
    overflow: 'hidden',
    position: 'relative',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 28,
    backgroundColor: '#F4F7FF',
    borderWidth: 1,
    borderColor: '#D8E4FF',
    gap: spacing.md,
    ...shadows.card,
  },
  heroGlowPrimary: {
    position: 'absolute',
    top: -28,
    right: -12,
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: '#DCE8FF',
  },
  heroGlowSecondary: {
    position: 'absolute',
    bottom: -38,
    left: -10,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: '#EAF7EF',
  },
  heroHeader: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFFCC',
    borderWidth: 1,
    borderColor: '#D8E4FF',
  },
  heroBadgeText: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.primaryDeep,
  },
  heroDescription: {
    maxWidth: 280,
    fontSize: 14,
    lineHeight: 20,
    color: '#60708A',
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  overviewCard: {
    width: '48%',
    minHeight: 94,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: 8,
    borderRadius: 22,
    backgroundColor: '#FFFFFFE8',
    borderWidth: 1,
    borderColor: '#E1E8F5',
    gap: 6,
  },
  overviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 32,
  },
  overviewIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewLabel: {
    flex: 1,
    fontSize: 11,
    lineHeight: 14,
    color: palette.slate,
    fontWeight: '400',
  },
  overviewValue: {
    fontSize: 22,
    fontWeight: '900',
    color: palette.ink,
    textAlign: 'center',
  },
  goalSection: {
    zIndex: 20,
  },
  goalModule: {
    overflow: 'hidden',
    position: 'relative',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 28,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#DCE7F6',
    gap: spacing.md,
    ...shadows.card,
  },
  goalModuleGlowPrimary: {
    position: 'absolute',
    top: -22,
    right: -16,
    width: 132,
    height: 132,
    borderRadius: 999,
    backgroundColor: '#E5F0FF',
  },
  goalModuleGlowSecondary: {
    position: 'absolute',
    bottom: -40,
    left: -12,
    width: 116,
    height: 116,
    borderRadius: 999,
    backgroundColor: '#EEF7E8',
  },
  goalModuleHeader: {
    alignItems: 'center',
  },
  goalModuleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFFD9',
    borderWidth: 1,
    borderColor: '#D6E1F1',
  },
  goalModuleBadgeText: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.primaryDeep,
  },
  goalModuleContent: {
    gap: spacing.md,
  },
  goalEmptyCard: {
    padding: spacing.sm,
    borderRadius: 22,
    backgroundColor: '#FFFFFFD9',
    borderWidth: 1,
    borderColor: '#E1E8F5',
  },
  sectionHeader: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: palette.slate,
  },
  dropdownArea: {
    position: 'relative',
  },
  calendarSection: {
    padding: spacing.sm,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E8F5',
    gap: spacing.sm,
  },
  goalButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
    ...shadows.card,
  },
  goalButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  goalCopy: {
    flex: 1,
    gap: 2,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalButtonSelected: {
    borderColor: '#CFE0FF',
    backgroundColor: '#EEF4FF',
  },
  goalButtonTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: palette.ink,
    flexShrink: 1,
  },
  goalButtonTitleSelected: {
    color: palette.primaryDeep,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: spacing.xs,
    padding: spacing.xs,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
    gap: spacing.xs,
    zIndex: 30,
    ...shadows.card,
  },
  dropdownOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#F7F9FD',
    gap: 2,
  },
  dropdownOptionSelected: {
    backgroundColor: '#EEF4FF',
  },
  dropdownOptionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: palette.ink,
    flexShrink: 1,
  },
  dropdownOptionTitleSelected: {
    color: palette.primaryDeep,
  },
  calendarHeader: {
    gap: spacing.sm,
  },
  monthSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
    textTransform: 'capitalize',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
  },
  legendText: {
    fontSize: 11,
    color: palette.slate,
  },
  calendarCard: {
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D8E4F4',
    backgroundColor: '#FFFFFFE8',
    gap: spacing.sm,
    ...shadows.card,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: palette.slate,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.sm,
  },
  dayCell: {
    width: '14.2857%',
    alignItems: 'center',
  },
  dayBubble: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCompleted: {
    backgroundColor: '#EAFBF1',
    borderColor: '#86EFAC',
  },
  dayMissed: {
    backgroundColor: '#FFF1F1',
    borderColor: '#FCA5A5',
  },
  dayEmpty: {
    backgroundColor: palette.snow,
  },
  dayOutsideMonth: {
    opacity: 0.35,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.ink,
  },
  dayLabelOutsideMonth: {
    color: palette.slate,
  },
});
