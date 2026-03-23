import AsyncStorage from '@react-native-async-storage/async-storage';

const WELCOME_ONBOARDING_KEY = 'castigoal.v1.welcome-onboarding-completed';
const listeners = new Set<(completed: boolean) => void>();

function emit(completed: boolean) {
  listeners.forEach((listener) => listener(completed));
}

export async function hasCompletedWelcomeOnboarding() {
  const value = await AsyncStorage.getItem(WELCOME_ONBOARDING_KEY);
  return value === 'true';
}

export async function completeWelcomeOnboarding() {
  await AsyncStorage.setItem(WELCOME_ONBOARDING_KEY, 'true');
  emit(true);
}

export async function resetWelcomeOnboarding() {
  await AsyncStorage.removeItem(WELCOME_ONBOARDING_KEY);
  emit(false);
}

export function subscribeToWelcomeOnboarding(listener: (completed: boolean) => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
