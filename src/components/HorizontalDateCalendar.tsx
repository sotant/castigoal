import { useEffect, useMemo, useRef } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeViewGestureHandler } from 'react-native-gesture-handler';

import { palette, radius, spacing } from '@/src/constants/theme';
import { addDays, formatWeekdayShort, startOfToday } from '@/src/utils/date';

type CalendarMarkerStatus = 'completed' | 'missed' | 'pending';

type CalendarDay = {
  date: string;
  isToday: boolean;
  isSelected: boolean;
  isFuture: boolean;
  markerStatus?: CalendarMarkerStatus;
};

type Props = {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  markerByDate?: Partial<Record<string, CalendarMarkerStatus>>;
  daysBefore?: number;
  daysAfter?: number;
  startDate?: string;
  endDate?: string;
};

function buildDays(selectedDate: string, daysBefore: number, daysAfter: number, startDate?: string, endDate?: string): CalendarDay[] {
  const today = startOfToday();
  const start = startDate ?? addDays(selectedDate, -daysBefore);
  const totalDays = startDate && endDate ? Math.max(0, Math.round((new Date(`${endDate}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / (24 * 60 * 60 * 1000))) : daysBefore + daysAfter;

  return Array.from({ length: totalDays + 1 }, (_, index) => {
    const date = addDays(start, index);

    return {
      date,
      isFuture: date > today,
      isSelected: date === selectedDate,
      isToday: date === today,
    };
  });
}

function getMarkerStyle(status?: CalendarMarkerStatus) {
  if (status === 'completed') {
    return styles.markerCompleted;
  }

  if (status === 'missed') {
    return styles.markerMissed;
  }

  if (status === 'pending') {
    return styles.markerPending;
  }

  return null;
}

export function HorizontalDateCalendar({ selectedDate, onSelectDate, markerByDate, daysBefore = 7, daysAfter = 7, startDate, endDate }: Props) {
  const scrollRef = useRef<ScrollView | null>(null);
  const viewportWidthRef = useRef(0);
  const days = useMemo(
    () =>
      buildDays(selectedDate, daysBefore, daysAfter, startDate, endDate).map((day) => ({
        ...day,
        markerStatus: markerByDate?.[day.date],
      })),
    [daysAfter, daysBefore, endDate, markerByDate, selectedDate, startDate],
  );

  useEffect(() => {
    const selectedIndex = days.findIndex((day) => day.date === selectedDate);

    if (selectedIndex < 0 || viewportWidthRef.current <= 0 || !scrollRef.current) {
      return;
    }

    const cardWidth = 54;
    const gap = 2;
    const horizontalPadding = spacing.xs;
    const itemWidth = cardWidth + gap;
    const selectedCenter = horizontalPadding + selectedIndex * itemWidth + cardWidth / 2;
    const targetX = Math.max(0, selectedCenter - viewportWidthRef.current / 2);

    scrollRef.current.scrollTo({ animated: true, x: targetX });
  }, [days, selectedDate]);

  const handleLayout = (event: LayoutChangeEvent) => {
    viewportWidthRef.current = event.nativeEvent.layout.width;
  };

  return (
    <View style={styles.wrapper}>
      <NativeViewGestureHandler disallowInterruption>
        <ScrollView
          ref={scrollRef}
          horizontal
          onLayout={handleLayout}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daysContent}>
        {days.map((day) => {
            const markerStyle = day.isFuture ? null : getMarkerStyle(day.markerStatus);
            const dayNumber = Number.parseInt(day.date.slice(-2), 10);

            return (
              <Pressable
                key={day.date}
                onPress={() => onSelectDate(day.date)}
                style={[
                  styles.dayCard,
                  day.isToday && styles.dayCardToday,
                  day.isSelected && styles.dayCardSelected,
                ]}>
                <Text
                  style={[
                    styles.dayWeekday,
                    day.isSelected && styles.dayWeekdaySelected,
                    day.isToday && !day.isSelected && styles.dayWeekdayToday,
                  ]}>
                  {formatWeekdayShort(day.date)}
                </Text>

                <Text
                  style={[
                    styles.dayNumber,
                    day.isSelected && styles.dayNumberSelected,
                    day.isToday && !day.isSelected && styles.dayNumberToday,
                  ]}>
                  {dayNumber}
                </Text>

                <View style={styles.markerRow}>
                  <View style={[styles.markerBase, markerStyle, !markerStyle && styles.markerEmpty]} />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </NativeViewGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: -2,
  },
  daysContent: {
    gap: 2,
    paddingRight: 2,
  },
  dayCard: {
    width: 54,
    minHeight: 68,
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: radius.md,
    backgroundColor: palette.cloud,
    borderWidth: 1,
    borderColor: '#D9E3F0',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayCardToday: {
    backgroundColor: '#EEF4FF',
    borderColor: '#B8CDF4',
  },
  dayCardSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  dayWeekday: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.slate,
    textTransform: 'capitalize',
  },
  dayWeekdayToday: {
    color: palette.primaryDeep,
  },
  dayWeekdaySelected: {
    color: palette.snow,
  },
  dayNumber: {
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '800',
    color: palette.ink,
  },
  dayNumberToday: {
    color: palette.primaryDeep,
  },
  dayNumberSelected: {
    color: palette.snow,
  },
  markerRow: {
    minHeight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  markerBase: {
    width: 14,
    height: 3,
    borderRadius: radius.pill,
  },
  markerCompleted: {
    backgroundColor: palette.warning,
  },
  markerMissed: {
    backgroundColor: palette.warning,
  },
  markerPending: {
    backgroundColor: palette.warning,
  },
  markerEmpty: {
    backgroundColor: 'transparent',
  },
});
