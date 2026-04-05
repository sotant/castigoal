import { ThemeProvider } from '@react-navigation/native';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { Alert, Modal, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppTutorialOverlay } from '@/src/components/AppTutorialOverlay';
import { GoalResolutionAnnouncementModal } from '@/src/components/GoalResolutionAnnouncementModal';
import { useAuth } from '@/src/hooks/use-auth';
import { getErrorMessage } from '@/src/lib/app-error';
import { useAppBootstrap } from '@/src/hooks/use-app-bootstrap';
import { appRoutes } from '@/src/navigation/app-routes';
import { AuthProvider } from '@/src/providers/auth-provider';
import { requestNotificationPermissions } from '@/src/services/notifications';
import { useAppStore } from '@/src/store/app-store';
import {
  APP_TUTORIAL_STEPS,
  AppTutorialState,
  completeAppTutorial,
  getAppTutorialState,
  setAppTutorialStep,
  skipAppTutorial,
  startAppTutorial,
  subscribeToAppTutorial,
} from '@/src/services/app-tutorial';
import { hasCompletedWelcomeOnboarding, subscribeToWelcomeOnboarding } from '@/src/services/welcome-onboarding';
import { OnboardingScreen } from '@/src/screens/OnboardingScreen';

const navigationTheme = {
  dark: false,
  colors: {
    primary: '#0F766E',
    background: '#F8FAFC',
    card: '#FFFFFF',
    text: '#112031',
    border: '#D7E0EA',
    notification: '#F97316',
  },
  fonts: {
    regular: {
      fontFamily: 'System',
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500' as const,
    },
    bold: {
      fontFamily: 'System',
      fontWeight: '700' as const,
    },
    heavy: {
      fontFamily: 'System',
      fontWeight: '800' as const,
    },
  },
};

const rootStackScreenOptions = {
  headerShown: false,
  animation: 'slide_from_right' as const,
  animationTypeForReplace: 'push' as const,
  animationMatchesGesture: true,
  gestureDirection: 'horizontal' as const,
  fullScreenGestureEnabled: true,
  gestureEnabled: true,
  animationDuration: Platform.OS === 'android' ? 250 : undefined,
  contentStyle: { backgroundColor: '#F8FAFC' },
};

function AuthRedirector() {
  const pathname = usePathname();
  const { isLoading, profile, session } = useAuth();
  const isPrivacyRoute = pathname === appRoutes.privacy;

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (pathname === '/') {
      router.replace(appRoutes.home);
      return;
    }

    if (session && profile && pathname === appRoutes.auth && !isPrivacyRoute) {
      router.replace(appRoutes.home);
    }
  }, [isLoading, isPrivacyRoute, pathname, profile, session]);

  return null;
}

