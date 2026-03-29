import {
  AssignedPunishment,
  Checkin,
  Goal,
  GoalEvaluation,
  GoalOutcome,
  GoalPunishmentConfig,
  Punishment,
} from '@/src/models/types';
import { getPunishmentSystemKey } from '@/src/constants/punishments';
import { getCurrentLanguage } from '@/src/i18n';
import { addDays, diffInDays, enumerateDates, startOfToday, toISODate } from '@/src/utils/date';

export const DEFAULT_GOAL_PUNISHMENT_CONFIG: GoalPunishmentConfig = {
  categoryMode: 'all',
  categoryNames: [],
  scope: 'base',
};

function clampPositiveInt(value: number) {
  return Math.max(1, Math.round(value));
}

function hashSeed(seed: string) {
  let hash1 = 0xdeadbeef ^ seed.length;
  let hash2 = 0x41c6ce57 ^ seed.length;

  for (let index = 0; index < seed.length; index += 1) {
    const charCode = seed.charCodeAt(index);
    hash1 = Math.imul(hash1 ^ charCode, 2654435761);
    hash2 = Math.imul(hash2 ^ charCode, 1597334677);
  }

  hash1 = Math.imul(hash1 ^ (hash1 >>> 16), 2246822507) ^ Math.imul(hash2 ^ (hash2 >>> 13), 3266489909);
  hash2 = Math.imul(hash2 ^ (hash2 >>> 16), 2246822507) ^ Math.imul(hash1 ^ (hash1 >>> 13), 3266489909);

  return [hash1 >>> 0, hash2 >>> 0];
}

export function buildDeterministicUuid(seed: string) {
  const [hash1, hash2] = hashSeed(seed);
  const [hash3, hash4] = hashSeed(`${seed}:salt`);
  const hex = [hash1, hash2, hash3, hash4].map((part) => part.toString(16).padStart(8, '0')).join('');
  const chars = hex.split('');

  chars[12] = '4';
  chars[16] = ((parseInt(chars[16], 16) & 0x3) | 0x8).toString(16);

  return `${chars.slice(0, 8).join('')}-${chars.slice(8, 12).join('')}-${chars.slice(12, 16).join('')}-${chars.slice(16, 20).join('')}-${chars.slice(20, 32).join('')}`;
}

export function normalizeGoalPunishmentConfig(config?: Partial<GoalPunishmentConfig> | null): GoalPunishmentConfig {
  const scope = config?.scope ?? DEFAULT_GOAL_PUNISHMENT_CONFIG.scope;
  const categoryMode = config?.categoryMode ?? DEFAULT_GOAL_PUNISHMENT_CONFIG.categoryMode;
  const categoryNames = Array.from(new Set(config?.categoryNames ?? DEFAULT_GOAL_PUNISHMENT_CONFIG.categoryNames));

  return {
    categoryMode,
    categoryNames: categoryMode === 'all' ? [] : categoryNames,
    scope,
  };
}

export function isGoalActive(goal: Goal) {
  return goal.lifecycleStatus === 'active';
}

export function isGoalClosed(goal: Goal) {
  return goal.lifecycleStatus === 'closed';
}

export function isGoalResolved(goal: Goal) {
  return goal.resolutionStatus === 'passed' || goal.resolutionStatus === 'failed';
}

export function getGoalDeadline(goal: Goal) {
  return addDays(goal.startDate, Math.max(goal.targetDays, 1) - 1);
}

export function hasGoalDeadlinePassed(goal: Goal, referenceDate = startOfToday()) {
  return toISODate(referenceDate) > getGoalDeadline(goal);
}

export function getGoalRemainingDays(goal: Goal, referenceDate = startOfToday()) {
  if (isGoalClosed(goal)) {
    return 0;
  }

  const today = toISODate(referenceDate);
  const deadline = getGoalDeadline(goal);

  if (today > deadline) {
    return 0;
  }

  return diffInDays(today, deadline) + 1;
}

export function getGoalDaysUntilStart(goal: Goal, referenceDate = startOfToday()) {
  const today = toISODate(referenceDate);

  if (today >= goal.startDate) {
    return 0;
  }

  return diffInDays(today, goal.startDate);
}

export function calculateCompletionRate(completedDays: number, plannedDays: number): number {
  if (plannedDays <= 0) {
    return 0;
  }

  return Math.round((completedDays / plannedDays) * 100);
}

export function getGoalRequiredDays(goal: Pick<Goal, 'targetDays' | 'minimumSuccessRate'>) {
  return clampPositiveInt(Math.ceil((Math.max(goal.targetDays, 1) * goal.minimumSuccessRate) / 100));
}

export function getGoalCheckins(goalId: string, checkins: Checkin[], start?: string, end?: string) {
  return checkins.filter((checkin) => {
    if (checkin.goalId !== goalId) {
      return false;
    }

    if (start && checkin.date < start) {
      return false;
    }

    if (end && checkin.date > end) {
      return false;
    }

    return true;
  });
}

export function getEvaluationWindow(goal: Goal, referenceDate = startOfToday()) {
  const deadline = getGoalDeadline(goal);
  const requestedDate = toISODate(referenceDate);
  const closedOn = goal.closedOn ?? null;
  const rawWindowEnd = closedOn ?? (requestedDate > deadline ? deadline : requestedDate);
  const windowEnd = rawWindowEnd < goal.startDate ? goal.startDate : rawWindowEnd;
  const windowStart = goal.startDate;
  const plannedDays = Math.max(diffInDays(windowStart, windowEnd) + 1, 1);
  const periodKey = `${goal.id}:${windowStart}:${windowEnd}:${plannedDays}`;

  return {
    periodKey,
    plannedDays,
    windowEnd,
    windowStart,
  };
}

