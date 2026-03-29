import { createNamespaceProxy } from '@/src/i18n/runtime';

export const notificationsResources = {
  es: {
    goalResolutionBody: 'Un objetivo ha finalizado. Entra para ver el resultado.',
    pendingPunishment: {
      body: 'Tienes una consecuencia pendiente por completar.',
      title: 'Castigo pendiente',
    },
    reminders: {
      body: 'Haz tu check-in diario antes de cerrar el día.',
      title: 'Castigoal',
    },
  },
  en: {
    goalResolutionBody: 'A goal has finished. Open the app to see the result.',
    pendingPunishment: {
      body: 'You have a pending consequence to complete.',
      title: 'Pending punishment',
    },
    reminders: {
      body: 'Do your daily check-in before the day ends.',
      title: 'Castigoal',
    },
  },
} as const;

export const notificationsCopy = createNamespaceProxy('notifications', notificationsResources.es);
