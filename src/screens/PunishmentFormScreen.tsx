import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import { appRoutes } from '@/src/navigation/app-routes';
import { usePunishmentCatalog } from '@/src/features/punishments/selectors';

export function PunishmentFormScreen() {
  const { addCustomPunishment } = usePunishmentCatalog();
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const normalizedTitle = title.trim();

    if (!normalizedTitle || saving) {
      return;
    }

    setSaving(true);

    try {
      await addCustomPunishment({
        title: normalizedTitle,
        description: normalizedTitle,
        category: 'custom',
        difficulty: 1,
      });
      router.replace({ pathname: appRoutes.punishments, params: { tab: 'library' } });
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer title="Crear castigo">
      <View style={styles.panel}>
        <View style={styles.copyBlock}>
          <Text style={styles.eyebrow}>Biblioteca</Text>
          <Text style={styles.title}>Anade un castigo personal</Text>
          <Text style={styles.description}>
            Se guardara en tu biblioteca para reutilizarlo cuando el sistema necesite asignarte una consecuencia.
          </Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Nombre del castigo</Text>
          <TextInput
            autoFocus
            editable={!saving}
            onChangeText={setTitle}
            placeholder="Ejemplo: limpiar el coche"
            returnKeyType="done"
            style={styles.input}
            value={title}
            onSubmitEditing={() => {
              void handleSubmit();
            }}
          />
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            disabled={saving}
            onPress={() => router.back()}
            style={[styles.secondaryButton, saving && styles.disabled]}>
            <Text style={styles.secondaryLabel}>Cancelar</Text>
          </Pressable>

          <Pressable
            disabled={saving || !title.trim()}
            onPress={() => {
              void handleSubmit();
            }}
            style={[styles.primaryButton, (saving || !title.trim()) && styles.disabled]}>
            <Text style={styles.primaryLabel}>{saving ? 'Guardando...' : 'Crear castigo'}</Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: 28,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: palette.line,
    ...shadows.card,
  },
  copyBlock: {
    gap: spacing.xs,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: palette.primaryDeep,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: palette.ink,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.slate,
  },
  formGroup: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: palette.ink,
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.cloud,
    fontSize: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: palette.primary,
  },
  primaryLabel: {
    color: palette.snow,
    fontWeight: '800',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
  },
  secondaryLabel: {
    color: palette.ink,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.6,
  },
});
