import { useEffect, useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Directions, FlingGestureHandler } from 'react-native-gesture-handler';

import { StatusBadge } from '@/src/components/StatusBadge';
import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import { formatMonthLabel, getMonthDate, getMonthStart, WEEKDAY_LABELS } from '@/src/features/stats/calendar';
import { Goal, HomeGoalSummary } from '@/src/models/types';
import { selectStatsCalendar, useAppStore } from '@/src/store/app-store';
import { formatWeekdayShort } from '@/src/utils/date';

type Props = {
  goal: Goal;
  summary: HomeGoalSummary;
  onOpenDetail: () => void;
  onOpenActions: () => void;
};

function getRecentDayStyles(status: HomeGoalSummary['recentDays'][number]['status']) {
  switch (status) {
    case 'completed':
      return {
        container: styles.recentDayCompleted,
        label: styles.recentDayLabelCompleted,
      };
    case 'missed':
      return {
        container: styles.recentDayMissed,
        label: styles.recentDayLabelMissed,
      };
    case 'pending':
      return {
        container: styles.recentDayPending,
        label: styles.recentDayLabelPending,
      };
    default:
      return {
        container: styles.recentDayUnavailable,
        label: styles.recentDayLabelUnavailable,
      };
  }
}

export function ObjectiveListItem({ goal, summary, onOpenDetail, onOpenActions }: Props) {
  const loadStatsCalendar = useAppStore((state) => state.loadStatsCalendar);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const monthDate = useMemo(() => getMonthDate(monthOffset), [monthOffset]);
  const monthStart = useMemo(() => getMonthStart(monthDate), [monthDate]);
  const calendarDays = useAppStore(selectStatsCalendar(goal.id, monthStart));

  useEffect(() => {
    if (!isCalendarOpen) {
      return;
    }

    void loadStatsCalendar(goal.id, monthStart);
  }, [goal.id, isCalendarOpen, loadStatsCalendar, monthStart]);

  const handleCalendarSwipe = (direction: 'left' | 'right') => {
    setMonthOffset((current) => (direction === 'left' ? current + 1 : current - 1));
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text numberOfLines={1} style={styles.title}>
            {goal.title}
          </Text>
        </View>
        <StatusBadge active={goal.active} />
      </View>

      <View style={styles.recentSection}>
        <Text style={styles.recentLabel}>Ultimos 5 dias</Text>
        <View style={styles.recentCompact}>
          {summary.recentDays.map((day, index) => {
            const stateStyles = getRecentDayStyles(day.status);
            const weekdayLabel = day.date ? formatWeekdayShort(day.date) : '';

            return (
              <View key={`${goal.id}-${day.date ?? `empty-${index}`}`} style={styles.recentCell}>
                <View style={[styles.recentDay, stateStyles.container]}>
                  <Text style={styles.recentWeekdayLabel}>{weekdayLabel}</Text>
                  <Text style={[styles.recentDayLabel, stateStyles.label]}>{day.status === 'unavailable' ? 'X' : day.dayNumber}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.streakRow}>
          <View style={styles.streakBadge}>
            <View style={styles.diamond}>
              <View style={styles.diamondInner}>
                <MaterialCommunityIcons color="#F97316" name="fire" size={16} />
              </View>
            </View>
            <Text style={styles.streakValue}>{summary.currentStreak}</Text>
          </View>
          <View style={styles.streakBadge}>
            <View style={styles.diamond}>
              <View style={styles.diamondInner}>
                <Feather color="#B45309" name="award" size={15} />
              </View>
            </View>
            <Text style={styles.streakValue}>{summary.bestStreak}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityHint="Abre el detalle del objetivo"
            accessibilityLabel={`Ver detalle de ${goal.title}`}
            accessibilityRole="button"
            onPress={onOpenDetail}
            style={({ pressed }) => [styles.iconButton, pressed && styles.actionPressed]}>
            <Feather color={palette.ink} name="eye" size={18} />
          </Pressable>
          <Pressable
            accessibilityHint="Muestra el calendario mensual del objetivo"
            accessibilityLabel={`Abrir estadisticas de ${goal.title}`}
            accessibilityRole="button"
            onPress={(event) => {
              event.stopPropagation();
              setIsCalendarOpen((current) => !current);
            }}
            style={({ pressed }) => [styles.iconButton, pressed && styles.actionPressed]}>
            <Feather color={palette.ink} name="bar-chart-2" size={18} />
          </Pressable>

          <Pressable
            accessibilityHint="Muestra mas acciones para este objetivo"
            accessibilityLabel={`Abrir menu de ${goal.title}`}
            accessibilityRole="button"
            onPress={(event) => {
              event.stopPropagation();
              onOpenActions();
            }}
            style={({ pressed }) => [styles.iconButton, pressed && styles.actionPressed]}>
            <Feather color={palette.ink} name="more-horizontal" size={18} />
          </Pressable>
        </View>
      </View>

      {isCalendarOpen ? (
        <View style={styles.calendarSection}>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarTitle}>{formatMonthLabel(monthDate)}</Text>
            <View style={styles.calendarActions}>
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  setMonthOffset((current) => current - 1);
                }}
                style={({ pressed }) => [styles.calendarNavButton, pressed && styles.actionPressed]}>
                <Feather color={palette.primaryDeep} name="chevron-left" size={18} />
              </Pressable>
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  setMonthOffset((current) => current + 1);
                }}
                style={({ pressed }) => [styles.calendarNavButton, pressed && styles.actionPressed]}>
                <Feather color={palette.primaryDeep} name="chevron-right" size={18} />
              </Pressable>
            </View>
          </View>

          <FlingGestureHandler direction={Directions.LEFT} onActivated={() => handleCalendarSwipe('left')}>
            <FlingGestureHandler direction={Directions.RIGHT} onActivated={() => handleCalendarSwipe('right')}>
              <View>
                <View style={styles.weekRow}>
                  {WEEKDAY_LABELS.map((label) => (
                    <Text key={`${goal.id}-${label}`} style={styles.weekday}>
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
                              : styles.dayNeutral,
                          !day.inMonth && styles.dayOutsideMonth,
                        ]}>
                        <Text style={[styles.dayLabel, !day.inMonth && styles.dayLabelOutsideMonth]}>{day.dayNumber}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </FlingGestureHandler>
          </FlingGestureHandler>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: '#D7DEE9',
    gap: 6,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleBlock: {
    flex: 1,
    paddingRight: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
    lineHeight: 22,
  },
  recentSection: {
    gap: 5,
  },
  recentLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.1,
  },
  recentCompact: {
    flexDirection: 'row',
    borderRadius: 10,
    alignSelf: 'flex-start',
    gap: 4,
  },
  recentCell: {
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    width: 38,
  },
  recentWeekdayLabel: {
    minHeight: 9,
    fontSize: 8,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'capitalize',
  },
  recentDay: {
    width: '100%',
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  recentDayCompleted: {
    backgroundColor: '#ECFDF3',
  },
  recentDayMissed: {
    backgroundColor: '#FFF1F2',
  },
  recentDayPending: {
    backgroundColor: '#FFFBEB',
  },
  recentDayUnavailable: {
    backgroundColor: '#F8FAFC',
  },
  recentDayLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  recentDayLabelCompleted: {
    color: '#15803D',
  },
  recentDayLabelMissed: {
    color: '#DC2626',
  },
  recentDayLabelPending: {
    color: '#CA8A04',
  },
  recentDayLabelUnavailable: {
    color: '#94A3B8',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  diamond: {
    width: 18,
    height: 18,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  diamondInner: {
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakValue: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.slate,
    marginLeft: -1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 36,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D7DEE9',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPressed: {
    opacity: 0.86,
  },
  calendarSection: {
    marginTop: 0,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E6ECF4',
    gap: 8,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  calendarTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: palette.ink,
    textTransform: 'capitalize',
  },
  calendarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  calendarNavButton: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#D7DEE9',
    backgroundColor: palette.snow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    color: palette.slate,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 6,
  },
  dayCell: {
    width: '14.2857%',
    alignItems: 'center',
  },
  dayBubble: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  dayCompleted: {
    backgroundColor: '#ECFDF3',
  },
  dayMissed: {
    backgroundColor: '#FFF1F2',
  },
  dayNeutral: {
    backgroundColor: '#FFFFFF',
  },
  dayOutsideMonth: {
    opacity: 0.35,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.ink,
  },
  dayLabelOutsideMonth: {
    color: palette.slate,
  },
});
