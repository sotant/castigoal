import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { EmptyState } from '@/src/components/EmptyState';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, radius, spacing } from '@/src/constants/theme';
import { appRoutes } from '@/src/navigation/app-routes';
import { selectAssignedPunishmentDetail, useAppStore } from '@/src/store/app-store';
import { formatLongDate } from '@/src/utils/date';

type Props = {
  assignedId?: string;
};

export function PunishmentScreen({ assignedId }: Props) {
  const detail = useAppStore(selectAssignedPunishmentDetail(assignedId ?? ''));
  const loadAssignedPunishmentDetail = useAppStore((state) => state.loadAssignedPunishmentDetail);
  const completeAssignedPunishment = useAppStore((state) => state.completeAssignedPunishment);
  const [loading, setLoading] = useState(Boolean(assignedId));

  useEffect(() => {
    if (!assignedId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void loadAssignedPunishmentDetail(assignedId).finally(() => {
      setLoading(false);
    });
  }, [assignedId, loadAssignedPunishmentDetail]);

  if (loading) {
    return (
      <ScreenContainer title="Castigo">
        <EmptyState title="Cargando castigo" message="Estoy recuperando la consecuencia asignada." />
      </ScreenContainer>
    );
  }

  if (!detail) {
    return (
      <ScreenContainer title="Castigo">
        <EmptyState title="Castigo no disponible" message="No he encontrado un castigo asignado con ese identificador." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      title="Castigo generado"
      subtitle="La consecuencia se crea automaticamente al caer por debajo del minimo.">
      <View style={styles.hero}>
        <Text style={styles.category}>{detail.punishment.category}</Text>
        <Text style={styles.title}>{detail.punishment.title}</Text>
        <Text style={styles.description}>{detail.punishment.description}</Text>
      </View>

      <View style={styles.metaCard}>
        <Text style={styles.meta}>Vence: {formatLongDate(detail.assigned.dueDate)}</Text>
        <Text style={styles.meta}>Estado: {detail.assigned.status === 'completed' ? 'Completado' : 'Pendiente'}</Text>
      </View>

      {detail.assigned.status === 'pending' ? (
        <Pressable
          onPress={async () => {
            await completeAssignedPunishment(detail.assigned.id);
            router.replace(appRoutes.punishments);
          }}
          style={styles.primaryButton}>
          <Text style={styles.primaryLabel}>Marcar como completado</Text>
        </Pressable>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: spacing.lg,
    borderRadius: 22,
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FFD3D3',
    gap: spacing.sm,
  },
  category: {
    color: palette.danger,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: palette.ink,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.slate,
  },
  metaCard: {
    padding: spacing.md,
    borderRadius: 18,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: palette.line,
    gap: spacing.xs,
  },
  meta: {
    color: palette.slate,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: radius.pill,
    alignItems: 'center',
    backgroundColor: palette.danger,
  },
  primaryLabel: {
    color: palette.snow,
    fontWeight: '800',
  },
});
