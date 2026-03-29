import AsyncStorage from '@react-native-async-storage/async-storage';

import { getAppTutorialStepCopy } from '@/src/i18n/tutorial';
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

export function getAppTutorialSteps(): AppTutorialStep[] {
  const stepsCopy = getAppTutorialStepCopy();

  return [
  {
    id: 'goals',
    title: stepsCopy[0].title,
    description: stepsCopy[0].description,
    ctaLabel: stepsCopy[0].ctaLabel,
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
    title: stepsCopy[1].title,
    description: stepsCopy[1].description,
    ctaLabel: stepsCopy[1].ctaLabel,
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
    title: stepsCopy[2].title,
    description: stepsCopy[2].description,
    ctaLabel: stepsCopy[2].ctaLabel,
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
    title: stepsCopy[3].title,
    description: stepsCopy[3].description,
    ctaLabel: stepsCopy[3].ctaLabel,
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
    title: stepsCopy[4].title,
    description: stepsCopy[4].description,
    ctaLabel: stepsCopy[4].ctaLabel,
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
    title: stepsCopy[5].title,
    description: stepsCopy[5].description,
    ctaLabel: stepsCopy[5].ctaLabel,
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
}

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
  const stepCount = getAppTutorialSteps().length;
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
  const totalSteps = getAppTutorialSteps().length;
  const state: AppTutorialState = {
    status: 'in_progress',
    currentStep: Math.min(Math.max(stepIndex, 0), totalSteps - 1),
    hasShown: current.hasShown || stepIndex > 0,
  };

  await persistState(state);
  return state;
}

export async function completeAppTutorial() {
  const totalSteps = getAppTutorialSteps().length;
  const state: AppTutorialState = {
    status: 'completed',
    currentStep: totalSteps - 1,
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
