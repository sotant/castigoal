import { createNamespaceProxy, translate, translateObject } from '@/src/i18n/runtime';

export const commonResources = {
  es: {
    actions: {
      apply: 'Aplicar',
      back: 'Atrás',
      cancel: 'Cancelar',
      change: 'Cambiar',
      clear: 'Limpiar',
      close: 'Cerrar',
      complete: 'Completar',
      continue: 'Continuar',
      create: 'Crear',
      delete: 'Borrar',
      discard: 'Descartar',
      edit: 'Editar',
      finish: 'Finalizar',
      hide: 'Ocultar',
      next: 'Siguiente',
      no: 'No',
      omit: 'Omitir',
      retry: 'Reintentar',
      save: 'Guardar',
      saving: 'Guardando...',
      send: 'Enviar',
      sending: 'Enviando...',
      understood: 'Entendido',
      view: 'Ver',
      returning: 'Volviendo...',
      yes: 'Sí',
    },
    badges: {
      optional: 'Opcional',
      required: 'Obligatorio',
    },
    calendar: {
      legend: {
        completed: 'Cumplido',
        missed: 'Fallado',
        noCheckin: 'Sin check-in',
      },
      today: 'Hoy',
      weekdayNarrow: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
    },
    entities: {
      category: 'Categoría',
      description: 'Descripción',
      difficulty: 'Dificultad',
      email: 'Correo electrónico',
      hour: 'Hora',
      information: 'Información',
      library: 'Biblioteca',
      minute: 'Minuto',
      password: 'Contraseña',
      preview: 'Vista previa',
      summary: 'Resumen',
      title: 'Título',
    },
    feedback: {
      closeConfirmation: 'Cerrar confirmación',
    },
    filters: {
      all: 'Todos',
      base: 'Base',
      personal: 'Personal',
    },
    format: {
      days: '{{count}} {{unit}}',
      pageCounter: '{{current}} de {{total}}',
      stepCounter: 'Paso {{current}} de {{total}}',
    },
    states: {
      active: 'Activo',
      approved: 'Aprobado',
      closed: 'Cerrado',
      completed: 'Cumplido',
      failed: 'Fallado',
      pending: 'Pendiente',
    },
    units: {
      day_one: 'día',
      day_other: 'días',
    },
  },
  en: {
    actions: {
      apply: 'Apply',
      back: 'Back',
      cancel: 'Cancel',
      change: 'Change',
      clear: 'Clear',
      close: 'Close',
      complete: 'Complete',
      continue: 'Continue',
      create: 'Create',
      delete: 'Delete',
      discard: 'Discard',
      edit: 'Edit',
      finish: 'Finish',
      hide: 'Hide',
      next: 'Next',
      no: 'No',
      omit: 'Skip',
      retry: 'Retry',
      save: 'Save',
      saving: 'Saving...',
      send: 'Send',
      sending: 'Sending...',
      understood: 'Got it',
      view: 'View',
      returning: 'Returning...',
      yes: 'Yes',
    },
    badges: {
      optional: 'Optional',
      required: 'Required',
    },
    calendar: {
      legend: {
        completed: 'Completed',
        missed: 'Missed',
        noCheckin: 'No check-in',
      },
      today: 'Today',
      weekdayNarrow: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    },
    entities: {
      category: 'Category',
      description: 'Description',
      difficulty: 'Difficulty',
      email: 'Email',
      hour: 'Hour',
      information: 'Information',
      library: 'Library',
      minute: 'Minute',
      password: 'Password',
      preview: 'Preview',
      summary: 'Summary',
      title: 'Title',
    },
    feedback: {
      closeConfirmation: 'Close confirmation',
    },
    filters: {
      all: 'All',
      base: 'Base',
      personal: 'Personal',
    },
    format: {
      days: '{{count}} {{unit}}',
      pageCounter: '{{current}} of {{total}}',
      stepCounter: 'Step {{current}} of {{total}}',
    },
    states: {
      active: 'Active',
      approved: 'Approved',
      closed: 'Closed',
      completed: 'Completed',
      failed: 'Failed',
      pending: 'Pending',
    },
    units: {
      day_one: 'day',
      day_other: 'days',
    },
  },
} as const;

export const commonCopy = createNamespaceProxy('common', commonResources.es);

export function formatDayUnit(count: number) {
  return translate('common:units.day', { count });
}

export function formatDays(count: number) {
  return translate('common:format.days', {
    count,
    unit: formatDayUnit(count),
  });
}

export function formatPageCounter(current: number, total: number) {
  return translate('common:format.pageCounter', { current, total });
}

export function formatStepCounter(current: number, total: number) {
  return translate('common:format.stepCounter', { current, total });
}

export function getWeekdayNarrowLabels() {
  return translateObject<readonly string[]>('common:calendar.weekdayNarrow');
}

export function capitalizeCopy(value: string) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}