export function evaluateGoalPeriod(goal: Goal, checkins: Checkin[], referenceDate = startOfToday()): GoalEvaluation {
  const { periodKey, windowStart, windowEnd, plannedDays } = getEvaluationWindow(goal, referenceDate);
  const requiredDays = getGoalRequiredDays(goal);
  const checkinsByDate = new Map(
    getGoalCheckins(goal.id, checkins, windowStart, windowEnd).map((checkin) => [checkin.date, checkin]),
  );

  const completedDays = enumerateDates(windowStart, windowEnd).reduce((total, day) => {
    return total + (checkinsByDate.get(day)?.status === 'completed' ? 1 : 0);
  }, 0);

  const completionRate = calculateCompletionRate(completedDays, plannedDays);

  return {
    goalId: goal.id,
    periodKey,
    windowStart,
    windowEnd,
    plannedDays,
    requiredDays,
    completedDays,
    completionRate,
    passed: completedDays >= requiredDays,
  };
}

export function mapGoalOutcomeToEvaluation(outcome: GoalOutcome): GoalEvaluation {
  return {
    goalId: outcome.goalId,
    periodKey: outcome.periodKey,
    windowStart: outcome.windowStart,
    windowEnd: outcome.windowEnd,
    plannedDays: outcome.plannedDays,
    requiredDays: outcome.requiredDays,
    completedDays: outcome.completedDays,
    completionRate: outcome.completionRate,
    passed: outcome.passed,
  };
}

function getPunishmentStableKey(punishment: Punishment) {
  if (punishment.scope === 'personal') {
    return `personal:${punishment.id}`;
  }

  return `base:${getPunishmentSystemKey(punishment)}`;
}

export function getEligiblePunishments(goal: Goal, punishments: Punishment[]) {
  const config = normalizeGoalPunishmentConfig(goal.punishmentConfig);
  const allowedCategories = new Set(config.categoryNames);

  return punishments
    .filter((punishment) => {
      if (config.scope === 'base' && punishment.scope !== 'base') {
        return false;
      }

      if (config.scope === 'personal' && punishment.scope !== 'personal') {
        return false;
      }

      if (config.categoryMode === 'selected' && !allowedCategories.has(punishment.categoryName)) {
        return false;
      }

      return true;
    })
    .sort((left, right) => getPunishmentStableKey(left).localeCompare(getPunishmentStableKey(right), getCurrentLanguage()));
}

export function selectDeterministicPunishment(punishments: Punishment[], seed: string) {
  if (punishments.length === 0) {
    return undefined;
  }

  const [hash] = hashSeed(seed);
  return punishments[hash % punishments.length];
}

export function buildAssignedPunishmentId(goalId: string, periodKey: string) {
  return buildDeterministicUuid(`assigned-punishment:${goalId}:${periodKey}`);
}

export function assignPunishment(goal: Goal, punishment: Punishment, periodKey: string): AssignedPunishment {
  const now = new Date().toISOString();

  return {
    id: buildAssignedPunishmentId(goal.id, periodKey),
    goalId: goal.id,
    punishmentId: punishment.id,
    assignedAt: now,
    status: 'pending',
    periodKey,
  };
}

export function buildGoalOutcomeId(goalId: string, periodKey: string) {
  return buildDeterministicUuid(`goal-outcome:${goalId}:${periodKey}`);
}

export function buildGoalOutcome(input: {
  assignedPunishmentId?: string;
  evaluation: GoalEvaluation;
  evaluatedAt: string;
  goal: Goal;
  resolutionSource: GoalOutcome['resolutionSource'];
}): GoalOutcome {
  return {
    id: buildGoalOutcomeId(input.goal.id, input.evaluation.periodKey),
    goalId: input.goal.id,
    periodKey: input.evaluation.periodKey,
    windowStart: input.evaluation.windowStart,
    windowEnd: input.evaluation.windowEnd,
    plannedDays: input.evaluation.plannedDays,
    targetDays: input.goal.targetDays,
    requiredDays: input.evaluation.requiredDays,
    completedDays: input.evaluation.completedDays,
    completionRate: input.evaluation.completionRate,
    minimumSuccessRate: input.goal.minimumSuccessRate,
    passed: input.evaluation.passed,
    assignedPunishmentId: input.assignedPunishmentId,
    resolutionSource: input.resolutionSource,
    evaluatedAt: input.evaluatedAt,
  };
}

export function completePunishment(assignedPunishment: AssignedPunishment): AssignedPunishment {
  return {
    ...assignedPunishment,
    status: 'completed',
    completedAt: new Date().toISOString(),
  };
}

export function getCurrentStreak(goalId: string, checkins: Checkin[], referenceDate = startOfToday()) {
  const goalCheckins = getGoalCheckins(goalId, checkins);
  const checkinsByDate = new Map(goalCheckins.map((checkin) => [checkin.date, checkin.status]));
  let streak = 0;
  let cursor = toISODate(referenceDate);

  while (checkinsByDate.get(cursor) === 'completed') {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export function getBestStreak(goalId: string, checkins: Checkin[]) {
  const goalCheckins = getGoalCheckins(goalId, checkins).sort((left, right) => left.date.localeCompare(right.date));

  let best = 0;
  let current = 0;
  let previousDate: string | undefined;

  for (const checkin of goalCheckins) {
    const consecutive = previousDate ? addDays(previousDate, 1) === checkin.date : false;

    if (checkin.status === 'completed') {
      current = consecutive ? current + 1 : 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }

    previousDate = checkin.date;
  }

  return best;
}