function RootNavigator() {
  useAppBootstrap();
  const pathname = usePathname();
  const goalResolutionAnnouncements = useAppStore((state) => state.goalResolutionAnnouncements);
  const dismissGoalResolutionAnnouncement = useAppStore((state) => state.dismissGoalResolutionAnnouncement);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const [welcomeModalVisible, setWelcomeModalVisible] = useState(false);
  const [tutorialState, setTutorialState] = useState<AppTutorialState | null>(null);

  const activeTutorialStep =
    tutorialState && tutorialState.status === 'in_progress' ? APP_TUTORIAL_STEPS[tutorialState.currentStep] : null;
  const tutorialModalVisible = !welcomeModalVisible && Boolean(activeTutorialStep);
  const activeGoalResolutionAnnouncement = goalResolutionAnnouncements[0] ?? null;
  const goalResolutionModalVisible = !welcomeModalVisible && !tutorialModalVisible && Boolean(activeGoalResolutionAnnouncement);

  const navigateToTutorialStep = (stepIndex: number) => {
    const step = APP_TUTORIAL_STEPS[stepIndex];

    if (!step) {
      return;
    }

    router.navigate({
      pathname: step.route.pathname,
      params: step.route.params,
    });
  };

  useEffect(() => {
    let cancelled = false;

    void hasCompletedWelcomeOnboarding().then((completed) => {
      if (!cancelled) {
        setWelcomeModalVisible(!completed);
      }
    });

    const unsubscribe = subscribeToWelcomeOnboarding((completed) => {
      setWelcomeModalVisible(!completed);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void getAppTutorialState().then((state) => {
      if (!cancelled) {
        setTutorialState(state);
      }
    });

    const unsubscribe = subscribeToAppTutorial((state) => {
      setTutorialState(state);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (welcomeModalVisible || !tutorialState) {
      return;
    }

    if (tutorialState.status === 'not_started') {
      void startAppTutorial().then((state) => {
        if (state.status === 'in_progress') {
          navigateToTutorialStep(state.currentStep);
        }
      });
      return;
    }

    if (tutorialState.status === 'in_progress') {
      navigateToTutorialStep(tutorialState.currentStep);
    }
  }, [tutorialState, welcomeModalVisible]);

  const handleAdvanceTutorial = async () => {
    if (!tutorialState || tutorialState.status !== 'in_progress') {
      return;
    }

    const nextStepIndex = tutorialState.currentStep + 1;

    if (nextStepIndex >= APP_TUTORIAL_STEPS.length) {
      await completeAppTutorial();
      await syncTutorialReminderPreferences();
      router.navigate(appRoutes.home);
      return;
    }

    const nextState = await setAppTutorialStep(nextStepIndex);
    navigateToTutorialStep(nextState.currentStep);
  };

  const syncTutorialReminderPreferences = async () => {
    try {
      const granted = await requestNotificationPermissions();

      await updateSettings({
        remindersEnabled: granted,
        goalResolutionReminderEnabled: granted,
        pendingPunishmentReminderEnabled: granted,
      });
    } catch (error) {
      Alert.alert('No se pudieron actualizar los recordatorios', getErrorMessage(error));
    }
  };

  const handleSkipTutorial = async () => {
    await skipAppTutorial();
    await syncTutorialReminderPreferences();
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <AuthRedirector />
      <Stack screenOptions={rootStackScreenOptions}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="goals/create" />
        <Stack.Screen name="goals/[id]" />
        <Stack.Screen name="goals/edit/[id]" />
        <Stack.Screen name="punishments/create" />
        <Stack.Screen name="punishments/edit/[id]" />
      </Stack>
      <Modal
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
        transparent={false}
        visible={welcomeModalVisible && pathname !== appRoutes.onboarding}>
        <View style={{ flex: 1, backgroundColor: '#F7F7FA' }}>
          <OnboardingScreen
            onComplete={() => {
              setWelcomeModalVisible(false);
            }}
          />
        </View>
      </Modal>
      <Modal animationType="fade" presentationStyle="overFullScreen" transparent visible={tutorialModalVisible}>
        {activeTutorialStep ? (
          <AppTutorialOverlay
            currentStepNumber={tutorialState!.currentStep + 1}
            onNext={() => {
              void handleAdvanceTutorial();
            }}
            onSkip={() => {
              void handleSkipTutorial();
            }}
            step={activeTutorialStep}
            totalSteps={APP_TUTORIAL_STEPS.length}
          />
        ) : null}
      </Modal>
      <GoalResolutionAnnouncementModal
        announcement={activeGoalResolutionAnnouncement}
        index={goalResolutionAnnouncements.length > 0 ? 1 : 0}
        onClose={() => {
          if (!activeGoalResolutionAnnouncement) {
            return;
          }

          void dismissGoalResolutionAnnouncement(activeGoalResolutionAnnouncement.outcomeId);
        }}
        total={goalResolutionAnnouncements.length}
        visible={goalResolutionModalVisible}
      />
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <RootNavigator />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AuthProvider>
  );
}
