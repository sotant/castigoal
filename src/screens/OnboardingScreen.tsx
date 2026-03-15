import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, radius, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/use-auth';
import { appRoutes } from '@/src/navigation/app-routes';
import { completeProfileOnboarding } from '@/src/repositories/profile-repository';
import { useAppStore } from '@/src/store/app-store';

export function OnboardingScreen() {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const { refreshProfile, session } = useAuth();
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);

  return (
    <ScreenContainer
      title="Disciplina con consecuencias"
      subtitle="Registra tus objetivos, evalua el cumplimiento y convierte la inercia en accion."
      scroll={false}>
      <View style={styles.hero}>
        <Text style={styles.metric}>5s</Text>
        <Text style={styles.metricLabel}>para marcar tu dia</Text>
      </View>

      <View style={styles.list}>
        <Text style={styles.item}>1. Crea un objetivo claro.</Text>
        <Text style={styles.item}>2. Haz check-in diario.</Text>
        <Text style={styles.item}>3. Si fallas el minimo, se asigna un castigo.</Text>
      </View>

      <TextInput
        placeholder="Como te llamas"
        placeholderTextColor={palette.slate}
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <Pressable
        disabled={saving}
        onPress={async () => {
          if (!session?.user) {
            router.replace(appRoutes.auth);
            return;
          }

          const nextName = name.trim() || 'Usuario';
          setSaving(true);

          try {
            await completeProfileOnboarding(session.user.id, nextName);
            completeOnboarding(nextName);
            await refreshProfile();
            router.replace(appRoutes.home);
          } catch (error) {
            Alert.alert('No se pudo guardar', error instanceof Error ? error.message : 'Error desconocido');
          } finally {
            setSaving(false);
          }
        }}
        style={styles.button}>
        <Text style={styles.buttonLabel}>{saving ? 'Guardando...' : 'Empezar'}</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: spacing.lg,
    borderRadius: 24,
    backgroundColor: palette.primary,
    gap: spacing.xs,
  },
  metric: {
    color: palette.snow,
    fontSize: 48,
    fontWeight: '900',
  },
  metricLabel: {
    color: '#DCE8FF',
    fontSize: 16,
  },
  list: {
    gap: spacing.sm,
  },
  item: {
    fontSize: 16,
    color: palette.ink,
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 18,
    backgroundColor: palette.snow,
    fontSize: 16,
  },
  button: {
    paddingVertical: 16,
    borderRadius: radius.pill,
    alignItems: 'center',
    backgroundColor: palette.primary,
  },
  buttonLabel: {
    color: palette.snow,
    fontSize: 16,
    fontWeight: '800',
  },
});
