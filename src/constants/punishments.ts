import { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

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

const CATEGORY_METADATA = {
  tarea: {
    accent: '#2563EB',
    description: 'Recados rápidos, orden de pendientes y pequeñas obligaciones.',
    icon: 'checkmark-done-outline',
    label: 'Tarea',
    tint: '#EAF2FF',
  },
  estudio: {
    accent: '#4F46E5',
    description: 'Lectura, escritura, repaso y aprendizaje con foco.',
    icon: 'book-outline',
    label: 'Estudio',
    tint: '#EEF2FF',
  },
  fisico: {
    accent: '#D97706',
    description: 'Movimiento, resistencia y retos corporales.',
    icon: 'barbell-outline',
    label: 'Físico',
    tint: '#FFF4E6',
  },
  social: {
    accent: '#0F766E',
    description: 'Interacciones, favores y compromisos con otras personas.',
    icon: 'people-outline',
    label: 'Social',
    tint: '#E8FFFB',
  },
  finanzas: {
    accent: '#7C3AED',
    description: 'Costes económicos o renuncias con impacto monetario.',
    icon: 'cash-outline',
    label: 'Finanzas',
    tint: '#F2EBFF',
  },
  entretenimiento: {
    accent: '#DB2777',
    description: 'Límites al ocio, pantallas y consumo recreativo.',
    icon: 'game-controller-outline',
    label: 'Entretenimiento',
    tint: '#FCE7F3',
  },
  salud: {
    accent: '#DC2626',
    description: 'Descanso, movilidad, higiene del sueño y bienestar.',
    icon: 'heart-outline',
    label: 'Salud',
    tint: '#FEECEC',
  },
  trabajo: {
    accent: '#1D4ED8',
    description: 'Bloques profundos, ejecución y tareas profesionales.',
    icon: 'briefcase-outline',
    label: 'Trabajo',
    tint: '#E8F1FF',
  },
  nutricion: {
    accent: '#059669',
    description: 'Comidas, hidratación y decisiones alimentarias.',
    icon: 'restaurant-outline',
    label: 'Nutrición',
    tint: '#EAFBF4',
  },
  hogar: {
    accent: '#0F766E',
    description: 'Limpieza, orden y mantenimiento doméstico.',
    icon: 'home-outline',
    label: 'Hogar',
    tint: '#ECFDF5',
  },
  otros: {
    accent: '#475467',
    description: 'Categoría comodín para casos no previstos o mixtos.',
    icon: 'apps-outline',
    label: 'Otros',
    tint: '#F3F4F6',
  },
} as const satisfies Record<
  PunishmentCategoryName,
  Omit<PunishmentCategoryOption, 'name' | 'value'>
>;

const DEFAULT_PUNISHMENT_CREATED_AT = '2026-01-01T00:00:00.000Z';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COMBINING_MARKS_REGEX = /[\u0300-\u036f]/g;

export const PUNISHMENT_CATEGORY_OPTIONS: PunishmentCategoryOption[] = (
  Object.entries(CATEGORY_METADATA) as [PunishmentCategoryName, (typeof CATEGORY_METADATA)[PunishmentCategoryName]][]
).map(([name, metadata]) => ({
  ...metadata,
  name,
  value: name,
}));

export const DEFAULT_CATEGORY_ID = PUNISHMENT_CATEGORY_OPTIONS[0].value;

export const PUNISHMENT_DIFFICULTY_OPTIONS: PunishmentDifficultyOption[] = [
  {
    value: 1,
    label: 'Ligera',
    description: 'Rápida de cumplir y perfecta para castigos cotidianos.',
    accent: '#2563EB',
    tint: '#EDF4FF',
  },
  {
    value: 2,
    label: 'Media',
    description: 'Exige esfuerzo real y deja huella durante el día.',
    accent: '#D97706',
    tint: '#FFF4E6',
  },
  {
    value: 3,
    label: 'Alta',
    description: 'Más dura, pensada para fallos importantes.',
    accent: '#DC2626',
    tint: '#FEECEC',
  },
];

export const punishmentCategoryLabels: Record<PunishmentCategoryName, string> = Object.fromEntries(
  PUNISHMENT_CATEGORY_OPTIONS.map((option) => [option.name, option.label]),
) as Record<PunishmentCategoryName, string>;

export const punishmentCategoryNamesById: Record<PunishmentCategoryName, PunishmentCategoryName> = Object.fromEntries(
  PUNISHMENT_CATEGORY_OPTIONS.map((option) => [option.name, option.name]),
) as Record<PunishmentCategoryName, PunishmentCategoryName>;

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
  'Escribir reflexión': 'estudio',
  'Lavar y doblar ropa': 'hogar',
  'Leer 20 paginas': 'estudio',
  'Leer 20 páginas': 'estudio',
  'Limpia una habitacion': 'hogar',
  'Limpia una habitación': 'hogar',
  'Limpieza profunda cocina': 'hogar',
  'Ordena el escritorio': 'trabajo',
  'Plancha 3 minutos': 'fisico',
  'Preparar comida sana': 'nutricion',
  'Sesion de movilidad 40 min': 'salud',
  'Sesión de movilidad 40 min': 'salud',
  'Sin cafe manana': 'salud',
  'Sin café mañana': 'salud',
  'Sin redes sociales': 'entretenimiento',
  'Sin streaming 48h': 'entretenimiento',
  'Vaciar bandeja pendiente': 'tarea',
};

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
  return PUNISHMENT_CATEGORY_OPTIONS.find((option) => option.name === normalizedName) ?? PUNISHMENT_CATEGORY_OPTIONS[0];
}

