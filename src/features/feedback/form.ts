import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { FeedbackCategoryId, getFeedbackCategoryOptions } from '@/src/i18n/feedback';
import { getCurrentLocale } from '@/src/i18n';
import { getEmailValidationError, normalizeEmail } from '@/src/lib/email';

export type FeedbackType = 'suggestion' | 'bug_report';

export type FeedbackFormValues = {
  subject: string;
  message: string;
  category: FeedbackCategoryId | '';
  affectedSection: string;
  contactEmail: string;
  reproductionSteps: string;
};

export type FeedbackFormErrors = Partial<Record<keyof FeedbackFormValues, string>>;

export function getFeedbackCategories() {
  return getFeedbackCategoryOptions();
}

export function getFeedbackFormCopy(type: FeedbackType) {
  return type === 'suggestion' ? feedbackCopy.suggestion : feedbackCopy.bugReport;
}

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
  const copy = getFeedbackFormCopy(type);
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
  return {
    appVersion: Constants.expoConfig?.version ?? null,
    deviceModel: null,
    locale: getCurrentLocale(),
    platform: Platform.OS,
    sourceScreen: FEEDBACK_SOURCE_SCREEN,
  };
}
