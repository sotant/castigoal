import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import { formatStepCounter } from '@/src/i18n/common';
import { appTutorialCopy } from '@/src/i18n/tutorial';
import { AppTutorialStep } from '@/src/services/app-tutorial';

type Props = {
  currentStepNumber: number;
  totalSteps: number;
  step: AppTutorialStep;
  onNext: () => void;
  onSkip: () => void;
};

const BOTTOM_NAV_CLEARANCE = 92;

export function AppTutorialOverlay({ currentStepNumber, totalSteps, step, onNext, onSkip }: Props) {
  const highlightStyle: ViewStyle = {
    borderRadius: step.highlight.borderRadius,
    height: step.highlight.height as ViewStyle['height'],
    left: step.highlight.left as ViewStyle['left'],
    top: step.highlight.top as ViewStyle['top'],
    width: step.highlight.width as ViewStyle['width'],
  };

  return (
    <View pointerEvents="box-none" style={styles.root}>
      <View pointerEvents="auto" style={styles.backdrop}>
        <Pressable style={styles.blockingLayer} />
        <View style={[styles.highlight, highlightStyle]} />

        <SafeAreaView
          edges={step.cardPlacement === 'top' ? ['top'] : ['bottom']}
          pointerEvents="box-none"
          style={[styles.safeArea, step.cardPlacement === 'top' ? styles.safeAreaTop : styles.safeAreaBottom]}>
          <View
            style={[
              styles.cardWrap,
              step.cardPlacement === 'top' ? styles.cardWrapTop : styles.cardWrapBottom,
              step.cardPlacement === 'bottom' && step.cardOffset ? { marginBottom: BOTTOM_NAV_CLEARANCE + step.cardOffset } : null,
            ]}>
            <View style={styles.card}>
              <Text style={styles.stepEyebrow}>
                {formatStepCounter(currentStepNumber, totalSteps).toUpperCase()}
              </Text>
              <Text style={styles.title}>{step.title}</Text>
              <Text style={styles.description}>{step.description}</Text>

              <View style={styles.actions}>
                <Pressable onPress={onSkip} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                  <Text style={styles.secondaryLabel}>{appTutorialCopy.overlay.skip}</Text>
                </Pressable>

                <Pressable onPress={onNext} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                  <Text style={styles.primaryLabel}>{step.ctaLabel}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  blockingLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  highlight: {
    position: 'absolute',
    borderWidth: 5,
    borderColor: '#FDBA74',
    backgroundColor: 'transparent',
    shadowColor: '#FB923C',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  safeAreaTop: {
    justifyContent: 'flex-start',
  },
  safeAreaBottom: {
    justifyContent: 'flex-end',
  },
  cardWrap: {
    paddingVertical: spacing.md,
  },
  cardWrapTop: {
    paddingTop: spacing.lg,
  },
  cardWrapBottom: {
    paddingBottom: spacing.lg,
    marginBottom: BOTTOM_NAV_CLEARANCE,
  },
  card: {
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    ...shadows.card,
  },
  stepEyebrow: {
    color: '#78716C',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    textAlign: 'center',
  },
  title: {
    color: '#EA580C',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
    textAlign: 'center',
  },
  description: {
    color: '#78716C',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 2,
  },
  primaryButton: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: '#FB923C',
  },
  secondaryButton: {
    minWidth: 104,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },
  primaryLabel: {
    color: palette.snow,
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryLabel: {
    color: '#C2410C',
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
