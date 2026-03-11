import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing } from '@/src/constants/theme';
import { Punishment } from '@/src/models/types';

type Props = {
  visible: boolean;
  punishment?: Punishment;
  onClose: () => void;
};

export function PunishmentModal({ visible, punishment, onClose }: Props) {
  return (
    <Modal animationType="slide" transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.eyebrow}>Consecuencia generada</Text>
          <Text style={styles.title}>{punishment?.title ?? 'Sin castigo disponible'}</Text>
          <Text style={styles.description}>
            {punishment?.description ?? 'Configura un castigo para reforzar el sistema.'}
          </Text>
          <Pressable onPress={onClose} style={styles.button}>
            <Text style={styles.buttonLabel}>Entendido</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(11, 23, 38, 0.45)',
  },
  sheet: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: palette.snow,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.accent,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.ink,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.slate,
  },
  button: {
    marginTop: spacing.sm,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: palette.primary,
  },
  buttonLabel: {
    color: palette.snow,
    fontWeight: '700',
  },
});
