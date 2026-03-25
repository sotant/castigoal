import AsyncStorage from '@react-native-async-storage/async-storage';

import { appRoutes } from '@/src/navigation/app-routes';

export type AppTutorialStatus = 'not_started' | 'in_progress' | 'skipped' | 'completed';
export type AppTutorialStepId = 'goals' | 'home' | 'punishments-mine' | 'punishments-library' | 'stats' | 'settings';

export type AppTutorialHighlight = {
  top: string;
  left: string;
  width: string;
  height: string;
  borderRadius: number;
};

export type AppTutorialStep = {
  id: AppTutorialStepId;
  title: string;
  description: string;
  ctaLabel: string;
  route: {
    pathname: string;
    params?: Record<string, string>;
  };
  cardPlacement: 'top' | 'bottom';
  cardOffset?: number;
  highlight: AppTutorialHighlight;
};

export type AppTutorialState = {
  status: AppTutorialStatus;
  currentStep: number;
  hasShown: boolean;
};

const APP_TUTORIAL_KEY = 'castigoal.v1.app-tutorial-state';

const listeners = new Set<(state: AppTutorialState) => void>();

export const APP_TUTORIAL_STEPS: AppTutorialStep[] = [
  {
    id: 'goals',
    title: 'Crea tu primer objetivo',
    description:
      'Aqui defines que quieres conseguir y desde cuando empieza el reto. Ese objetivo sera la base de tus check-ins y tus consecuencias.',
    ctaLabel: 'Siguiente',
    route: {
      pathname: appRoutes.goals,
    },
    cardPlacement: 'bottom',
    highlight: {
      top: '21%',
      left: '8%',
      width: '84%',
      height: '34%',
      borderRadius: 26,
    },
  },
  {
    id: 'home',
    title: 'Marca tu check-in diario',
    description:
      'En Hoy registras si has cumplido o fallado cada objetivo. Esta pantalla te ayuda a mantener el ritmo dia a dia.',
    ctaLabel: 'Siguiente',
    route: {
      pathname: appRoutes.home,
    },
    cardPlacement: 'bottom',
    highlight: {
      top: '18%',
      left: '5%',
      width: '90%',
      height: '15%',
      borderRadius: 24,
    },
  },
  {
    id: 'punishments-mine',
    title: 'Revisa tus castigos pendientes',
    description:
      'En Mis castigos veras las consecuencias que tienes pendientes y tambien el historial de las que ya completaste.',
    ctaLabel: 'Siguiente',
    route: {
      pathname: appRoutes.punishments,
      params: {
        tab: 'mine',
      },
    },
    cardPlacement: 'bottom',
    cardOffset: 28,
    highlight: {
      top: '10%',
      left: '6%',
      width: '88%',
      height: '24%',
      borderRadius: 24,
    },
  },
  {
    id: 'punishments-library',
    title: 'Explora tu biblioteca de castigos',
    description:
      'Aqui tienes todos los castigos disponibles, tanto los que vienen en la app como los que crees tu para personalizar la experiencia.',
    ctaLabel: 'Siguiente',
    route: {
      pathname: appRoutes.punishments,
      params: {
        tab: 'library',
      },
    },
    cardPlacement: 'bottom',
    cardOffset: 28,
    highlight: {
      top: '21%',
      left: '5%',
      width: '90%',
      height: '30%',
      borderRadius: 24,
    },
  },
  {
    id: 'stats',
    title: 'Consulta tu progreso',
    description:
      'En Stats puedes ver tu resumen general y tambien entrar al calendario de cada objetivo para entender mejor tu evolucion.',
    ctaLabel: 'Siguiente',
    route: {
      pathname: appRoutes.stats,
    },
    cardPlacement: 'bottom',
    cardOffset: -24,
    highlight: {
      top: '9%',
      left: '5%',
      width: '90%',
      height: '50%',
      borderRadius: 26,
    },
  },
  {
    id: 'settings',
    title: 'Guarda tu progreso en una cuenta',
    description:
      'En Ajustes puedes crear una cuenta para no perder tus datos y recuperar tu progreso cuando cambies de dispositivo.',
    ctaLabel: 'Finalizar',
    route: {
      pathname: appRoutes.settings,
    },
    cardPlacement: 'bottom',
    cardOffset: 18,
    highlight: {
      top: '9%',
      left: '4%',
      width: '92%',
      height: '30%',
      borderRadius: 24,
    },
  },
];

const defaultState: AppTutorialState = {
  status: 'not_started',
  currentStep: 0,
  hasShown: false,
};

function emit(state: AppTutorialState) {
  listeners.forEach((listener) => listener(state));
}

async function persistState(state: AppTutorialState) {
  await AsyncStorage.setItem(APP_TUTORIAL_KEY, JSON.stringify(state));
  emit(state);
}

function normalizeState(value: Partial<AppTutorialState> | null | undefined): AppTutorialState {
  const stepCount = APP_TUTORIAL_STEPS.length;
  const currentStep = Math.min(Math.max(value?.currentStep ?? 0, 0), Math.max(stepCount - 1, 0));
  const status = value?.status ?? 'not_started';

  return {
    status,
    currentStep,
    hasShown: value?.hasShown ?? false,
  };
}

export async function getAppTutorialState() {
  const rawValue = await AsyncStorage.getItem(APP_TUTORIAL_KEY);

  if (!rawValue) {
    return defaultState;
  }

  try {
    return normalizeState(JSON.parse(rawValue) as Partial<AppTutorialState>);
  } catch {
    return defaultState;
  }
}

export async function startAppTutorial() {
  const state: AppTutorialState = {
    status: 'in_progress',
    currentStep: 0,
    hasShown: true,
  };

  await persistState(state);
  return state;
}

export async function setAppTutorialStep(stepIndex: number) {
  const current = await getAppTutorialState();
  const state: AppTutorialState = {
    status: 'in_progress',
    currentStep: Math.min(Math.max(stepIndex, 0), APP_TUTORIAL_STEPS.length - 1),
    hasShown: current.hasShown || stepIndex > 0,
  };

  await persistState(state);
  return state;
}

export async function completeAppTutorial() {
  const state: AppTutorialState = {
    status: 'completed',
    currentStep: APP_TUTORIAL_STEPS.length - 1,
    hasShown: true,
  };

  await persistState(state);
  return state;
}

export async function skipAppTutorial() {
  const current = await getAppTutorialState();
  const state: AppTutorialState = {
    status: 'skipped',
    currentStep: current.currentStep,
    hasShown: true,
  };

  await persistState(state);
  return state;
}

export async function resetAppTutorial() {
  await AsyncStorage.removeItem(APP_TUTORIAL_KEY);
  emit(defaultState);
  return defaultState;
}

export function subscribeToAppTutorial(listener: (state: AppTutorialState) => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
