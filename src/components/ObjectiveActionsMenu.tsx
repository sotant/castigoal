import { Feather } from '@expo/vector-icons';
import { Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import { commonCopy } from '@/src/i18n/common';
import { goalsCopy } from '@/src/i18n/goals';

type Props = {
  visible: boolean;
  goalTitle: string;
  showFinalize?: boolean;
  showEdit?: boolean;
  onClose: () => void;
  onFinalize: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function ObjectiveActionsMenu({
  visible,
  goalTitle,
  showFinalize = false,
  showEdit = true,
  onClose,
  onFinalize,
  onEdit,
  onDelete,
}: Props) {
  const insets = useSafeAreaInsets();
  const swipeToCloseResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      const isVerticalSwipe = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.25;

      return isVerticalSwipe && gestureState.dy > 16;
    },
    onPanResponderRelease: (_, gestureState) => {
      const isDismissSwipe =
        gestureState.dy > 48 &&
        gestureState.vy > 0 &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx);

      if (isDismissSwipe) {
        onClose();
      }
    },
  });

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}>
      <View
        {...swipeToCloseResponder.panHandlers}
        style={styles.root}>
        <Pressable
          accessibilityLabel={commonCopy.actions.close}
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={[styles.sheet, { paddingBottom: spacing.lg + insets.bottom }]}>
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>{goalsCopy.detail.actionMenu.eyebrow}</Text>
          <Text numberOfLines={2} style={styles.title}>
            {goalTitle}
          </Text>

          {showFinalize ? (
            <Pressable
              accessibilityHint={goalsCopy.detail.actionMenu.finalizeDescription}
              accessibilityRole="button"
              onPress={onFinalize}
              style={styles.actionButton}>
              <View style={[styles.actionIcon, styles.successIcon]}>
                <Feather color="#16A34A" name="check-circle" size={18} />
              </View>
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>{commonCopy.actions.finish}</Text>
                <Text style={styles.actionSubtitle}>{goalsCopy.detail.actionMenu.finalizeDescription}</Text>
              </View>
            </Pressable>
          ) : null}

          {showEdit ? (
            <Pressable
              accessibilityHint={goalsCopy.detail.actionMenu.editDescription}
              accessibilityRole="button"
              onPress={onEdit}
              style={styles.actionButton}>
              <View style={styles.actionIcon}>
                <Feather color={palette.primaryDeep} name="edit-2" size={18} />
              </View>
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>{commonCopy.actions.edit}</Text>
                <Text style={styles.actionSubtitle}>{goalsCopy.detail.actionMenu.editDescription}</Text>
              </View>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityHint={goalsCopy.detail.actionMenu.deleteDescription}
            accessibilityRole="button"
            onPress={onDelete}
            style={styles.actionButton}>
            <View style={[styles.actionIcon, styles.dangerIcon]}>
              <Feather color={palette.danger} name="trash-2" size={18} />
            </View>
            <View style={styles.actionCopy}>
              <Text style={[styles.actionTitle, styles.dangerTitle]}>{commonCopy.actions.delete}</Text>
              <Text style={styles.actionSubtitle}>{goalsCopy.detail.actionMenu.deleteDescription}</Text>
            </View>
          </Pressable>

          <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelLabel}>{commonCopy.actions.cancel}</Text>
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
  pauseIcon: {
    backgroundColor: '#FFF7E8',
  },
  resumeIcon: {
    backgroundColor: '#E8F0FF',
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
