import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { palette, radius, shadows, spacing } from '@/src/constants/theme';

type Props = {
  bottomOffset: number;
  rightOffset?: number;
  onPress: () => void;
  accessibilityHint?: string;
  accessibilityLabel?: string;
};

export function FloatingAddButton({
  bottomOffset,
  rightOffset = spacing.md,
  onPress,
  accessibilityHint = 'Crea un nuevo elemento',
  accessibilityLabel = 'Agregar elemento',
}: Props) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { bottom: bottomOffset, right: rightOffset },
        pressed && styles.buttonPressed,
      ]}>
      <Feather color={palette.snow} name="plus" size={24} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryDeep,
    ...shadows.card,
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
});
