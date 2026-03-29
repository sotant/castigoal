import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import { commonCopy } from '@/src/i18n/common';
import { goalsCopy } from '@/src/i18n/goals';
import { GoalResolutionAnnouncement } from '@/src/models/types';
type Props = {
  announcement: GoalResolutionAnnouncement | null;
  visible: boolean;
  index: number;
  total: number;
  onClose: () => void;
};

function getCopy(announcement: GoalResolutionAnnouncement) {
  if (announcement.passed) {
    return {
      accent: palette.success,
      accentCard: '#ECFDF3',
      accentBorder: '#C6F6D5',
      summary: goalsCopy.detail.announcement.summaryPassed,
      description: goalsCopy.detail.announcement.successDescription,
    };
  }

  return {
    accent: palette.danger,
    accentCard: '#FFF4F4',
    accentBorder: '#FFD5D5',
    summary: goalsCopy.detail.announcement.summaryFailed,
    description: announcement.assignedPunishmentTitle
      ? goalsCopy.detail.announcement.failedDescriptionWithPunishment
      : goalsCopy.detail.announcement.failedDescriptionWithoutPunishment,
  };
}

export function GoalResolutionAnnouncementModal({
  announcement,
  visible,
  index,
  total,
  onClose,
}: Props) {
  if (!announcement) {
    return null;
  }

  const copy = getCopy(announcement);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel={goalsCopy.detail.announcement.closeAccessibility} onPress={onClose} style={styles.backdrop} />

        <View style={styles.card}>
          <View style={styles.header}>
            <View style={[styles.statusPill, { backgroundColor: copy.accentCard, borderColor: copy.accentBorder }]}>
              <Text style={[styles.statusPillLabel, { color: copy.accent }]}>{copy.summary}</Text>
            </View>
            {total > 1 ? (
              <View style={styles.queuePill}>
                <Text style={styles.queuePillLabel}>
                  {index}/{total}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.title}>{announcement.goalTitle}</Text>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{goalsCopy.detail.announcement.metricResult}</Text>
              <Text style={[styles.metricValue, { color: copy.accent }]}>
                {announcement.completedDays}/{announcement.requiredDays}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{goalsCopy.detail.announcement.metricRate}</Text>
              <Text style={styles.metricValue}>{announcement.completionRate}%</Text>
            </View>
          </View>

          {!announcement.passed ? <Text style={styles.description}>{copy.description}</Text> : null}

          {!announcement.passed ? (
            announcement.assignedPunishmentTitle ? (
              <View style={[styles.consequenceCard, { backgroundColor: copy.accentCard, borderColor: copy.accentBorder }]}>
                <Text style={[styles.consequenceEyebrow, { color: copy.accent }]}>{goalsCopy.detail.announcement.consequence}</Text>
                <Text style={styles.consequenceTitle}>{announcement.assignedPunishmentTitle}</Text>
                {announcement.assignedPunishmentDescription ? (
                  <Text style={styles.consequenceDescription}>{announcement.assignedPunishmentDescription}</Text>
                ) : null}
              </View>
            ) : (
              <View style={[styles.consequenceCard, styles.consequenceCardMuted, { backgroundColor: copy.accentCard, borderColor: copy.accentBorder }]}>
                <Text style={[styles.consequenceEyebrow, { color: copy.accent }]}>{goalsCopy.detail.announcement.consequence}</Text>
                <Text style={styles.consequenceDescription}>
                  {goalsCopy.detail.announcement.noEligiblePunishment}
                </Text>
              </View>
            )
          ) : null}

          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.primaryButton}>
              <Text style={styles.primaryButtonLabel}>{commonCopy.actions.close}</Text>
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
    backgroundColor: 'rgba(11, 23, 38, 0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    padding: spacing.lg,
    borderRadius: 28,
    backgroundColor: palette.snow,
    gap: spacing.sm,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusPillLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  queuePill: {
    position: 'absolute',
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: '#EEF4FB',
  },
  queuePillLabel: {
    color: palette.primaryDeep,
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
    color: palette.ink,
  },
  description: {
    color: palette.slate,
    lineHeight: 22,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
    padding: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#F8FAFD',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.slate,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
    textAlign: 'center',
  },
  consequenceCard: {
    padding: spacing.md,
    borderRadius: 22,
    borderWidth: 1,
    gap: 6,
  },
  consequenceCardMuted: {
  },
  consequenceEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  consequenceTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
  },
  consequenceDescription: {
    color: palette.slate,
    lineHeight: 21,
  },
  actions: {
    marginTop: spacing.xs,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#F8FAFD',
  },
  primaryButtonLabel: {
    color: palette.ink,
    fontWeight: '800',
  },
});
