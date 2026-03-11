import { Pressable, StyleSheet, Text } from 'react-native';

import { palette, radius, spacing } from '@/src/constants/theme';
import { CheckinStatus } from '@/src/models/types';

type Props = {
  label: string;
  status: CheckinStatus;
  onPress: () => void;
};

export function DailyCheckButton({ label, status, onPress }: Props) {
  const backgroundColor = status === 'completed' ? palette.success : palette.danger;

  return (
    <Pressable style={[styles.button, { backgroundColor }]} onPress={onPress}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 132,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  label: {
    color: palette.snow,
    fontSize: 15,
    fontWeight: '700',
  },
});
