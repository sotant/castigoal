import { ThemeProvider } from '@react-navigation/native';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuth } from '@/src/hooks/use-auth';
import { useAppBootstrap } from '@/src/hooks/use-app-bootstrap';
import { appRoutes } from '@/src/navigation/app-routes';
import { AuthProvider } from '@/src/providers/auth-provider';
import { OnboardingIntroModal } from '@/src/screens/OnboardingScreen';
import { useAppStore } from '@/src/store/app-store';

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
  const hydrated = useAppStore((state) => state.hydrated);
  const isPrivacyRoute = pathname === appRoutes.privacy;
  const isOnboardingRoute = pathname === appRoutes.onboarding;
  const isAuthRoute = pathname === appRoutes.auth;

  useEffect(() => {
    if (isLoading || !hydrated) {
      return;
    }

    if (pathname === '/') {
      router.replace(appRoutes.home);
      return;
    }

    if (isOnboardingRoute) {
      router.replace(appRoutes.home);
      return;
    }

    if (session && profile && isAuthRoute && !isPrivacyRoute) {
      router.replace(appRoutes.home);
    }
  }, [
    hydrated,
    isAuthRoute,
    isLoading,
    isOnboardingRoute,
    isPrivacyRoute,
    pathname,
    profile,
    session,
  ]);

  return null;
}

function RootNavigator() {
  useAppBootstrap();
  const pathname = usePathname();
  const hydrated = useAppStore((state) => state.hydrated);
  const onboarding = useAppStore((state) => state.onboarding);
  const shouldRenderIntroModal =
    hydrated &&
    !onboarding.hasSeenOnboarding &&
    !onboarding.isSkipped &&
    !onboarding.isCompleted &&
    !onboarding.hasCreatedFirstGoal &&
    !onboarding.hasLoggedFirstDay &&
    pathname !== '/' &&
    pathname !== appRoutes.auth &&
    pathname !== appRoutes.privacy &&
    pathname !== appRoutes.onboarding;

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
        <Stack.Screen name="punishments/[id]" />
      </Stack>
      {shouldRenderIntroModal ? <OnboardingIntroModal visible /> : null}
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
