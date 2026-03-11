import { GoalDetailSummary, GoalEvaluation, Goal, StatsSummary } from '@/src/models/types';
import {
  createGoalRecord,
  deleteGoalRecord,
  GoalInput,
  loadGoalCheckinHistory,
  loadGoalEvaluations,
  loadHomeSummary,
  loadStatsSummary,
  recordGoalCheckinRecord,
  RecordCheckinResult,
  toggleGoalActiveRecord,
  updateGoalRecord,
} from '@/src/repositories/app-repository';
import { getBestStreak, getCurrentStreak, getGoalDaysUntilStart, getGoalDeadline, getGoalRemainingDays } from '@/src/utils/goal-evaluation';
import { startOfToday, toISODate } from '@/src/utils/date';

function buildFallbackEvaluation(goal: Goal, evaluation?: GoalEvaluation): GoalEvaluation {
  return (
    evaluation ?? {
      goalId: goal.id,
      periodKey: '',
      windowStart: goal.startDate,
      windowEnd: goal.startDate,
      plannedDays: 0,
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
  const [goalEvaluations, homeSummary] = await Promise.all([loadGoalEvaluations(), loadHomeSummary()]);

  return {
    goal,
    goalEvaluations,
    homeSummary,
  };
}

export async function updateGoalUseCase(goalId: string, input: GoalInput) {
  const goal = await updateGoalRecord(goalId, input);
  const [goalEvaluations, homeSummary] = await Promise.all([loadGoalEvaluations(), loadHomeSummary()]);

  return {
    goal,
    goalEvaluations,
    homeSummary,
  };
}

export async function deleteGoalUseCase(goalId: string) {
  await deleteGoalRecord(goalId);
  const [goalEvaluations, homeSummary] = await Promise.all([loadGoalEvaluations(), loadHomeSummary()]);

  return {
    goalEvaluations,
    goalId,
    homeSummary,
  };
}

export async function toggleGoalActiveUseCase(goalId: string, active: boolean) {
  const goal = await toggleGoalActiveRecord(goalId, active);
  const [goalEvaluations, homeSummary] = await Promise.all([loadGoalEvaluations(), loadHomeSummary()]);

  return {
    goal,
    goalEvaluations,
    homeSummary,
  };
}

export async function recordGoalCheckinUseCase(input: {
  date?: string;
  goalId: string;
  note?: string;
  status: 'completed' | 'missed';
}): Promise<RecordCheckinResult & { date: string; homeSummary: Awaited<ReturnType<typeof loadHomeSummary>>; statsSummary: StatsSummary }> {
  const date = toISODate(input.date ?? startOfToday());
  const result = await recordGoalCheckinRecord({
    date,
    goalId: input.goalId,
    note: input.note,
    status: input.status,
  });
  const [homeSummary, statsSummary] = await Promise.all([loadHomeSummary(), loadStatsSummary(date)]);

  return {
    ...result,
    date,
    homeSummary,
    statsSummary,
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