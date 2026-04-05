import { useCallback, useMemo, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { radius, shadows, spacing } from '@/src/constants/theme';
import { appRoutes } from '@/src/navigation/app-routes';
import { completeWelcomeOnboarding } from '@/src/services/welcome-onboarding';

type OnboardingStep = {
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
};

type OnboardingScreenProps = {
  onComplete?: () => void | Promise<void>;
};

const steps: OnboardingStep[] = [
  {
    icon: 'target',
    title: 'Cumple tus objetivos... o paga el precio',
    description: 'Convierte tu disciplina en un reto con castigos reales.',
  },
  {
    icon: 'calendar-check-outline',
    title: 'Cada día cuenta',
    description: 'Haz check-in diario y mantén visible si vas cumpliendo tu meta.',
  },
  {
    icon: 'gavel',
    title: 'Si fallas, ejecuta tu castigo',
    description: 'Si no llegas al objetivo, asume el castigo. Tú decides el final.',
  },
];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;

  const stepLabel = useMemo(() => `PASO ${stepIndex + 1} DE ${steps.length}`, [stepIndex]);

  const finishOnboarding = useCallback(async () => {
    await completeWelcomeOnboarding();

    if (onComplete) {
      await onComplete();
      return;
    }

    router.replace(appRoutes.home);
  }, [onComplete]);

  const goToStep = useCallback((index: number) => {
    setStepIndex(index);
  }, []);

  const goToPreviousStep = useCallback(() => {
    if (isFirstStep) {
      return;
    }

    setStepIndex((current) => current - 1);
  }, [isFirstStep]);

  const goToNextStep = useCallback(() => {
    if (isLastStep) {
      void finishOnboarding();
      return;
    }

    setStepIndex((current) => current + 1);
  }, [finishOnboarding, isLastStep]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 18 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx <= -50) {
            goToNextStep();
            return;
          }

          if (gestureState.dx >= 50) {
            goToPreviousStep();
          }
        },
      }),
    [goToNextStep, goToPreviousStep],
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.welcomeTitle}>Bienvenido</Text>
        </View>

        <View {...panResponder.panHandlers} style={styles.card}>
          <View style={styles.backgroundBlobTop} />
          <View style={styles.backgroundBlobBottom} />

          <View style={styles.iconBadge}>
            <MaterialCommunityIcons color="#2563EB" name={step.icon} size={28} />
          </View>

          <Text style={styles.stepLabel}>{stepLabel}</Text>
          <Text style={styles.cardTitle}>{step.title}</Text>
          <Text style={styles.cardDescription}>{step.description}</Text>

          <View style={styles.pagination}>
            {steps.map((item, index) => {
              const active = index === stepIndex;

              return (
                <Pressable
                  key={item.title}
                  onPress={() => goToStep(index)}
                  style={({ pressed }) => [
                    styles.paginationDot,
                    active && styles.paginationDotActive,
                    pressed && styles.paginationDotPressed,
                  ]}>
                  {active ? <View style={styles.paginationDotInner} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={goToNextStep} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonLabel}>{isLastStep ? 'Empezar' : 'Siguiente'}</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              void finishOnboarding();
            }}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryButtonLabel}>Saltar</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F7FA',
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
    backgroundColor: '#F7F7FA',
  },
  header: {
    alignItems: 'center',
    marginBottom: 26,
  },
  welcomeTitle: {
    color: '#30271D',
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  card: {
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
    borderRadius: 22,
    backgroundColor: '#F9F4E8',
    borderWidth: 1,
    borderColor: '#E6D9BD',
    alignItems: 'center',
    minHeight: 268,
    ...shadows.card,
  },
  backgroundBlobTop: {
    position: 'absolute',
    top: -28,
    right: -18,
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: '#F8EBCB',
  },
  backgroundBlobBottom: {
    position: 'absolute',
    left: -62,
    bottom: -56,
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: '#EEF2F7',
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    marginTop: -2,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDF7',
    borderWidth: 1,
    borderColor: '#EADCC2',
  },
  stepLabel: {
    marginBottom: spacing.sm,
    color: '#B07A17',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  cardTitle: {
    maxWidth: 260,
    marginBottom: 10,
    color: '#30271D',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 30,
    textAlign: 'center',
    letterSpacing: -0.7,
  },
  cardDescription: {
    maxWidth: 250,
    color: '#64584B',
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },
  pagination: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 'auto',
    paddingTop: 22,
  },
  paginationDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8EA',
    borderWidth: 1,
    borderColor: '#DDCFB4',
  },
  paginationDotActive: {
    borderColor: '#C9952A',
    backgroundColor: '#FFF1D8',
  },
  paginationDotPressed: {
    opacity: 0.85,
  },
  paginationDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#C9952A',
  },
  actions: {
    gap: 10,
    marginTop: 18,
    alignItems: 'center',
  },
  primaryButton: {
    width: '72%',
    minHeight: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C86F1A',
  },
  primaryButtonLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  secondaryButton: {
    width: '72%',
    minHeight: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DFCFAE',
    backgroundColor: '#FBF4E7',
  },
  secondaryButtonLabel: {
    color: '#7E6233',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
