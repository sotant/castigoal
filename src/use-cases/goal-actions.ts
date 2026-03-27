import { GoalDetailSummary, GoalEvaluation, Goal, HomeSummary, StatsSummary } from '@/src/models/types';
import {
  clearGoalCheckinRecord,
  createGoalRecord,
  finalizeGoalRecord,
  GoalInput,
  loadCheckinsInRange,
  loadGoalCheckinHistory,
  loadGoalEvaluations,
  loadHomeSummary,
  loadStatsSummary,
  recordGoalCheckinRecord,
  RecordCheckinResult,
  deleteGoalRecord,
  updateGoalRecord,
} from '@/src/services/progress-service';
import { getBestStreak, getCurrentStreak, getGoalDaysUntilStart, getGoalDeadline, getGoalRemainingDays, getGoalRequiredDays } from '@/src/utils/goal-evaluation';
import { startOfToday, toISODate } from '@/src/utils/date';

function buildFallbackEvaluation(goal: Goal, evaluation?: GoalEvaluation): GoalEvaluation {
  return (
    evaluation ?? {
      goalId: goal.id,
      periodKey: '',
      windowStart: goal.startDate,
      windowEnd: goal.startDate,
      plannedDays: 0,
      requiredDays: getGoalRequiredDays(goal),
      completedDays: 0,
      completionRate: 0,
      passed: false,
    }
  );
}

function buildScheduleStatus(goal: Goal, referenceDate = startOfToday()) {
  const daysUntilStart = getGoalDaysUntilStart(goal, referenceDate);
  const remainingDays = getGoalRemainingDays(goal, referenceDate);

  if (daysUntilStart > 0) {
    return daysUntilStart === 1 ? 'Empieza manana.' : `Empieza en ${daysUntilStart} dias.`;
  }

  if (remainingDays > 0) {
    return remainingDays === 1 ? 'Queda 1 dia para cerrar el plazo.' : `Quedan ${remainingDays} dias para cerrar el plazo.`;
  }

  return 'El plazo configurado ya ha terminado.';
}

export async function createGoalUseCase(input: GoalInput) {
  const goal = await createGoalRecord(input);
  const [goalEvaluations, homeSummary, statsSummary] = await Promise.all([
    loadGoalEvaluations(),
    loadHomeSummary(),
    loadStatsSummary(),
  ]);

  return {
    goal,
    goalEvaluations,
    homeSummary,
    statsSummary,
  };
}

export async function updateGoalUseCase(goalId: string, input: GoalInput) {
  const goal = await updateGoalRecord(goalId, input);
  const [goalEvaluations, homeSummary, statsSummary] = await Promise.all([
    loadGoalEvaluations(),
    loadHomeSummary(),
    loadStatsSummary(),
  ]);

  return {
    goal,
    goalEvaluations,
    homeSummary,
    statsSummary,
  };
}

export async function deleteGoalUseCase(goalId: string) {
  await deleteGoalRecord(goalId);
  const [goalEvaluations, homeSummary, statsSummary] = await Promise.all([
    loadGoalEvaluations(),
    loadHomeSummary(),
    loadStatsSummary(),
  ]);

  return {
    goalEvaluations,
    goalId,
    homeSummary,
    statsSummary,
  };
}

export async function finalizeGoalUseCase(goalId: string) {
  const result = await finalizeGoalRecord(goalId);
  const [goalEvaluations, homeSummary, statsSummary] = await Promise.all([
    loadGoalEvaluations(),
    loadHomeSummary(),
    loadStatsSummary(),
  ]);

  return {
    assignedPunishment: result.assignedPunishment,
    evaluation: result.evaluation,
    goal: result.goal,
    goalEvaluations,
    homeSummary,
    statsSummary,
  };
}

export async function loadHomeSummaryUseCase(referenceDate?: string) {
  return loadHomeSummary(referenceDate);
}

export async function loadCheckinsInRangeUseCase(input: { startDate: string; endDate: string }) {
  return loadCheckinsInRange(input.startDate, input.endDate);
}

export async function recordGoalCheckinUseCase(input: {
  date?: string;
  goalId: string;
  status: 'completed' | 'missed';
}): Promise<
  RecordCheckinResult & {
    date: string;
  }
> {
  const date = toISODate(input.date ?? startOfToday());
  const result = await recordGoalCheckinRecord({
    date,
    goalId: input.goalId,
    status: input.status,
  });

  return {
    ...result,
    date,
    evaluation: result.goalEvaluations[input.goalId] ?? result.evaluation,
  };
}

export async function clearGoalCheckinUseCase(input: {
  date?: string;
  goalId: string;
}): Promise<{
  date: string;
  evaluation: GoalEvaluation;
  goalEvaluations: Record<string, GoalEvaluation>;
  homeSummary: HomeSummary;
  removedAssignedPunishmentId?: string;
  statsSummary: StatsSummary;
}> {
  const date = toISODate(input.date ?? startOfToday());
  const result = await clearGoalCheckinRecord({
    date,
    goalId: input.goalId,
  });

  return {
    ...result,
    date,
    evaluation: result.goalEvaluations[input.goalId] ?? result.evaluation,
  };
}

export async function loadGoalDetailSummaryUseCase(goal: Goal, evaluation?: GoalEvaluation): Promise<GoalDetailSummary> {
  const checkins = await loadGoalCheckinHistory(goal.id);

  return {
    goalId: goal.id,
    deadline: getGoalDeadline(goal),
    daysUntilStart: getGoalDaysUntilStart(goal),
    remainingDays: getGoalRemainingDays(goal),
    scheduleStatus: buildScheduleStatus(goal),
    currentStreak: getCurrentStreak(goal.id, checkins),
    bestStreak: getBestStreak(goal.id, checkins),
    recentCheckins: checkins.slice(0, 7),
    evaluation: buildFallbackEvaluation(goal, evaluation),
  };
}
