import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radius, shadows, spacing } from '@/src/constants/theme';

type Props = {
  visible: boolean;
  goalTitle: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function ObjectiveActionsMenu({ visible, goalTitle, onClose, onEdit, onDelete }: Props) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}>
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Cerrar menu de acciones"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>Acciones del objetivo</Text>
          <Text numberOfLines={2} style={styles.title}>
            {goalTitle}
          </Text>

          <Pressable
            accessibilityHint="Abre la pantalla para editar este objetivo"
            accessibilityRole="button"
            onPress={onEdit}
            style={styles.actionButton}>
            <View style={styles.actionIcon}>
              <Feather color={palette.primaryDeep} name="edit-2" size={18} />
            </View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Editar</Text>
              <Text style={styles.actionSubtitle}>Modifica nombre, descripcion y reglas.</Text>
            </View>
          </Pressable>

          <Pressable
            accessibilityHint="Solicita confirmacion antes de eliminar el objetivo"
            accessibilityRole="button"
            onPress={onDelete}
            style={styles.actionButton}>
            <View style={[styles.actionIcon, styles.dangerIcon]}>
              <Feather color={palette.danger} name="trash-2" size={18} />
            </View>
            <View style={styles.actionCopy}>
              <Text style={[styles.actionTitle, styles.dangerTitle]}>Borrar</Text>
              <Text style={styles.actionSubtitle}>Se pedira confirmacion antes de eliminarlo.</Text>
            </View>
          </Pressable>

          <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelLabel}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
  },
  sheet: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: palette.snow,
    gap: spacing.sm,
    ...shadows.card,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: radius.pill,
    alignSelf: 'center',
    backgroundColor: '#D7DFEB',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: '#7A889D',
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: palette.ink,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#F7F9FD',
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F0FF',
  },
  dangerIcon: {
    backgroundColor: '#FFF0F0',
  },
  actionCopy: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.ink,
  },
  dangerTitle: {
    color: '#B42318',
  },
  actionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: palette.slate,
  },
  cancelButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: '#EEF2F8',
  },
  cancelLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.ink,
  },
});
