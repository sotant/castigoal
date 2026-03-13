import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/src/components/EmptyState';
import { GoalListItem } from '@/src/components/GoalListItem';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, radius, spacing } from '@/src/constants/theme';
import { appRoutes } from '@/src/navigation/app-routes';
import { useAppStore } from '@/src/store/app-store';

export function HomeScreen() {
  const homeSummary = useAppStore((state) => state.homeSummary);
  const hasPendingPunishments = homeSummary.pendingPunishmentsCount > 0;

  return (
    <ScreenContainer title="Hoy">
      {hasPendingPunishments ? (
        <View style={styles.pendingSection}>
          <View style={styles.pendingHeader}>
            <Text style={styles.pendingSectionTitle}>Tienes castigos pendientes</Text>
          </View>
          <Pressable onPress={() => router.push(appRoutes.punishments)} style={styles.pendingButton}>
            <Text style={styles.pendingButtonLabel}>Ver castigos</Text>
          </Pressable>
        </View>
      ) : null}

      {homeSummary.goalSummaries.length === 0 ? (
        <EmptyState
          title="No hay objetivos todavia"
          message="Cuando tengas objetivos creados, aqui veras primero tu resumen diario y despues su estado actual."
        />
      ) : (
        homeSummary.goalSummaries.map((goalSummary) => <GoalListItem key={goalSummary.goalId} summary={goalSummary} />)
      )}

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  pendingSection: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    gap: spacing.sm,
  },
  pendingHeader: {
    gap: spacing.xs,
  },
  pendingSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#92400E',
  },
  pendingButton: {
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: '#CA8A04',
  },
  pendingButtonLabel: {
    color: palette.snow,
    fontWeight: '800',
  },
});
