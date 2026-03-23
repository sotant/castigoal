import { ThemeProvider } from '@react-navigation/native';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { Modal, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuth } from '@/src/hooks/use-auth';
import { useAppBootstrap } from '@/src/hooks/use-app-bootstrap';
import { appRoutes } from '@/src/navigation/app-routes';
import { AuthProvider } from '@/src/providers/auth-provider';
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
  const [welcomeModalVisible, setWelcomeModalVisible] = useState(false);

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
