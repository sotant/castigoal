import { createNamespaceProxy } from '@/src/i18n/runtime';

export const statsResources = {
  es: {
    calendarModuleBadge: 'Objetivo y calendario',
    empty: {
      noGoalsMessage: 'Todavía no tienes objetivos registrados. Crea uno para ver su progreso en estadísticas.',
      noGoalsTitle: 'Sin objetivos registrados',
    },
    filters: {
      active: 'Activos',
      completed: 'Finalizados',
      emptyActiveMessage: 'No hay objetivos activos para mostrar en el calendario.',
      emptyActiveTitle: 'Sin objetivos activos',
      emptyCompletedMessage: 'No hay objetivos finalizados para consultar en el calendario.',
      emptyCompletedTitle: 'Sin objetivos finalizados',
      question: '¿Qué objetivos quieres consultar?',
    },
    overviewBadge: 'Resumen general',
    overviewCards: {
      activeGoals: 'Objetivos activos',
      completedGoals: 'Objetivos cumplidos',
      completedPunishments: 'Castigos cumplidos',
      failedGoals: 'Objetivos fallados',
      totalCheckins: 'Total de check-ins',
      totalGoals: 'Total de objetivos',
    },
    screenTitle: 'Estadísticas',
  },
  en: {
    calendarModuleBadge: 'Goal and calendar',
    empty: {
      noGoalsMessage: 'You do not have any goals yet. Create one to see its progress in stats.',
      noGoalsTitle: 'No goals yet',
    },
    filters: {
      active: 'Active',
      completed: 'Finished',
      emptyActiveMessage: 'There are no active goals to show on the calendar.',
      emptyActiveTitle: 'No active goals',
      emptyCompletedMessage: 'There are no finished goals to review on the calendar.',
      emptyCompletedTitle: 'No finished goals',
      question: 'Which goals do you want to review?',
    },
    overviewBadge: 'Overview',
    overviewCards: {
      activeGoals: 'Active goals',
      completedGoals: 'Completed goals',
      completedPunishments: 'Completed punishments',
      failedGoals: 'Failed goals',
      totalCheckins: 'Total check-ins',
      totalGoals: 'Total goals',
    },
    screenTitle: 'Stats',
  },
} as const;

export const statsCopy = createNamespaceProxy('stats', statsResources.es);
