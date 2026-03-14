import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { DailyCheckButton } from '@/src/components/DailyCheckButton';
import { EmptyState } from '@/src/components/EmptyState';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, radius, spacing } from '@/src/constants/theme';
import { appRoutes } from '@/src/navigation/app-routes';
import { Goal } from '@/src/models/types';
import { useAppStore } from '@/src/store/app-store';

type Props = {
  goal?: Goal;
};

function getRequiredDays(targetDays: number, minimumSuccessRate: number) {
  return Math.max(1, Math.ceil((targetDays * minimumSuccessRate) / 100));
}

export function CheckinScreen({ goal }: Props) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const recordCheckin = useAppStore((state) => state.recordCheckin);
  const beforeEvaluation = useAppStore((state) => (goal ? state.goalEvaluations[goal.id] : undefined));

  const viewModel = useMemo(() => {
    if (!goal) {
      return undefined;
    }

    return beforeEvaluation ?? {
      goalId: goal.id,
      periodKey: '',
      windowStart: goal.startDate,
      windowEnd: goal.startDate,
      plannedDays: 0,
      completedDays: 0,
      completionRate: 0,
      passed: false,
    };
  }, [beforeEvaluation, goal]);

  if (!goal) {
    return (
      <ScreenContainer title="Check-in">
        <EmptyState title="Objetivo no encontrado" message="No puedo registrar actividad para este objetivo." />
      </ScreenContainer>
    );
  }

  const submit = async (status: 'completed' | 'missed') => {
    if (saving) {
      return;
    }

    setSaving(true);

    try {
      const result = await recordCheckin({ goalId: goal.id, status, note });

      if (result.assignedPunishment) {
        router.replace(appRoutes.punishment(result.assignedPunishment.id));
        return;
      }

      router.replace(appRoutes.goalDetail(goal.id));
    } finally {
      setSaving(false);
    }
  };

  const requiredDays = getRequiredDays(goal.targetDays, goal.minimumSuccessRate);

  return (
    <ScreenContainer
      title={`Check-in de ${goal.title}`}
      subtitle={`Ventana actual: ${viewModel?.completionRate ?? 0}% de cumplimiento.`}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Marca el resultado de hoy</Text>
        <Text style={styles.cardText}>
          Para ir al dia necesitas {requiredDays} dias cumplidos dentro de una ventana de {goal.targetDays} dias.
        </Text>
        <Text style={styles.cardText}>
          Ahora mismo llevas {viewModel?.completedDays ?? 0} de {viewModel?.plannedDays ?? 0} dias cumplidos en la ventana actual.
        </Text>
      </View>

      <View style={styles.actions}>
        <DailyCheckButton label={saving ? 'Guardando...' : 'Cumplido'} status="completed" onPress={() => void submit('completed')} />
        <DailyCheckButton label={saving ? 'Guardando...' : 'No cumplido'} status="missed" onPress={() => void submit('missed')} />
      </View>

      <View style={styles.group}>
        <Text style={styles.label}>Nota del dia</Text>
        <TextInput
          editable={!saving}
          value={note}
          onChangeText={setNote}
          style={[styles.input, styles.multiline]}
          multiline
          placeholder="Que paso hoy, que se interpuso o que salio bien."
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: '#FFF4E8',
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.ink,
  },
  cardText: {
    color: palette.slate,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  group: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.ink,
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
    fontSize: 16,
  },
  multiline: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
});
