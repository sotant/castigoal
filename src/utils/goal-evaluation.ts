import {
  AssignedPunishment,
  Checkin,
  Goal,
  GoalEvaluation,
  Punishment,
} from '@/src/models/types';
import { addDays, diffInDays, enumerateDates, startOfToday, toISODate } from '@/src/utils/date';

export function getGoalDeadline(goal: Goal) {
  return addDays(goal.startDate, Math.max(goal.targetDays, 1) - 1);
}

export function hasGoalDeadlinePassed(goal: Goal, referenceDate = startOfToday()) {
  return toISODate(referenceDate) >= getGoalDeadline(goal);
}

export function getGoalRemainingDays(goal: Goal, referenceDate = startOfToday()) {
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
  const windowEnd = requestedDate > deadline ? deadline : requestedDate;
  const windowStart = goal.startDate;
  const plannedDays = Math.max(diffInDays(windowStart, windowEnd) + 1, 1);
  const periodKey = `${goal.id}:${windowStart}:${windowEnd}:${plannedDays}`;

  return {
    periodKey,
    windowStart,
    windowEnd,
    plannedDays,
  };
}

export function evaluateGoalPeriod(goal: Goal, checkins: Checkin[], referenceDate = startOfToday()): GoalEvaluation {
  const { periodKey, windowStart, windowEnd, plannedDays } = getEvaluationWindow(goal, referenceDate);
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
    completedDays,
    completionRate,
    passed: completionRate >= goal.minimumSuccessRate,
  };
}

export function generateRandomPunishment(punishments: Punishment[], seed?: string) {
  if (punishments.length === 0) {
    return undefined;
  }

  const numericSeed = Array.from(seed ?? `${Date.now()}`).reduce((total, char) => total + char.charCodeAt(0), 0);
  return punishments[numericSeed % punishments.length];
}

export function assignPunishment(
  goal: Goal,
  punishment: Punishment,
  periodKey: string,
  dueDate: string,
): AssignedPunishment {
  const now = new Date().toISOString();

  return {
    id: `${goal.id}-${punishment.id}-${periodKey}`,
    goalId: goal.id,
    punishmentId: punishment.id,
    assignedAt: now,
    dueDate,
    status: 'pending',
    periodKey,
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
  const goalCheckins = getGoalCheckins(goalId, checkins)
    .sort((left, right) => left.date.localeCompare(right.date));

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
