import { createNamespaceProxy } from '@/src/i18n/runtime';

export const navigationResources = {
  es: {
    tabs: {
      goals: 'Objetivos',
      home: 'Hoy',
      punishments: 'Castigos',
      settings: 'Ajustes',
      stats: 'Estadísticas',
    },
  },
  en: {
    tabs: {
      goals: 'Goals',
      home: 'Today',
      punishments: 'Punishments',
      settings: 'Settings',
      stats: 'Stats',
    },
  },
} as const;

export const navigationCopy = createNamespaceProxy('navigation', navigationResources.es);
