import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/src/components/EmptyState';
import { GoalListItem } from '@/src/components/GoalListItem';
import { PunishmentModal } from '@/src/components/PunishmentModal';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, radius, spacing } from '@/src/constants/theme';
import { useAppStore } from '@/src/store/app-store';

export function HomeScreen() {
  const [showModal, setShowModal] = useState(false);
  const homeSummary = useAppStore((state) => state.homeSummary);

  return (
    <ScreenContainer title="Tus objetivos" subtitle="Marca el dia en segundos y mantente por encima de tu minimo.">
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Resumen diario</Text>
        <Text style={styles.heroText}>
          {homeSummary.activeGoalsCount} objetivos activos. {homeSummary.pendingPunishmentsCount} castigos pendientes.
        </Text>
        {homeSummary.latestPending ? (
          <Pressable onPress={() => setShowModal(true)} style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Ver ultimo castigo</Text>
          </Pressable>
        ) : null}
      </View>

      {homeSummary.goalSummaries.length === 0 ? (
        <EmptyState
          title="No hay objetivos todavia"
          message="Cuando tengas objetivos creados, aqui veras primero tu resumen diario y despues su estado actual."
        />
      ) : (
        homeSummary.goalSummaries.map((goalSummary) => <GoalListItem key={goalSummary.goalId} summary={goalSummary} />)
      )}

      <PunishmentModal visible={showModal} punishment={homeSummary.latestPending?.punishment} onClose={() => setShowModal(false)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: '#DDF8F3',
    gap: spacing.sm,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: palette.ink,
  },
  heroText: {
    color: palette.slate,
    fontSize: 15,
    lineHeight: 22,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: palette.night,
  },
  heroBadgeText: {
    color: palette.snow,
    fontWeight: '700',
  },
});
