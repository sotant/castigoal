import { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { getBasePunishmentCatalog, getPunishmentCategoryCopy, getPunishmentDifficultyCopy, punishmentResources } from '@/src/i18n/punishments';
import { CompletedPunishmentHistoryEntry } from '@/src/contracts/derived-data';
import { Punishment, PunishmentCategoryId, PunishmentCategoryName } from '@/src/models/types';

type PunishmentCategoryOption = {
  value: PunishmentCategoryName;
  name: PunishmentCategoryName;
  label: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  accent: string;
  tint: string;
};

type PunishmentDifficultyOption = {
  value: 1 | 2 | 3;
  label: string;
  description: string;
  accent: string;
  tint: string;
};

type BasePunishmentCatalogEntry = (typeof punishmentResources.es.baseCatalog)[number];

const CATEGORY_METADATA = {
  tarea: {
    accent: '#2563EB',
    icon: 'checkmark-done-outline',
    tint: '#EAF2FF',
  },
  estudio: {
    accent: '#4F46E5',
    icon: 'book-outline',
    tint: '#EEF2FF',
  },
  fisico: {
    accent: '#D97706',
    icon: 'barbell-outline',
    tint: '#FFF4E6',
  },
  social: {
    accent: '#0F766E',
    icon: 'people-outline',
    tint: '#E8FFFB',
  },
  finanzas: {
    accent: '#7C3AED',
    icon: 'cash-outline',
    tint: '#F2EBFF',
  },
  entretenimiento: {
    accent: '#DB2777',
    icon: 'game-controller-outline',
    tint: '#FCE7F3',
  },
  salud: {
    accent: '#DC2626',
    icon: 'heart-outline',
    tint: '#FEECEC',
  },
  trabajo: {
    accent: '#1D4ED8',
    icon: 'briefcase-outline',
    tint: '#E8F1FF',
  },
  nutricion: {
    accent: '#059669',
    icon: 'restaurant-outline',
    tint: '#EAFBF4',
  },
  hogar: {
    accent: '#0F766E',
    icon: 'home-outline',
    tint: '#ECFDF5',
  },
  otros: {
    accent: '#475467',
    icon: 'apps-outline',
    tint: '#F3F4F6',
  },
} as const satisfies Record<
  PunishmentCategoryName,
  Omit<PunishmentCategoryOption, 'description' | 'label' | 'name' | 'value'>
>;

const DEFAULT_PUNISHMENT_CREATED_AT = '2026-01-01T00:00:00.000Z';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BASE_PUNISHMENT_ID_SET = new Set(punishmentResources.es.baseCatalog.map((punishment) => punishment.id));
const BASE_PUNISHMENT_ID_BY_NORMALIZED_TITLE = Object.fromEntries(
  [...punishmentResources.es.baseCatalog, ...punishmentResources.en.baseCatalog].map((punishment) => [
    normalizeCatalogLookupKey(punishment.title),
    punishment.id,
  ]),
) as Record<string, string>;

export const DEFAULT_CATEGORY_ID: PunishmentCategoryName = 'tarea';

function normalizeCatalogLookupKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function getPunishmentCategoryOptions(): PunishmentCategoryOption[] {
  const categoryCopy = getPunishmentCategoryCopy();

  return (Object.entries(CATEGORY_METADATA) as [PunishmentCategoryName, (typeof CATEGORY_METADATA)[PunishmentCategoryName]][]).map(
    ([name, metadata]) => ({
      ...metadata,
      description: categoryCopy[name].description,
      label: categoryCopy[name].label,
      name,
      value: name,
    }),
  );
}

export function getPunishmentDifficultyOptions(): PunishmentDifficultyOption[] {
  const difficultyCopy = getPunishmentDifficultyCopy();

  return [
    {
      value: 1,
      label: difficultyCopy[1].label,
      description: difficultyCopy[1].description,
      accent: '#2563EB',
      tint: '#EDF4FF',
    },
    {
      value: 2,
      label: difficultyCopy[2].label,
      description: difficultyCopy[2].description,
      accent: '#D97706',
      tint: '#FFF4E6',
    },
    {
      value: 3,
      label: difficultyCopy[3].label,
      description: difficultyCopy[3].description,
      accent: '#DC2626',
      tint: '#FEECEC',
    },
  ];
}

export function getPunishmentCategoryLabels(): Record<PunishmentCategoryName, string> {
  return Object.fromEntries(getPunishmentCategoryOptions().map((option) => [option.name, option.label])) as Record<
    PunishmentCategoryName,
    string
  >;
}

export function getPunishmentCategoryNamesById(): Record<PunishmentCategoryName, PunishmentCategoryName> {
  return Object.fromEntries(getPunishmentCategoryOptions().map((option) => [option.name, option.name])) as Record<
    PunishmentCategoryName,
    PunishmentCategoryName
  >;
}

const LEGACY_PUNISHMENT_CATEGORY_NAME_BY_NAME: Record<string, PunishmentCategoryName> = {
  custom: 'otros',
  domestic: 'hogar',
  entretenimiento: 'entretenimiento',
  estudio: 'estudio',
  financial: 'finanzas',
  finanzas: 'finanzas',
  fisico: 'fisico',
  hogar: 'hogar',
  nutrition: 'nutricion',
  nutricion: 'nutricion',
  otros: 'otros',
  physical: 'fisico',
  productive: 'tarea',
  salud: 'salud',
  social: 'social',
  tarea: 'tarea',
  trabajo: 'trabajo',
};

const LEGACY_NUMERIC_CATEGORY_ID_TO_NAME: Record<string, PunishmentCategoryName> = {
  '1': 'tarea',
  '2': 'estudio',
  '3': 'fisico',
  '4': 'social',
  '5': 'finanzas',
  '6': 'entretenimiento',
  '7': 'salud',
  '8': 'trabajo',
  '9': 'nutricion',
  '10': 'hogar',
  '11': 'otros',
};

const LEGACY_PUNISHMENT_CATEGORY_NAME_BY_TITLE: Record<string, PunishmentCategoryName> = {
  '50 flexiones': 'fisico',
  'Bloque profundo': 'trabajo',
  'Camina 8000 pasos': 'fisico',
  'Correr 5 km': 'fisico',
  'Donar 15 EUR': 'finanzas',
  'Donar 5 EUR': 'finanzas',
  'Dormir sin pantallas': 'salud',
  'Escribir reflexion': 'estudio',
  'Lavar y doblar ropa': 'hogar',
  'Leer 20 paginas': 'estudio',
  'Limpia una habitacion': 'hogar',
  'Limpieza profunda cocina': 'hogar',
  'Ordena el escritorio': 'trabajo',
  'Plancha 3 minutos': 'fisico',
  'Preparar comida sana': 'nutricion',
  'Sesion de movilidad 40 min': 'salud',
  'Sin cafe manana': 'salud',
  'Sin redes sociales': 'entretenimiento',
  'Sin streaming 48h': 'entretenimiento',
  'Vaciar bandeja pendiente': 'tarea',
};

export function isBasePunishmentId(value?: string | null) {
  return Boolean(value && BASE_PUNISHMENT_ID_SET.has(value));
}

export function getBasePunishmentDefinition(
  input: { id?: string | null; title?: string | null },
  options?: { allowTitleFallback?: boolean },
) {
  const baseCatalog = getBasePunishmentCatalog();
  const punishmentById = Object.fromEntries(baseCatalog.map((punishment) => [punishment.id, punishment])) as Record<
    string,
    BasePunishmentCatalogEntry
  >;

  if (input.id && punishmentById[input.id]) {
    return punishmentById[input.id];
  }

  const shouldFallbackByTitle = options?.allowTitleFallback ?? !input.id;
  const normalizedTitle = shouldFallbackByTitle && input.title ? normalizeCatalogLookupKey(input.title) : '';
  const resolvedId = normalizedTitle ? BASE_PUNISHMENT_ID_BY_NORMALIZED_TITLE[normalizedTitle] : undefined;

  return resolvedId ? punishmentById[resolvedId] ?? null : null;
}

export function getPunishmentDisplay(punishment: Punishment): Punishment {
  if (punishment.scope !== 'base') {
    return punishment;
  }

  const baseDefinition = getBasePunishmentDefinition(
    { id: punishment.id, title: punishment.title },
    { allowTitleFallback: true },
  );

  if (!baseDefinition) {
    return punishment;
  }

  return {
    ...punishment,
    categoryId: normalizePunishmentCategoryId(punishment.categoryId),
    categoryName: baseDefinition.categoryName,
    description: baseDefinition.description,
    difficulty: baseDefinition.difficulty,
    title: baseDefinition.title,
  };
}

export function getPunishmentDisplayTitle(punishment: Punishment) {
  return getPunishmentDisplay(punishment).title;
}

export function getPunishmentDisplayDescription(punishment: Punishment) {
  return getPunishmentDisplay(punishment).description;
}

export function getPunishmentSystemKey(punishment: Pick<Punishment, 'id' | 'scope' | 'title'>) {
  if (punishment.scope !== 'base') {
    return punishment.id;
  }

  return getBasePunishmentDefinition(
    { id: punishment.id, title: punishment.title },
    { allowTitleFallback: true },
  )?.id ?? punishment.id;
}

export function getCompletedPunishmentHistoryDisplay(entry: CompletedPunishmentHistoryEntry): CompletedPunishmentHistoryEntry {
  const baseDefinition = getBasePunishmentDefinition({
    id: entry.punishmentId,
    title: entry.punishmentTitle,
  }, {
    allowTitleFallback: !entry.punishmentId,
  });

  if (!baseDefinition) {
    return entry;
  }

  return {
    ...entry,
    punishmentDescription: baseDefinition.description,
    punishmentId: entry.punishmentId ?? baseDefinition.id,
    punishmentTitle: baseDefinition.title,
  };
}

export function isPunishmentCategoryName(value: string | null | undefined): value is PunishmentCategoryName {
  return Boolean(value && value in CATEGORY_METADATA);
}

function normalizeKnownCategoryName(value: string | number | null | undefined) {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return LEGACY_NUMERIC_CATEGORY_ID_TO_NAME[String(value)] ?? DEFAULT_CATEGORY_ID;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (isPunishmentCategoryName(normalizedValue)) {
    return normalizedValue;
  }

  return LEGACY_NUMERIC_CATEGORY_ID_TO_NAME[normalizedValue] ?? LEGACY_PUNISHMENT_CATEGORY_NAME_BY_NAME[normalizedValue] ?? null;
}

export function resolveLegacyPunishmentCategoryId(
  title?: string | null,
  categoryId?: string | number | null,
  categoryName?: string | null,
) {
  const basePunishment = getBasePunishmentDefinition(
    { id: typeof categoryId === 'string' ? categoryId : null, title },
    { allowTitleFallback: true },
  );

  if (basePunishment) {
    return basePunishment.categoryName;
  }

  if (title) {
    const byTitle = LEGACY_PUNISHMENT_CATEGORY_NAME_BY_TITLE[title.trim()];

    if (byTitle) {
      return byTitle;
    }
  }

  const normalizedName = normalizeKnownCategoryName(categoryName);
  if (normalizedName) {
    return normalizedName;
  }

  return normalizePunishmentCategoryId(categoryId);
}

export function normalizePunishmentCategoryId(categoryId: string | number | null | undefined) {
  const normalizedName = normalizeKnownCategoryName(categoryId);

  if (normalizedName) {
    return normalizedName as PunishmentCategoryId;
  }

  if (typeof categoryId === 'string' && UUID_PATTERN.test(categoryId.trim())) {
    return categoryId.trim().toLowerCase() as PunishmentCategoryId;
  }

  return DEFAULT_CATEGORY_ID;
}

export function getPunishmentCategoryOption(
  categoryId?: string | number | null,
  categoryName?: string | null,
) {
  const normalizedName = normalizeKnownCategoryName(categoryName) ?? normalizeKnownCategoryName(categoryId) ?? DEFAULT_CATEGORY_ID;
  const categoryOptions = getPunishmentCategoryOptions();
  return categoryOptions.find((option) => option.name === normalizedName) ?? categoryOptions[0];
}

export function getPunishmentCategoryName(
  categoryId?: string | number | null,
  categoryName?: string | null,
): PunishmentCategoryName {
  return getPunishmentCategoryOption(categoryId, categoryName).name;
}

export function getDefaultPunishments(): Punishment[] {
  return getBasePunishmentCatalog().map((punishment) => ({
    ...punishment,
    categoryId: punishment.categoryName,
    scope: 'base' as const,
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  }));
}
