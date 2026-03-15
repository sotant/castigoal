import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/src/components/EmptyState';
import { GoalListItem } from '@/src/components/GoalListItem';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { HomeGoalSummary } from '@/src/models/types';
import { palette, radius, spacing } from '@/src/constants/theme';
import { appRoutes } from '@/src/navigation/app-routes';
import { useAppStore } from '@/src/store/app-store';

function isHistoricalGoal(goalSummary: HomeGoalSummary) {
  return goalSummary.daysUntilStart === 0 && goalSummary.remainingDays === 0;
}

function GoalSection({
  emptyMessage,
  initiallyExpanded,
  items,
  title,
}: {
  emptyMessage: string;
  initiallyExpanded: boolean;
  items: HomeGoalSummary[];
  title: string;
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded);

  return (
    <View style={styles.section}>
      <Pressable onPress={() => setExpanded((value) => !value)} style={styles.sectionHeader}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionCount}>{items.length}</Text>
        </View>
        <Feather color={palette.slate} name={expanded ? 'chevron-up' : 'chevron-down'} size={18} />
      </Pressable>

      {expanded ? (
        items.length > 0 ? (
          items.map((goalSummary) => <GoalListItem key={goalSummary.goalId} summary={goalSummary} />)
        ) : (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>{emptyMessage}</Text>
          </View>
        )
      ) : null}
    </View>
  );
}

export function HomeScreen() {
  const homeSummary = useAppStore((state) => state.homeSummary);
  const hasPendingPunishments = homeSummary.pendingPunishmentsCount > 0;
  const { activeGoals, historicalGoals } = useMemo(() => {
    const active: HomeGoalSummary[] = [];
    const historical: HomeGoalSummary[] = [];

    for (const goalSummary of homeSummary.goalSummaries) {
      if (isHistoricalGoal(goalSummary)) {
        historical.push(goalSummary);
      } else {
        active.push(goalSummary);
      }
    }

    return {
      activeGoals: active,
      historicalGoals: historical,
    };
  }, [homeSummary.goalSummaries]);

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
        <View style={styles.sections}>
          <GoalSection
            title="Activos"
            items={activeGoals}
            initiallyExpanded
            emptyMessage="No hay objetivos activos ahora mismo."
          />
          <GoalSection
            title="Historico"
            items={historicalGoals}
            initiallyExpanded={false}
            emptyMessage="Todavia no hay objetivos con el plazo terminado."
          />
        </View>
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
  sections: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.ink,
  },
  sectionCount: {
    minWidth: 28,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: palette.mist,
    color: palette.slate,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySection: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.cloud,
  },
  emptySectionText: {
    color: palette.slate,
    lineHeight: 21,
  },
});
