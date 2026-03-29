import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { getPunishmentDisplay } from '@/src/constants/punishments';
import { palette, radius, spacing } from '@/src/constants/theme';
import { commonCopy } from '@/src/i18n/common';
import { punishmentsCopy } from '@/src/i18n/punishments';
import { Punishment } from '@/src/models/types';

type Props = {
  visible: boolean;
  punishment?: Punishment;
  onClose: () => void;
};

export function PunishmentModal({ visible, punishment, onClose }: Props) {
  const displayedPunishment = punishment ? getPunishmentDisplay(punishment) : undefined;

  return (
    <Modal animationType="slide" transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.eyebrow}>{punishmentsCopy.modal.eyebrow}</Text>
          <Text style={styles.title}>{displayedPunishment?.title ?? punishmentsCopy.modal.emptyTitle}</Text>
          <Text style={styles.description}>
            {displayedPunishment?.description ?? punishmentsCopy.modal.emptyDescription}
          </Text>
          <Pressable onPress={onClose} style={styles.button}>
            <Text style={styles.buttonLabel}>{commonCopy.actions.understood}</Text>
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
