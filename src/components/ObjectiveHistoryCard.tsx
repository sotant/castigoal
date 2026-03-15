import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import { HomeGoalSummary } from '@/src/models/types';
import { appRoutes } from '@/src/navigation/app-routes';

type Props = {
  item: {
    summary: HomeGoalSummary;
    daysSinceEnd: number;
    passed: boolean;
  };
};

export function ObjectiveHistoryCard({ item }: Props) {
  const description = item.passed ? 'Objetivo finalizado con exito' : 'Objetivo finalizado sin cumplir el minimo';
  const relativeLabel = item.daysSinceEnd <= 0 ? 'Hoy' : item.daysSinceEnd === 1 ? 'Hace 1 d' : `Hace ${item.daysSinceEnd} d`;
  const iconColor = item.passed ? '#22C55E' : '#EF4444';
  const iconBackgroundColor = item.passed ? '#DCFCE7' : '#FEE2E2';

  return (
    <Pressable onPress={() => router.push(appRoutes.goalDetail(item.summary.goalId))} style={styles.card}>
      <View style={[styles.icon, { backgroundColor: iconBackgroundColor }]}>
        <Feather color={iconColor} name={item.passed ? 'award' : 'flag'} size={18} />
      </View>

      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.title}>
          {item.summary.title}
        </Text>
        <Text numberOfLines={2} style={styles.description}>
          {description}
        </Text>
      </View>

      <View style={styles.meta}>
        <Text style={styles.rate}>{item.summary.completionRate}%</Text>
        <Text style={styles.date}>{relativeLabel}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.card,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.ink,
  },
  description: {
    fontSize: 12,
    color: '#7C8798',
  },
  meta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rate: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  date: {
    fontSize: 12,
    color: '#64748B',
  },
});
