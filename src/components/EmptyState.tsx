import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing } from '@/src/constants/theme';

type Props = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.card}>
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
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
    gap: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.ink,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.slate,
  },
  button: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: palette.primary,
  },
  buttonLabel: {
    color: palette.snow,
    fontWeight: '700',
  },
});
