import { AssignedPunishment, Checkin, Goal, GoalEvaluation, Punishment, UserSettings } from '@/src/models/types';

export interface HomeGoalSummary {
  goalId: string;
  title: string;
  description?: string;
  active: boolean;
  completionRate: number;
  currentStreak: number;
  bestStreak: number;
  todayStatus?: Checkin['status'];
  daysUntilStart: number;
  remainingDays: number;
}

export interface PendingPunishmentPreview {
  assignedId: string;
  goalId: string;
  punishmentId: string;
  dueDate: string;
  status: AssignedPunishment['status'];
  punishment: Punishment;
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