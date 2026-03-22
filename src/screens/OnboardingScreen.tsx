import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import { appRoutes } from '@/src/navigation/app-routes';
import { useAppStore } from '@/src/store/app-store';

const INTRO_SLIDES = [
  {
    title: 'Cumple tus objetivos... o paga el precio',
    text: 'Convierte tu disciplina en un reto con consecuencias reales.',
    icon: 'target',
  },
  {
    title: 'Cada dia cuenta',
    text: 'Marca si cumpliste. Si no llegas a la meta, habra castigo.',
    icon: 'calendar',
  },
  {
    title: 'Tu progreso puede seguir contigo',
    text: 'Puedes usar la app sin cuenta y crear una mas adelante para sincronizar tu progreso.',
    icon: 'cloud',
  },
] as const;

export function OnboardingIntroModal({
  visible,
  allowDismiss = false,
}: {
  visible: boolean;
  allowDismiss?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const goals = useAppStore((state) => state.goals);
  const onboarding = useAppStore((state) => state.onboarding);
  const setOnboardingIntroSlide = useAppStore((state) => state.setOnboardingIntroSlide);
  const completeOnboardingIntro = useAppStore((state) => state.completeOnboardingIntro);
  const skipOnboarding = useAppStore((state) => state.skipOnboarding);
  const startOnboarding = useAppStore((state) => state.startOnboarding);
  const viewOnboardingStep = useAppStore((state) => state.viewOnboardingStep);
  const [busyAction, setBusyAction] = useState<'continue' | 'skip' | null>(null);

  const currentSlideIndex =
    typeof onboarding.introSlideIndex === 'number' && Number.isFinite(onboarding.introSlideIndex)
      ? Math.max(0, Math.min(onboarding.introSlideIndex, INTRO_SLIDES.length - 1))
      : 0;
  const isLastSlide = currentSlideIndex === INTRO_SLIDES.length - 1;
  const slide = useMemo(() => INTRO_SLIDES[currentSlideIndex] ?? INTRO_SLIDES[0], [currentSlideIndex]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    void startOnboarding();
  }, [startOnboarding, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    void viewOnboardingStep('intro_pending');
  }, [currentSlideIndex, viewOnboardingStep, visible]);

  const resolvePostIntroRoute = () => {
    if (goals.length === 0) {
      return appRoutes.goals;
    }

    return appRoutes.home;
  };

  const goToNextSlide = useCallback(async () => {
    const nextIndex = Math.min(currentSlideIndex + 1, INTRO_SLIDES.length - 1);
    await setOnboardingIntroSlide(nextIndex);
  }, [currentSlideIndex, setOnboardingIntroSlide]);

  const goToPreviousSlide = useCallback(async () => {
    const nextIndex = Math.max(currentSlideIndex - 1, 0);
    await setOnboardingIntroSlide(nextIndex);
  }, [currentSlideIndex, setOnboardingIntroSlide]);

  const stepSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 12 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx <= -40 && currentSlideIndex < INTRO_SLIDES.length - 1) {
            void goToNextSlide();
            return;
          }

          if (gestureState.dx >= 40 && currentSlideIndex > 0) {
            void goToPreviousSlide();
          }
        },
      }),
    [currentSlideIndex, goToNextSlide, goToPreviousSlide],
  );

  return (
    <Modal animationType="fade" onRequestClose={() => {}} transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.backdrop} />
        <View style={[styles.sheetWrap, { paddingTop: insets.top + spacing.md, paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <View style={styles.sheet}>
            <View style={styles.headerRow}>
              <View style={styles.headerCopy}>
                <Text style={styles.modalTitle}>Bienvenido</Text>
              </View>
              {allowDismiss ? (
                <Pressable accessibilityLabel="Cerrar onboarding" hitSlop={8} style={styles.closeButton}>
                  <Feather color={palette.primaryDeep} name="x" size={18} />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.heroCard} {...stepSwipeResponder.panHandlers}>
              <View style={styles.heroGlowTop} />
              <View style={styles.heroGlowBottom} />

              <View style={styles.stepContent}>
                <View style={styles.stepBody}>
                  <View accessible accessibilityRole="image" accessibilityLabel={`Ilustracion del paso ${currentSlideIndex + 1}`}>
                    <View style={styles.iconOrb}>
                      <Feather color={palette.primaryDeep} name={slide.icon} size={32} />
                    </View>
                  </View>

                  <View style={styles.copyBlock}>
                    <Text style={styles.eyebrow}>Paso {currentSlideIndex + 1} de {INTRO_SLIDES.length}</Text>
                    <Text style={styles.title}>{slide.title}</Text>
                    <Text style={styles.text}>{slide.text}</Text>
                  </View>
                </View>

                <View accessibilityLabel={`Progreso de intro ${currentSlideIndex + 1} de ${INTRO_SLIDES.length}`} style={styles.dotsRow}>
                  {INTRO_SLIDES.map((item, index) => {
                    const active = index === currentSlideIndex;

                    return (
                      <Pressable
                        key={item.title}
                        accessibilityLabel={`Ir al paso ${index + 1}`}
                        accessibilityRole="button"
                        disabled={busyAction !== null}
                        onPress={() => void setOnboardingIntroSlide(index)}
                        style={[styles.dot, active ? styles.dotActive : null]}>
                        <View style={[styles.dotInner, active ? styles.dotInnerActive : null]} />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={styles.footer}>
              <Pressable
                accessibilityHint={isLastSlide ? 'Termina la intro y te lleva a Objetivos.' : 'Avanza al siguiente paso de la intro.'}
                accessibilityLabel={isLastSlide ? 'Empezar' : 'Siguiente'}
                accessibilityRole="button"
                disabled={busyAction !== null}
                onPress={async () => {
                  setBusyAction('continue');

                  try {
                    if (!isLastSlide) {
                      await goToNextSlide();
                    } else {
                      await completeOnboardingIntro();
                      router.replace(resolvePostIntroRoute());
                    }
                  } catch (error) {
                    Alert.alert('No se pudo continuar', error instanceof Error ? error.message : 'Error desconocido');
                  } finally {
                    setBusyAction(null);
                  }
                }}
                style={styles.primaryButton}>
                <Text style={styles.primaryButtonLabel}>{isLastSlide ? 'Empezar' : 'Siguiente'}</Text>
              </Pressable>

              <Pressable
                accessibilityHint="Omite la intro y te lleva al siguiente paso del onboarding."
                accessibilityLabel="Saltar intro"
                accessibilityRole="button"
                disabled={busyAction !== null}
                onPress={async () => {
                  setBusyAction('skip');

                  try {
                    await skipOnboarding();
                    router.replace(resolvePostIntroRoute());
                  } catch (error) {
                    Alert.alert('No se pudo saltar', error instanceof Error ? error.message : 'Error desconocido');
                  } finally {
                    setBusyAction(null);
                  }
                }}
                style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonLabel}>Saltar</Text>
              </Pressable>

            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function OnboardingScreen() {
  return <OnboardingIntroModal visible />;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FAFC',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    gap: spacing.md,
  },
  headerRow: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerCopy: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  modalTitle: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '900',
    color: '#2C2418',
    textAlign: 'center',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 340,
    padding: spacing.md,
    borderRadius: 28,
    backgroundColor: '#FCF9F1',
    borderWidth: 1,
    borderColor: '#E9DEC7',
    justifyContent: 'space-between',
    ...shadows.card,
  },
  stepContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  stepBody: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.md,
  },
  heroGlowTop: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: '#FADAA4',
    opacity: 0.35,
  },
  heroGlowBottom: {
    position: 'absolute',
    bottom: -70,
    left: -20,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: '#E6F1FF',
    opacity: 0.6,
  },
  iconOrb: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4D7BF',
  },
  copyBlock: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9A6700',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    lineHeight: 33,
    fontWeight: '900',
    color: '#2C2418',
    textAlign: 'center',
  },
  text: {
    maxWidth: 280,
    fontSize: 16,
    lineHeight: 24,
    color: '#5C5143',
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D9CCB4',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  dotActive: {
    borderColor: '#B67C11',
    backgroundColor: '#FFF1D1',
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: '#B7AA92',
  },
  dotInnerActive: {
    width: 12,
    height: 12,
    backgroundColor: '#B67C11',
  },
  footer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  primaryButton: {
    minHeight: 46,
    width: '100%',
    maxWidth: 240,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: '#C66A1D',
  },
  primaryButtonLabel: {
    color: palette.snow,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 44,
    width: '100%',
    maxWidth: 240,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#DFC8A4',
    backgroundColor: '#FFF8EA',
  },
  secondaryButtonLabel: {
    color: '#684A24',
    fontSize: 15,
    fontWeight: '700',
  },
});
