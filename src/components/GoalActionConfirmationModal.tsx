import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing } from '@/src/constants/theme';

type Props = {
  visible: boolean;
  eyebrow: string;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'default' | 'danger';
  onCancel: () => void;
  onConfirm: () => void;
};

export function GoalActionConfirmationModal({
  visible,
  eyebrow,
  title,
  description,
  confirmLabel,
  tone = 'default',
  onCancel,
  onConfirm,
}: Props) {
  const isDanger = tone === 'danger';

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Cerrar confirmacion" onPress={onCancel} style={styles.backdrop} />
        <View style={styles.card}>
          {eyebrow ? <Text style={[styles.eyebrow, isDanger ? styles.eyebrowDanger : null]}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onCancel} style={styles.secondaryButton}>
              <Text style={styles.secondaryLabel}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={[styles.primaryButton, isDanger ? styles.dangerButton : styles.successButton]}>
              <Text style={styles.primaryLabel}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(11, 23, 38, 0.45)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    padding: spacing.lg,
    borderRadius: 22,
    backgroundColor: palette.snow,
    gap: spacing.sm,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: palette.primary,
  },
  eyebrowDanger: {
    color: palette.danger,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.ink,
    textAlign: 'center',
  },
  description: {
    color: palette.slate,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
  },
  secondaryLabel: {
    color: palette.ink,
    fontWeight: '800',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  successButton: {
    backgroundColor: palette.primaryDeep,
  },
  dangerButton: {
    backgroundColor: '#B91C1C',
  },
  primaryLabel: {
    color: palette.snow,
    fontWeight: '800',
  },
});
