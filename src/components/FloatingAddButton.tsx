import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { palette, radius, shadows, spacing } from '@/src/constants/theme';

type Props = {
  bottomOffset: number;
  onPress: () => void;
};

export function FloatingAddButton({ bottomOffset, onPress }: Props) {
  return (
    <Pressable
      accessibilityHint="Crea un nuevo objetivo"
      accessibilityLabel="Agregar objetivo"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { bottom: bottomOffset },
        pressed && styles.buttonPressed,
      ]}>
      <Feather color={palette.snow} name="plus" size={24} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: spacing.md,
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
