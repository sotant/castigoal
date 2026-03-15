import { StyleSheet, Text, View } from 'react-native';

import { palette, radius, shadows, spacing } from '@/src/constants/theme';

type Props = {
  label: string;
  value: string;
  tone?: string;
};

export function StatisticCard({ label, value, tone = palette.primary }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.accent, { backgroundColor: tone }]} />
      <Text style={[styles.value, { color: tone }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    padding: spacing.md,
    borderRadius: 18,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: palette.line,
    ...shadows.card,
    gap: spacing.sm,
  },
  label: {
    fontSize: 13,
    color: palette.slate,
  },
  accent: {
    width: 28,
    height: 4,
    borderRadius: radius.pill,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
  },
});
