import { useEffect, useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/src/components/EmptyState';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { StatisticCard } from '@/src/components/StatisticCard';
import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import { formatMonthLabel, getMonthDate, getMonthStart, WEEKDAY_LABELS } from '@/src/features/stats/calendar';
import { selectStatsCalendar, useAppStore } from '@/src/store/app-store';

export function StatsScreen() {
  const goals = useAppStore((state) => state.goals);
  const statsSummary = useAppStore((state) => state.statsSummary);
  const statsLoaded = useAppStore((state) => state.statsLoaded);
  const loadStatsCalendar = useAppStore((state) => state.loadStatsCalendar);
  const refreshStatsSummary = useAppStore((state) => state.refreshStatsSummary);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(goals[0]?.id ?? null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [isGoalDropdownOpen, setIsGoalDropdownOpen] = useState(false);

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

  useEffect(() => {
    if (!selectedGoal) {
      return;
    }

    void loadStatsCalendar(selectedGoal.id, monthStart);
  }, [loadStatsCalendar, monthStart, selectedGoal]);

  return (
    <ScreenContainer title="Estadisticas">
      <View style={[styles.section, styles.goalSection]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Elegir objetivo</Text>
        </View>

        {!hasGoals ? (
          <EmptyState
            title="Sin objetivos registrados"
            message="Todavia no tienes objetivos registrados. Crea uno para ver su progreso en estadisticas."
          />
        ) : hasMultipleGoals ? (
          <View style={styles.dropdownArea}>
            <Pressable
              onPress={() => setIsGoalDropdownOpen((current) => !current)}
              style={[styles.goalButton, isGoalDropdownOpen && styles.goalButtonSelected]}>
              <View style={styles.goalButtonRow}>
                <View style={styles.goalCopy}>
                  <Text style={[styles.goalButtonTitle, isGoalDropdownOpen && styles.goalButtonTitleSelected]}>
                    {selectedGoal?.title}
                  </Text>
                  <Text style={[styles.goalButtonMeta, isGoalDropdownOpen && styles.goalButtonMetaSelected]}>
                    {selectedGoal?.active ? 'Activo' : 'Pausado'}
                  </Text>
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
                      <Text style={[styles.dropdownOptionTitle, isSelected && styles.dropdownOptionTitleSelected]}>
                        {goal.title}
                      </Text>
                      <Text style={[styles.dropdownOptionMeta, isSelected && styles.dropdownOptionMetaSelected]}>
                        {goal.active ? 'Activo' : 'Pausado'}
                      </Text>
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
                <Text style={[styles.goalButtonTitle, styles.goalButtonTitleSelected]}>{selectedGoal?.title}</Text>
                <Text style={[styles.goalButtonMeta, styles.goalButtonMetaSelected]}>
                  {selectedGoal?.active ? 'Activo' : 'Pausado'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {selectedGoal ? (
        <View style={styles.section}>
          <View style={styles.calendarHeader}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Calendario</Text>
              <Text style={styles.sectionSubtitle}>{selectedGoal.title}</Text>
            </View>

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
                      day.status === 'completed' ? styles.dayCompleted : day.status === 'missed' ? styles.dayMissed : styles.dayEmpty,
                      !day.inMonth && styles.dayOutsideMonth,
                    ]}>
                    <Text style={[styles.dayLabel, !day.inMonth && styles.dayLabelOutsideMonth]}>{day.dayNumber}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.dayCompleted]} />
              <Text style={styles.legendText}>Cumplido</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.dayMissed]} />
              <Text style={styles.legendText}>Incumplido</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.dayEmpty]} />
              <Text style={styles.legendText}>Sin check-in</Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.grid}>
          <StatisticCard label="Cumplimiento medio" value={`${statsSummary.averageRate}%`} tone={palette.primary} />
          <StatisticCard label="Check-ins logrados" value={`${statsSummary.completionRatio}%`} tone={palette.success} />
        </View>
        <View style={styles.grid}>
          <StatisticCard label="Objetivos activos" value={`${statsSummary.goalsActiveCount}`} tone={palette.accent} />
          <StatisticCard label="Castigos completados" value={`${statsSummary.completedPunishments}`} tone={palette.danger} />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  goalSection: {
    zIndex: 20,
  },
  sectionHeader: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 20,
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
  goalButton: {
    padding: spacing.md,
    borderRadius: radius.md,
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
    gap: spacing.xs,
  },
  goalButtonSelected: {
    borderColor: palette.primary,
    backgroundColor: '#E6F6F4',
  },
  goalButtonTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.ink,
  },
  goalButtonTitleSelected: {
    color: palette.primaryDeep,
  },
  goalButtonMeta: {
    fontSize: 13,
    color: palette.slate,
  },
  goalButtonMetaSelected: {
    color: palette.primaryDeep,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
    gap: spacing.xs,
    zIndex: 30,
    ...shadows.card,
  },
  dropdownOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: palette.cloud,
    gap: 2,
  },
  dropdownOptionSelected: {
    backgroundColor: '#E6F6F4',
  },
  dropdownOptionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.ink,
  },
  dropdownOptionTitleSelected: {
    color: palette.primaryDeep,
  },
  dropdownOptionMeta: {
    fontSize: 12,
    color: palette.slate,
  },
  dropdownOptionMetaSelected: {
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
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
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
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
  },
  legendText: {
    fontSize: 13,
    color: palette.slate,
  },
  calendarCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
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
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  dayMissed: {
    backgroundColor: '#FEE2E2',
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
