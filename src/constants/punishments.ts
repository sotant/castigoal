import { Punishment, PunishmentCategory } from '@/src/models/types';

type PunishmentCategoryOption = {
  value: Exclude<PunishmentCategory, 'custom'>;
  label: string;
  description: string;
  icon: 'barbell-outline' | 'flash-outline' | 'cash-outline' | 'home-outline';
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

const DEFAULT_PUNISHMENT_CREATED_AT = '2026-01-01T00:00:00.000Z';

export const PUNISHMENT_CATEGORY_OPTIONS: PunishmentCategoryOption[] = [
  {
    value: 'productive',
    label: 'Productividad',
    description: 'Bloques de foco, orden y disciplina digital.',
    icon: 'flash-outline',
    accent: '#2563EB',
    tint: '#EAF2FF',
  },
  {
    value: 'physical',
    label: 'Fisico',
    description: 'Retos de movimiento, ejercicio y energia.',
    icon: 'barbell-outline',
    accent: '#D97706',
    tint: '#FFF4E6',
  },
  {
    value: 'domestic',
    label: 'Hogar',
    description: 'Tareas de orden, limpieza y mantenimiento.',
    icon: 'home-outline',
    accent: '#059669',
    tint: '#EAFBF4',
  },
  {
    value: 'financial',
    label: 'Finanzas',
    description: 'Penalizaciones economicas o de compromiso.',
    icon: 'cash-outline',
    accent: '#7C3AED',
    tint: '#F2EBFF',
  },
];

export const PUNISHMENT_DIFFICULTY_OPTIONS: PunishmentDifficultyOption[] = [
  {
    value: 1,
    label: 'Ligera',
    description: 'Rapida de cumplir y perfecta para castigos cotidianos.',
    accent: '#2563EB',
    tint: '#EDF4FF',
  },
  {
    value: 2,
    label: 'Media',
    description: 'Exige esfuerzo real y deja huella durante el dia.',
    accent: '#D97706',
    tint: '#FFF4E6',
  },
  {
    value: 3,
    label: 'Alta',
    description: 'Mas dura, pensada para fallos importantes.',
    accent: '#DC2626',
    tint: '#FEECEC',
  },
];

export const punishmentCategoryLabels: Record<PunishmentCategory, string> = {
  custom: 'Personal',
  domestic: 'Hogar',
  financial: 'Finanzas',
  physical: 'Fisico',
  productive: 'Productividad',
};

export const defaultPunishments: Punishment[] = [
  {
    id: 'punish-no-social',
    title: 'Sin redes sociales',
    description: 'Pasa 30 minutos sin abrir redes sociales.',
    category: 'productive',
    difficulty: 1,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-steps',
    title: 'Camina 8000 pasos',
    description: 'Completa una caminata de al menos 8000 pasos hoy.',
    category: 'physical',
    difficulty: 1,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-desk',
    title: 'Ordena el escritorio',
    description: 'Deja tu zona de trabajo limpia y ordenada.',
    category: 'domestic',
    difficulty: 1,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-read',
    title: 'Leer 20 paginas',
    description: 'Lee 20 paginas de un libro util o formativo.',
    category: 'productive',
    difficulty: 1,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-no-screens',
    title: 'Dormir sin pantallas',
    description: 'Pasa la ultima hora del dia sin movil ni ordenador.',
    category: 'productive',
    difficulty: 1,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-pushups',
    title: '50 flexiones',
    description: 'Completa 50 flexiones en una sola tanda o en series.',
    category: 'physical',
    difficulty: 2,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-clean-room',
    title: 'Limpia una habitacion',
    description: 'Ordena y limpia por completo una habitacion de tu casa.',
    category: 'domestic',
    difficulty: 2,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-donate-5',
    title: 'Donar 5 EUR',
    description: 'Haz una donacion de 5 EUR a una causa que apoyes.',
    category: 'financial',
    difficulty: 2,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-no-coffee',
    title: 'Sin cafe manana',
    description: 'Manten una manana completa sin cafe ni bebidas energizantes.',
    category: 'productive',
    difficulty: 2,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-cook',
    title: 'Preparar comida sana',
    description: 'Cocina una comida completa y saludable en casa.',
    category: 'domestic',
    difficulty: 2,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-journal',
    title: 'Escribir reflexion',
    description: 'Escribe 300 palabras sobre por que fallaste y que haras distinto.',
    category: 'productive',
    difficulty: 2,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-plank',
    title: 'Plancha 3 minutos',
    description: 'Haz una plancha acumulada de 3 minutos.',
    category: 'physical',
    difficulty: 2,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-deep-work',
    title: 'Bloque profundo',
    description: 'Haz 45 minutos de trabajo profundo sin interrupciones.',
    category: 'productive',
    difficulty: 3,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-run',
    title: 'Correr 5 km',
    description: 'Completa una carrera continua o combinada de 5 kilometros.',
    category: 'physical',
    difficulty: 3,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-kitchen',
    title: 'Limpieza profunda cocina',
    description: 'Haz una limpieza a fondo de la cocina o el bano.',
    category: 'domestic',
    difficulty: 3,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-donate-15',
    title: 'Donar 15 EUR',
    description: 'Haz una donacion de 15 EUR a una causa que apoyes.',
    category: 'financial',
    difficulty: 3,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-no-streaming',
    title: 'Sin streaming 48h',
    description: 'Pasa 48 horas sin series, peliculas ni videos de ocio.',
    category: 'productive',
    difficulty: 3,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-mobility',
    title: 'Sesion de movilidad 40 min',
    description: 'Completa 40 minutos de movilidad, estiramientos o yoga.',
    category: 'physical',
    difficulty: 3,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-inbox-zero',
    title: 'Vaciar bandeja pendiente',
    description: 'Resuelve o archiva todos los pendientes pequenos acumulados.',
    category: 'productive',
    difficulty: 3,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
  {
    id: 'punish-laundry',
    title: 'Lavar y doblar ropa',
    description: 'Pon una lavadora y deja toda la ropa doblada y guardada.',
    category: 'domestic',
    difficulty: 2,
    scope: 'base',
    createdAt: DEFAULT_PUNISHMENT_CREATED_AT,
  },
];
