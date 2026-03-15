import { Pressable, StyleSheet, Text } from 'react-native';

import { palette, radius, spacing } from '@/src/constants/theme';
import { CheckinStatus } from '@/src/models/types';

type Props = {
  disabled?: boolean;
  label: string;
  status: CheckinStatus;
  onPress: () => void;
};

export function DailyCheckButton({ disabled = false, label, status, onPress }: Props) {
  const backgroundColor = status === 'completed' ? '#22C55E' : '#EF4444';

  return (
    <Pressable disabled={disabled} style={[styles.button, { backgroundColor }, disabled && styles.buttonDisabled]} onPress={onPress}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 132,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  label: {
    color: palette.snow,
    fontSize: 15,
    fontWeight: '700',
  },
});
