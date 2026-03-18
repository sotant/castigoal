import { AssignedPunishment, Checkin, Goal, GoalEvaluation, Punishment, UserSettings } from '@/src/models/types';

export interface GoalRecentDay {
  date?: string;
  dayNumber?: number;
  status: 'completed' | 'pending' | 'missed' | 'unavailable';
}

export interface HomeGoalSummary {
  goalId: string;
  title: string;
  description?: string;
  active: boolean;
  passed: boolean;
  targetDays: number;
  completedDays: number;
  completionRate: number;
  currentStreak: number;
  bestStreak: number;
  todayStatus?: Checkin['status'];
  daysUntilStart: number;
  remainingDays: number;
  recentDays: GoalRecentDay[];
}

export interface PendingPunishmentPreview {
  assignedId: string;
  goalId: string;
  punishmentId: string;
  dueDate: string;
  status: AssignedPunishment['status'];
  punishment: Punishment;
}

export interface PendingAssignedPunishmentSummary {
  assignedId: string;
  goalId: string;
  goalTitle: string;
  punishmentId: string;
  assignedAt: string;
  dueDate: string;
  status: AssignedPunishment['status'];
  punishment: Punishment;
}

export interface CompletedPunishmentHistoryEntry {
  id: string;
  assignedPunishmentId?: string;
  goalId?: string;
  goalTitle?: string;
  punishmentId?: string;
  punishmentTitle: string;
  punishmentDescription: string;
  completedAt: string;
}

export interface HomeSummary {
  activeGoalsCount: number;
  pendingPunishmentsCount: number;
  latestPending?: PendingPunishmentPreview;
  goalSummaries: HomeGoalSummary[];
}

export interface StatsSummary {
  averageRate: number;
  completionRatio: number;
  goalsActiveCount: number;
  completedPunishments: number;
  totalCheckins: number;
}

export interface GoalCalendarDay {
  date: string;
  dayNumber: number;
  inMonth: boolean;
  status?: Checkin['status'];
}

export interface GoalDetailSummary {
  goalId: string;
  deadline: string;
  daysUntilStart: number;
  remainingDays: number;
  scheduleStatus: string;
  currentStreak: number;
  bestStreak: number;
  recentCheckins: Checkin[];
  evaluation: GoalEvaluation;
}

export interface AssignedPunishmentDetail {
  assigned: AssignedPunishment;
  punishment: Punishment;
}

export interface AppBootstrapData {
  goals: Goal[];
  goalEvaluations: Record<string, GoalEvaluation>;
  homeSummary: HomeSummary;
  userSettings: UserSettings;
}
