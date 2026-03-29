import { Resource } from 'i18next';

import { authResources } from '@/src/i18n/auth';
import { commonResources } from '@/src/i18n/common';
import { errorResources } from '@/src/i18n/errors';
import { feedbackResources } from '@/src/i18n/feedback';
import { goalResources } from '@/src/i18n/goals';
import { navigationResources } from '@/src/i18n/navigation';
import { notificationsResources } from '@/src/i18n/notifications';
import { privacyResources } from '@/src/i18n/privacy';
import { punishmentResources } from '@/src/i18n/punishments';
import { settingsResources } from '@/src/i18n/settings';
import { statsResources } from '@/src/i18n/stats';
import { tutorialResources } from '@/src/i18n/tutorial';

export const resources = {
  es: {
    auth: authResources.es,
    common: commonResources.es,
    errors: errorResources.es,
    feedback: feedbackResources.es,
    goals: goalResources.es,
    navigation: navigationResources.es,
    notifications: notificationsResources.es,
    privacy: privacyResources.es,
    punishments: punishmentResources.es,
    settings: settingsResources.es,
    stats: statsResources.es,
    tutorial: tutorialResources.es,
  },
  en: {
    auth: authResources.en,
    common: commonResources.en,
    errors: errorResources.en,
    feedback: feedbackResources.en,
    goals: goalResources.en,
    navigation: navigationResources.en,
    notifications: notificationsResources.en,
    privacy: privacyResources.en,
    punishments: punishmentResources.en,
    settings: settingsResources.en,
    stats: statsResources.en,
    tutorial: tutorialResources.en,
  },
} as const satisfies Resource;
