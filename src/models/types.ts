export type CheckinStatus = 'completed' | 'missed';
export type PunishmentCategoryId = string;
export type PunishmentCategoryName =
  | 'tarea'
  | 'estudio'
  | 'fisico'
  | 'social'
  | 'finanzas'
  | 'entretenimiento'
  | 'salud'
  | 'trabajo'
  | 'nutricion'
  | 'hogar'
  | 'otros';
export type PunishmentScope = 'base' | 'personal';
export type AssignedPunishmentStatus = 'pending' | 'completed';
export type GoalLifecycleStatus = 'active' | 'closed';
export type GoalResolutionStatus = 'pending' | 'passed' | 'failed';
export type GoalResolutionSource = 'manual' | 'expired';
export type GoalPunishmentScope = 'base' | 'personal' | 'both';
export type GoalPunishmentCategoryMode = 'all' | 'selected';

export interface GoalPunishmentConfig {
  categoryMode: GoalPunishmentCategoryMode;
  categoryNames: PunishmentCategoryName[];
  scope: GoalPunishmentScope;
}

export interface User {
  id: string;
  name: string;
  onboardingCompleted: boolean;
  createdAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  targetDays: number;
  minimumSuccessRate: number;
  active: boolean;
  lifecycleStatus: GoalLifecycleStatus;
  resolutionStatus: GoalResolutionStatus;
  closedOn?: string;
  resolvedAt?: string;
  resolutionSource?: GoalResolutionSource;
  punishmentConfig: GoalPunishmentConfig;
  createdAt: string;
  updatedAt: string;
}

export interface Checkin {
  id: string;
  goalId: string;
  date: string;
  status: CheckinStatus;
  createdAt: string;
}

export interface Punishment {
  id: string;
  title: string;
  description: string;
  categoryId: PunishmentCategoryId;
  categoryName: PunishmentCategoryName;
  difficulty: 1 | 2 | 3;
  scope: PunishmentScope;
  createdAt: string;
}

export interface PunishmentMutationInput {
  title: string;
  description: string;
  categoryName: PunishmentCategoryName;
  difficulty: 1 | 2 | 3;
}

export interface AssignedPunishment {
  id: string;
  goalId: string;
  punishmentId: string;
  assignedAt: string;
  dueDate: string;
  status: AssignedPunishmentStatus;
  completedAt?: string;
  periodKey: string;
}

export interface UserSettings {
  remindersEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  pendingPunishmentReminderEnabled: boolean;
}

export interface GoalEvaluation {
  goalId: string;
  periodKey: string;
  windowStart: string;
  windowEnd: string;
  plannedDays: number;
  requiredDays: number;
  completedDays: number;
  completionRate: number;
  passed: boolean;
}

export interface GoalOutcome {
  id: string;
  goalId: string;
  periodKey: string;
  windowStart: string;
  windowEnd: string;
  plannedDays: number;
  targetDays: number;
  requiredDays: number;
  completedDays: number;
  completionRate: number;
  minimumSuccessRate: number;
  passed: boolean;
  assignedPunishmentId?: string;
  resolutionSource: GoalResolutionSource;
  evaluatedAt: string;
}

export type {
  AppBootstrapData,
  AssignedPunishmentDetail,
  CompletedPunishmentHistoryEntry,
  GoalCalendarDay,
  GoalDetailSummary,
  HomeGoalSummary,
  HomeSummary,
  PendingAssignedPunishmentSummary,
  PendingPunishmentPreview,
  StatsSummary,
} from '@/src/contracts/derived-data';
