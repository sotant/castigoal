import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getEmailValidationError, normalizeEmail } from '@/src/lib/email';

export type FeedbackType = 'suggestion' | 'bug_report';

export type FeedbackCategory =
  | 'Nueva función'
  | 'Mejora de diseño'
  | 'Rendimiento'
  | 'Navegación'
  | 'Notificaciones'
  | 'Otro';

export type FeedbackFormValues = {
  subject: string;
  message: string;
  category: FeedbackCategory | '';
  affectedSection: string;
  contactEmail: string;
  reproductionSteps: string;
};

export type FeedbackFormErrors = Partial<Record<keyof FeedbackFormValues, string>>;

type FeedbackCopy = {
  affectedSectionLabel: string;
  affectedSectionPlaceholder: string;
  contactEmailHelper: string;
  contactEmailLabel: string;
  contactEmailPlaceholder: string;
  introDescription: string;
  messageError: string;
  messageLabel: string;
  messagePlaceholder: string;
  screenDescription: string;
  screenTitle: string;
  submitLabel: string;
  subjectError: string;
  subjectLabel: string;
  subjectPlaceholder: string;
  successMessage: string;
  successTitle: string;
};

export const feedbackCategories: readonly FeedbackCategory[] = [
  'Nueva función',
  'Mejora de diseño',
  'Rendimiento',
  'Navegación',
  'Notificaciones',
  'Otro',
] as const;

export const feedbackCopy: Record<FeedbackType, FeedbackCopy> = {
  suggestion: {
    affectedSectionLabel: '',
    affectedSectionPlaceholder: '',
    contactEmailHelper: 'Si quieres que podamos responderte, deja tu email.',
    contactEmailLabel: 'Email de contacto',
    contactEmailPlaceholder: 'tuemail@ejemplo.com',
    introDescription: 'Puedes enviarnos tu mensaje aunque no tengas cuenta.',
    messageError: 'Describe tu sugerencia',
    messageLabel: 'Sugerencia',
    messagePlaceholder: 'Describe tu idea o mejora',
    screenDescription: 'Cuéntanos qué te gustaría mejorar o qué idea te gustaría ver en la app.',
    screenTitle: 'Enviar sugerencia',
    submitLabel: 'Enviar sugerencia',
    subjectError: 'Introduce un asunto',
    subjectLabel: 'Asunto',
    subjectPlaceholder: 'Ej. Poder guardar favoritos más rápido',
    successMessage: 'Hemos recibido tu mensaje y lo tendremos en cuenta para seguir mejorando la app.',
    successTitle: 'Gracias por tu sugerencia',
  },
  bug_report: {
    affectedSectionLabel: 'Pantalla o sección afectada (opcional)',
    affectedSectionPlaceholder: 'Ej. Ajustes o Favoritos',
    contactEmailHelper: 'Si quieres que podamos responderte, deja tu email.',
    contactEmailLabel: 'Email de contacto',
    contactEmailPlaceholder: 'tuemail@ejemplo.com',
    introDescription: 'Puedes enviarnos tu mensaje aunque no tengas cuenta.',
    messageError: 'Describe el problema',
    messageLabel: 'Descripción',
    messagePlaceholder: 'Explica qué ocurrió y qué estabas intentando hacer',
    screenDescription: 'Cuéntanos qué ha fallado para que podamos revisarlo.',
    screenTitle: 'Reportar error',
    submitLabel: 'Enviar reporte',
    subjectError: 'Introduce un titulo',
    subjectLabel: 'Título del problema',
    subjectPlaceholder: 'Ej. La app se cierra al abrir favoritos',
    successMessage: 'Hemos recibido tu reporte y lo revisaremos lo antes posible.',
    successTitle: 'Gracias por avisarnos',
  },
};

const FEEDBACK_SOURCE_SCREEN = 'settings_feedback_section';

export function createInitialFeedbackValues(): FeedbackFormValues {
  return {
    subject: '',
    message: '',
    category: '',
    affectedSection: '',
    contactEmail: '',
    reproductionSteps: '',
  };
}

export function normalizeFeedbackValues(values: FeedbackFormValues): FeedbackFormValues {
  return {
    subject: values.subject.trim(),
    message: values.message.trim(),
    category: values.category,
    affectedSection: values.affectedSection.trim(),
    contactEmail: normalizeEmail(values.contactEmail),
    reproductionSteps: values.reproductionSteps.trim(),
  };
}

export function validateFeedbackForm(type: FeedbackType, values: FeedbackFormValues): FeedbackFormErrors {
  const normalized = normalizeFeedbackValues(values);
  const copy = feedbackCopy[type];
  const errors: FeedbackFormErrors = {};

  if (!normalized.subject) {
    errors.subject = copy.subjectError;
  }

  if (!normalized.message) {
    errors.message = copy.messageError;
  }

  const contactEmailError = getEmailValidationError(normalized.contactEmail);

  if (contactEmailError) {
    errors.contactEmail = contactEmailError;
  }

  return errors;
}

export function canSubmitFeedback(type: FeedbackType, values: FeedbackFormValues) {
  const errors = validateFeedbackForm(type, values);
  return !errors.subject && !errors.message && !errors.contactEmail;
}

export function getFeedbackMetadata() {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale || null;

  return {
    appVersion: Constants.expoConfig?.version ?? null,
    deviceModel: null,
    locale,
    platform: Platform.OS,
    sourceScreen: FEEDBACK_SOURCE_SCREEN,
  };
}
