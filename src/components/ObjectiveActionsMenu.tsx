import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, radius, shadows, spacing } from '@/src/constants/theme';

type Props = {
  visible: boolean;
  goalTitle: string;
  showFinalize?: boolean;
  onClose: () => void;
  onFinalize: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function ObjectiveActionsMenu({
  visible,
  goalTitle,
  showFinalize = false,
  onClose,
  onFinalize,
  onEdit,
  onDelete,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}>
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Cerrar menu de acciones"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={[styles.sheet, { paddingBottom: spacing.lg + insets.bottom }]}>
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>Acciones</Text>
          <Text numberOfLines={2} style={styles.title}>
            {goalTitle}
          </Text>

          {showFinalize ? (
            <Pressable
              accessibilityHint="Finaliza este objetivo y lo saca de la lista de activos"
              accessibilityRole="button"
              onPress={onFinalize}
              style={styles.actionButton}>
              <View style={[styles.actionIcon, styles.successIcon]}>
                <Feather color="#16A34A" name="check-circle" size={18} />
              </View>
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>Finalizar</Text>
                <Text style={styles.actionSubtitle}>Finaliza antes de que termine su plazo.</Text>
              </View>
            </Pressable>
          ) : null}

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
    gap: 4,
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
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: '#F7F9FD',
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F0FF',
  },
  dangerIcon: {
    backgroundColor: '#FFF0F0',
  },
  successIcon: {
    backgroundColor: '#ECFDF3',
  },
  actionCopy: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.ink,
  },
  dangerTitle: {
    color: '#B42318',
  },
  actionSubtitle: {
    fontSize: 12,
    lineHeight: 16,
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
