import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radius, shadows, spacing } from '@/src/constants/theme';

type Props = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Feather color={palette.primary} name="inbox" size={20} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.button}>
          <Text style={styles.buttonLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
    gap: spacing.sm,
    alignItems: 'center',
    ...shadows.card,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF0FF',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.ink,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.slate,
    textAlign: 'center',
  },
  button: {
    alignSelf: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: radius.pill,
    backgroundColor: palette.primary,
  },
  buttonLabel: {
    color: palette.snow,
    fontWeight: '800',
  },
});
