import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { authCopy } from '@/src/i18n/auth';
import { DEFAULT_LANGUAGE, DEFAULT_NAMESPACE, I18N_NAMESPACES, SUPPORTED_LANGUAGES } from '@/src/i18n/config';
import { commonCopy } from '@/src/i18n/common';
import { errorCopy } from '@/src/i18n/errors';
import { feedbackCopy } from '@/src/i18n/feedback';
import { goalsCopy } from '@/src/i18n/goals';
import { navigationCopy } from '@/src/i18n/navigation';
import { notificationsCopy } from '@/src/i18n/notifications';
import { privacyCopy } from '@/src/i18n/privacy';
import { punishmentsCopy } from '@/src/i18n/punishments';
import { resources } from '@/src/i18n/resources';
import { settingsCopy } from '@/src/i18n/settings';
import { statsCopy } from '@/src/i18n/stats';
import { getDeviceLocaleTag, resolveSupportedLanguage, syncAppLanguage } from '@/src/i18n/runtime';
import { appTutorialCopy, onboardingCopy } from '@/src/i18n/tutorial';

if (!i18n.isInitialized) {
  const initialLocaleTag = getDeviceLocaleTag();

  void syncAppLanguage(initialLocaleTag);

  // eslint-disable-next-line import/no-named-as-default-member
  void i18n
    .use(initReactI18next)
    .init({
      compatibilityJSON: 'v4',
      resources,
      lng: resolveSupportedLanguage(initialLocaleTag),
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: [...SUPPORTED_LANGUAGES],
      ns: [...I18N_NAMESPACES],
      defaultNS: DEFAULT_NAMESPACE,
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    })
    .then(() => syncAppLanguage(initialLocaleTag));
}

export const copy = {
  appTutorial: appTutorialCopy,
  auth: authCopy,
  common: commonCopy,
  errors: errorCopy,
  feedback: feedbackCopy,
  goals: goalsCopy,
  navigation: navigationCopy,
  notifications: notificationsCopy,
  onboarding: onboardingCopy,
  privacy: privacyCopy,
  punishments: punishmentsCopy,
  settings: settingsCopy,
  stats: statsCopy,
} as const;

export { i18n };
export { appTutorialCopy, authCopy, commonCopy, errorCopy, feedbackCopy, goalsCopy, navigationCopy, notificationsCopy, onboardingCopy, privacyCopy, punishmentsCopy, settingsCopy, statsCopy };
export { DEFAULT_LANGUAGE, DEFAULT_NAMESPACE, I18N_NAMESPACES, SUPPORTED_LANGUAGES } from '@/src/i18n/config';
export {
  getCurrentLanguage,
  getCurrentLocale,
  getDeviceLanguage,
  getLanguagePreference,
  initializeAppLanguage,
  isLanguageReady,
  resolveSupportedLanguage,
  resolveSupportedLocale,
  setManualLanguage,
  syncAppLanguage,
  useCurrentLanguage,
  useCurrentLocale,
  useIsLanguageReady,
  useLanguagePreference,
} from '@/src/i18n/runtime';
