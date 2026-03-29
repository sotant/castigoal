export const SUPPORTED_LANGUAGES = ['es', 'en'] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = 'es';

export const DEFAULT_LOCALE_BY_LANGUAGE: Record<AppLanguage, string> = {
  es: 'es-ES',
  en: 'en-US',
};

export const I18N_NAMESPACES = [
  'common',
  'navigation',
  'auth',
  'goals',
  'punishments',
  'settings',
  'feedback',
  'privacy',
  'tutorial',
  'errors',
  'notifications',
  'stats',
] as const;

export type I18nNamespace = (typeof I18N_NAMESPACES)[number];

export const DEFAULT_NAMESPACE: I18nNamespace = 'common';
