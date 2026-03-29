import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n, { TOptions } from 'i18next';
import { useSyncExternalStore } from 'react';

import { AppLanguage, DEFAULT_LANGUAGE, DEFAULT_LOCALE_BY_LANGUAGE, SUPPORTED_LANGUAGES } from '@/src/i18n/config';

type I18nSnapshot = {
  language: AppLanguage;
  locale: string;
  preference: AppLanguage | null;
  ready: boolean;
};

type ResourceShape = Record<string, unknown>;

const LANGUAGE_PREFERENCE_KEY = 'castigoal.v1.language-preference';

let snapshot: I18nSnapshot = {
  language: DEFAULT_LANGUAGE,
  locale: DEFAULT_LOCALE_BY_LANGUAGE[DEFAULT_LANGUAGE],
  preference: null,
  ready: false,
};

const listeners = new Set<() => void>();

function emitSnapshot() {
  listeners.forEach((listener) => listener());
}

function normalizeLocaleTag(localeTag?: string | null) {
  return localeTag?.replace(/_/g, '-').trim() || null;
}

function isSupportedLanguage(value?: string | null): value is AppLanguage {
  return Boolean(value && (SUPPORTED_LANGUAGES as readonly string[]).includes(value));
}

export function resolveSupportedLanguage(localeTag?: string | null): AppLanguage {
  const normalizedLocaleTag = normalizeLocaleTag(localeTag)?.toLowerCase();

  if (normalizedLocaleTag?.startsWith('en')) {
    return 'en';
  }

  if (normalizedLocaleTag?.startsWith('es')) {
    return 'es';
  }

  return DEFAULT_LANGUAGE;
}

export function resolveSupportedLocale(localeTag?: string | null) {
  const normalizedLocaleTag = normalizeLocaleTag(localeTag);
  const language = resolveSupportedLanguage(normalizedLocaleTag);

  if (!normalizedLocaleTag) {
    return DEFAULT_LOCALE_BY_LANGUAGE[language];
  }

  return normalizedLocaleTag.toLowerCase().startsWith(language) ? normalizedLocaleTag : DEFAULT_LOCALE_BY_LANGUAGE[language];
}

export function getDeviceLocaleTag() {
  const locale = getLocales()[0];

  return locale?.languageTag ?? locale?.languageCode ?? DEFAULT_LOCALE_BY_LANGUAGE[DEFAULT_LANGUAGE];
}

export function getDeviceLanguage() {
  return resolveSupportedLanguage(getDeviceLocaleTag());
}

export function getCurrentLanguage() {
  return snapshot.language;
}

export function getCurrentLocale() {
  return snapshot.locale;
}

export function getLanguagePreference() {
  return snapshot.preference;
}

export function isLanguageReady() {
  return snapshot.ready;
}

export function subscribeToI18nSnapshot(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function useCurrentLanguage() {
  return useSyncExternalStore(subscribeToI18nSnapshot, getCurrentLanguage, getCurrentLanguage);
}

export function useCurrentLocale() {
  return useSyncExternalStore(subscribeToI18nSnapshot, getCurrentLocale, getCurrentLocale);
}

export function useLanguagePreference() {
  return useSyncExternalStore(subscribeToI18nSnapshot, getLanguagePreference, getLanguagePreference);
}

export function useIsLanguageReady() {
  return useSyncExternalStore(subscribeToI18nSnapshot, isLanguageReady, isLanguageReady);
}

async function readStoredLanguagePreference() {
  try {
    const value = await AsyncStorage.getItem(LANGUAGE_PREFERENCE_KEY);
    return isSupportedLanguage(value) ? value : null;
  } catch {
    return null;
  }
}

async function writeStoredLanguagePreference(language: AppLanguage | null) {
  try {
    if (language) {
      await AsyncStorage.setItem(LANGUAGE_PREFERENCE_KEY, language);
      return;
    }

    await AsyncStorage.removeItem(LANGUAGE_PREFERENCE_KEY);
  } catch {
    // Keep the in-memory state authoritative even if persistence fails.
  }
}

async function applyLanguageSnapshot(input: {
  localeTag?: string | null;
  preference?: AppLanguage | null;
  persistPreference?: boolean;
  ready?: boolean;
}) {
  const nextLanguage = input.preference ?? resolveSupportedLanguage(input.localeTag);
  const nextLocale = input.preference ? DEFAULT_LOCALE_BY_LANGUAGE[input.preference] : resolveSupportedLocale(input.localeTag);
  const nextSnapshot = {
    language: nextLanguage,
    locale: nextLocale,
    preference: input.preference ?? null,
    ready: input.ready ?? snapshot.ready,
  } satisfies I18nSnapshot;
  const hasChanged =
    snapshot.language !== nextSnapshot.language ||
    snapshot.locale !== nextSnapshot.locale ||
    snapshot.preference !== nextSnapshot.preference ||
    snapshot.ready !== nextSnapshot.ready;

  if (input.persistPreference) {
    await writeStoredLanguagePreference(nextSnapshot.preference);
  }

  snapshot = nextSnapshot;

  if (i18n.isInitialized && i18n.resolvedLanguage !== nextLanguage) {
    // eslint-disable-next-line import/no-named-as-default-member
    await i18n.changeLanguage(nextLanguage);
  }

  if (hasChanged) {
    emitSnapshot();
  }

  return snapshot;
}

export async function initializeAppLanguage() {
  const storedPreference = await readStoredLanguagePreference();

  return applyLanguageSnapshot({
    localeTag: storedPreference ? DEFAULT_LOCALE_BY_LANGUAGE[storedPreference] : getDeviceLocaleTag(),
    preference: storedPreference,
    ready: true,
  });
}

export async function setManualLanguage(language: AppLanguage) {
  return applyLanguageSnapshot({
    localeTag: DEFAULT_LOCALE_BY_LANGUAGE[language],
    preference: language,
    persistPreference: true,
    ready: true,
  });
}

export async function syncAppLanguage(localeTag?: string | null) {
  if (snapshot.preference) {
    if (i18n.isInitialized && i18n.resolvedLanguage !== snapshot.language) {
      // eslint-disable-next-line import/no-named-as-default-member
      await i18n.changeLanguage(snapshot.language);
    }

    return snapshot;
  }

  return applyLanguageSnapshot({
    localeTag,
    preference: null,
    ready: snapshot.ready,
  });
}

export function translate(key: string, options?: TOptions) {
  // eslint-disable-next-line import/no-named-as-default-member
  return (options ? i18n.t(key, options as any) : i18n.t(key)) as string;
}

export function translateObject<T>(key: string, options?: TOptions) {
  // eslint-disable-next-line import/no-named-as-default-member
  return i18n.t(key, { returnObjects: true, ...(options as Record<string, unknown> | undefined) }) as T;
}

export function createNamespaceProxy<T extends ResourceShape>(
  namespace: string,
  shape: T,
  prefix = '',
): T {
  return new Proxy({} as T, {
    get(_target, property) {
      if (typeof property !== 'string') {
        return undefined;
      }

      const sample = shape[property];

      if (typeof sample === 'undefined') {
        return undefined;
      }

      const key = prefix ? `${prefix}.${property}` : property;

      if (Array.isArray(sample)) {
        return i18n.isInitialized ? translateObject(`${namespace}:${key}`) : sample;
      }

      if (sample && typeof sample === 'object') {
        return createNamespaceProxy(namespace, sample as ResourceShape, key);
      }

      return i18n.isInitialized ? translate(`${namespace}:${key}`) : sample;
    },
  });
}