export function getPunishmentCategoryName(
  categoryId?: string | number | null,
  categoryName?: string | null,
): PunishmentCategoryName {
  return getPunishmentCategoryOption(categoryId, categoryName).name;
}

export const defaultPunishments: Punishment[] = [
  {
    id: 'punish-no-social',
    title: 'Sin redes sociales',
    description: 'Pasa 30 minutos sin abrir redes sociales.',
    categoryId: 'entretenimiento',
    categoryName: 'entretenimiento',
    difficulty: 1,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-steps',
    title: 'Camina 8000 pasos',
    description: 'Completa una caminata de al menos 8000 pasos hoy.',
    categoryId: 'fisico',
    categoryName: 'fisico',
    difficulty: 1,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-desk',
    title: 'Ordena el escritorio',
    description: 'Deja tu zona de trabajo limpia y ordenada.',
    categoryId: 'trabajo',
    categoryName: 'trabajo',
    difficulty: 1,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-read',
    title: 'Leer 20 páginas',
    description: 'Lee 20 páginas de un libro útil o formativo.',
    categoryId: 'estudio',
    categoryName: 'estudio',
    difficulty: 1,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-no-screens',
    title: 'Dormir sin pantallas',
    description: 'Pasa la última hora del día sin móvil ni ordenador.',
    categoryId: 'salud',
    categoryName: 'salud',
    difficulty: 1,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-pushups',
    title: '50 flexiones',
    description: 'Completa 50 flexiones en una sola tanda o en series.',
    categoryId: 'fisico',
    categoryName: 'fisico',
    difficulty: 2,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-clean-room',
    title: 'Limpia una habitación',
    description: 'Ordena y limpia por completo una habitación de tu casa.',
    categoryId: 'hogar',
    categoryName: 'hogar',
    difficulty: 2,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-donate-5',
    title: 'Donar 5 EUR',
    description: 'Haz una donación de 5 EUR a una causa que apoyes.',
    categoryId: 'finanzas',
    categoryName: 'finanzas',
    difficulty: 2,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-no-coffee',
    title: 'Sin café mañana',
    description: 'Mantén una mañana completa sin café ni bebidas energizantes.',
    categoryId: 'salud',
    categoryName: 'salud',
    difficulty: 2,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-cook',
    title: 'Preparar comida sana',
    description: 'Cocina una comida completa y saludable en casa.',
    categoryId: 'nutricion',
    categoryName: 'nutricion',
    difficulty: 2,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-journal',
    title: 'Escribir reflexión',
    description: 'Escribe 300 palabras sobre por qué fallaste y qué harás distinto.',
    categoryId: 'estudio',
    categoryName: 'estudio',
    difficulty: 2,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-plank',
    title: 'Plancha 3 minutos',
    description: 'Haz una plancha acumulada de 3 minutos.',
    categoryId: 'fisico',
    categoryName: 'fisico',
    difficulty: 2,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-deep-work',
    title: 'Bloque profundo',
    description: 'Haz 45 minutos de trabajo profundo sin interrupciones.',
    categoryId: 'trabajo',
    categoryName: 'trabajo',
    difficulty: 3,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-run',
    title: 'Correr 5 km',
    description: 'Completa una carrera continua o combinada de 5 kilómetros.',
    categoryId: 'fisico',
    categoryName: 'fisico',
    difficulty: 3,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-kitchen',
    title: 'Limpieza profunda cocina',
    description: 'Haz una limpieza a fondo de la cocina o el baño.',
    categoryId: 'hogar',
    categoryName: 'hogar',
    difficulty: 3,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-donate-15',
    title: 'Donar 15 EUR',
    description: 'Haz una donación de 15 EUR a una causa que apoyes.',
    categoryId: 'finanzas',
    categoryName: 'finanzas',
    difficulty: 3,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-no-streaming',
    title: 'Sin streaming 48h',
    description: 'Pasa 48 horas sin series, películas ni vídeos de ocio.',
    categoryId: 'entretenimiento',
    categoryName: 'entretenimiento',
    difficulty: 3,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-mobility',
    title: 'Sesión de movilidad 40 min',
    description: 'Completa 40 minutos de movilidad, estiramientos o yoga.',
    categoryId: 'salud',
    categoryName: 'salud',
    difficulty: 3,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-inbox-zero',
    title: 'Vaciar bandeja pendiente',
    description: 'Resuelve o archiva todos los pendientes pequeños acumulados.',
    categoryId: 'tarea',
    categoryName: 'tarea',
    difficulty: 3,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-laundry',
    title: 'Lavar y doblar ropa',
    description: 'Pon una lavadora y deja toda la ropa doblada y guardada.',
    categoryId: 'hogar',
    categoryName: 'hogar',
    difficulty: 2,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
];

export function normalizePunishmentTextForComparison(value: string) {
  return value
    .normalize('NFD')
    .replace(COMBINING_MARKS_REGEX, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('es');
}

export function getBasePunishmentCanonicalKey(
  title: string,
  categoryName: PunishmentCategoryName,
  difficulty: Punishment['difficulty'],
) {
  return `${normalizePunishmentTextForComparison(title)}:${categoryName}:${difficulty}`;
}

const canonicalBasePunishmentsByKey = new Map(
  defaultPunishments.map((punishment) => [
    getBasePunishmentCanonicalKey(punishment.title, punishment.categoryName, punishment.difficulty),
    punishment,
  ]),
);

export function findCanonicalBasePunishment(
  title: string,
  categoryName: PunishmentCategoryName,
  difficulty: Punishment['difficulty'],
) {
  return canonicalBasePunishmentsByKey.get(getBasePunishmentCanonicalKey(title, categoryName, difficulty));
}
