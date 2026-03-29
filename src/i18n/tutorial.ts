import { createNamespaceProxy, translateObject } from '@/src/i18n/runtime';

export const tutorialResources = {
  es: {
    onboarding: {
      buttons: {
        finish: 'Empezar',
        next: 'Siguiente',
        skip: 'Saltar',
      },
      steps: [
        {
          description: 'Convierte tu disciplina en un reto con consecuencias reales.',
          icon: 'target',
          title: 'Cumple tus objetivos... o paga el precio',
        },
        {
          description: 'Haz check-in diario y mantén visible si vas cumpliendo tu meta.',
          icon: 'calendar-check-outline',
          title: 'Cada día cuenta',
        },
        {
          description: 'Si no llegas al objetivo, asume las consecuencias. Tú decides el final.',
          icon: 'gavel',
          title: 'Si fallas, cumple tu castigo',
        },
      ],
      welcomeTitle: 'Bienvenido',
    },
    appTutorial: {
      overlay: {
        skip: 'Omitir',
      },
      steps: [
        {
          ctaLabel: 'Siguiente',
          description:
            'Aquí defines qué quieres conseguir y desde cuándo empieza el reto. Ese objetivo será la base de tus check-ins y tus consecuencias.',
          id: 'goals',
          title: 'Crea tu primer objetivo',
        },
        {
          ctaLabel: 'Siguiente',
          description:
            'En Hoy registras si has cumplido o fallado cada objetivo. Esta pantalla te ayuda a mantener el ritmo día a día.',
          id: 'home',
          title: 'Marca tu check-in diario',
        },
        {
          ctaLabel: 'Siguiente',
          description:
            'En Mis castigos verás las consecuencias que tienes pendientes y también el historial de las que ya completaste.',
          id: 'punishments-mine',
          title: 'Revisa tus castigos pendientes',
        },
        {
          ctaLabel: 'Siguiente',
          description:
            'Aquí tienes todos los castigos disponibles, tanto los que vienen en la app como los que creas tú para personalizar la experiencia.',
          id: 'punishments-library',
          title: 'Explora tu biblioteca de castigos',
        },
        {
          ctaLabel: 'Siguiente',
          description:
            'En Estadísticas puedes ver tu resumen general y también entrar al calendario de cada objetivo para entender mejor tu evolución.',
          id: 'stats',
          title: 'Consulta tu progreso',
        },
        {
          ctaLabel: 'Finalizar',
          description:
            'En Ajustes puedes crear una cuenta para no perder tus datos y recuperar tu progreso cuando cambies de dispositivo.',
          id: 'settings',
          title: 'Guarda tu progreso en una cuenta',
        },
      ],
    },
  },
  en: {
    onboarding: {
      buttons: {
        finish: 'Start',
        next: 'Next',
        skip: 'Skip',
      },
      steps: [
        {
          description: 'Turn your discipline into a challenge with real consequences.',
          icon: 'target',
          title: 'Hit your goals... or pay the price',
        },
        {
          description: 'Check in every day and keep your progress visible.',
          icon: 'calendar-check-outline',
          title: 'Every day counts',
        },
        {
          description: 'If you miss the goal, face the consequences. You decide the ending.',
          icon: 'gavel',
          title: 'If you fail, complete your punishment',
        },
      ],
      welcomeTitle: 'Welcome',
    },
    appTutorial: {
      overlay: {
        skip: 'Skip',
      },
      steps: [
        {
          ctaLabel: 'Next',
          description:
            'Here you define what you want to achieve and when the challenge starts. That goal will be the base for your check-ins and consequences.',
          id: 'goals',
          title: 'Create your first goal',
        },
        {
          ctaLabel: 'Next',
          description:
            'In Today you record whether you completed or missed each goal. This screen helps you keep the rhythm day by day.',
          id: 'home',
          title: 'Mark your daily check-in',
        },
        {
          ctaLabel: 'Next',
          description:
            'In My punishments you will see pending consequences and the history of the ones you already completed.',
          id: 'punishments-mine',
          title: 'Review your pending punishments',
        },
        {
          ctaLabel: 'Next',
          description:
            'Here you have every punishment available, both the ones included in the app and the ones you create to personalize the experience.',
          id: 'punishments-library',
          title: 'Explore your punishment library',
        },
        {
          ctaLabel: 'Next',
          description:
            'In Stats you can review your overview and open each goal calendar to better understand your progress.',
          id: 'stats',
          title: 'Review your progress',
        },
        {
          ctaLabel: 'Finish',
          description:
            'In Settings you can create an account so you do not lose your data and can recover your progress when you change devices.',
          id: 'settings',
          title: 'Save your progress in an account',
        },
      ],
    },
  },
} as const;

export const onboardingCopy = createNamespaceProxy('tutorial', tutorialResources.es.onboarding, 'onboarding');
export const appTutorialCopy = createNamespaceProxy('tutorial', tutorialResources.es.appTutorial, 'appTutorial');

export function getOnboardingSteps() {
  return translateObject<typeof tutorialResources.es.onboarding.steps>('tutorial:onboarding.steps');
}

export function getAppTutorialStepCopy() {
  return translateObject<typeof tutorialResources.es.appTutorial.steps>('tutorial:appTutorial.steps');
}
