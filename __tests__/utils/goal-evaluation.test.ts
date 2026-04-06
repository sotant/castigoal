import { defaultPunishments } from '@/src/constants/punishments';
import type { Checkin, Goal, Punishment } from '@/src/models/types';
import {
  DEFAULT_GOAL_PUNISHMENT_CONFIG,
  assignPunishment,
  buildAssignedPunishmentId,
  buildDeterministicUuid,
  buildGoalOutcome,
  calculateCompletionRate,
  completePunishment,
  dedupePunishments,
  evaluateGoalPeriod,
  getEvaluationWindow,
  getGoalDaysUntilStart,
  getGoalDeadline,
  getGoalRemainingDays,
  getBestStreak,
  getCurrentStreak,
  getEligiblePunishments,
  getGoalRequiredDays,
  hasGoalDeadlinePassed,
  normalizeGoalPunishmentConfig,
  selectDeterministicPunishment,
} from '@/src/utils/goal-evaluation';

function createGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    title: 'Entrenar',
    description: 'Objetivo de prueba',
    startDate: '2026-04-01',
    targetDays: 5,
    minimumSuccessRate: 60,
    active: true,
    lifecycleStatus: 'active',
    resolutionStatus: 'pending',
    punishmentConfig: DEFAULT_GOAL_PUNISHMENT_CONFIG,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
    ...overrides,
  };
}

function createCheckin(date: string, status: Checkin['status']): Checkin {
  return {
    id: `${date}-${status}`,
    goalId: 'goal-1',
    date,
    status,
    createdAt: `${date}T12:00:00.000Z`,
  };
}

describe('goal evaluation helpers', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('calculates required days by rounding up', () => {
    expect(getGoalRequiredDays({ targetDays: 7, minimumSuccessRate: 71 })).toBe(5);
  });

  test('normalizes punishment config and removes duplicate categories', () => {
    expect(
      normalizeGoalPunishmentConfig({
        scope: 'both',
        categoryMode: 'selected',
        categoryNames: ['estudio', 'estudio', 'hogar'],
      }),
    ).toEqual({
      scope: 'both',
      categoryMode: 'selected',
      categoryNames: ['estudio', 'hogar'],
    });
  });

  test('clears category names when category mode is all', () => {
    expect(
      normalizeGoalPunishmentConfig({
        scope: 'personal',
        categoryMode: 'all',
        categoryNames: ['estudio'],
      }),
    ).toEqual({
      scope: 'personal',
      categoryMode: 'all',
      categoryNames: [],
    });
  });

  test('calculates goal deadline, remaining days and days until start', () => {
    const activeGoal = createGoal({ startDate: '2026-04-10', targetDays: 5 });

    expect(getGoalDeadline(activeGoal)).toBe('2026-04-14');
    expect(getGoalDaysUntilStart(activeGoal, '2026-04-07')).toBe(3);
    expect(getGoalRemainingDays(activeGoal, '2026-04-12')).toBe(3);
  });

  test('detects when a deadline has already passed', () => {
    expect(hasGoalDeadlinePassed(createGoal({ startDate: '2026-04-01', targetDays: 5 }), '2026-04-07')).toBe(true);
    expect(hasGoalDeadlinePassed(createGoal({ startDate: '2026-04-01', targetDays: 5 }), '2026-04-05')).toBe(false);
  });

  test('returns 0 completion rate when there are no planned days', () => {
    expect(calculateCompletionRate(3, 0)).toBe(0);
  });

  test('builds an evaluation window using closedOn for closed goals', () => {
    expect(
      getEvaluationWindow(
        createGoal({
          lifecycleStatus: 'closed',
          closedOn: '2026-04-03',
        }),
        '2026-04-08',
      ),
    ).toEqual({
      periodKey: 'goal-1:2026-04-01:2026-04-03:3',
      windowStart: '2026-04-01',
      windowEnd: '2026-04-03',
      plannedDays: 3,
    });
  });

  test('evaluates a closed period using the goal deadline as window end', () => {
    const goal = createGoal();
    const checkins = [
      createCheckin('2026-04-01', 'completed'),
      createCheckin('2026-04-02', 'completed'),
      createCheckin('2026-04-03', 'missed'),
      createCheckin('2026-04-05', 'completed'),
      createCheckin('2026-04-07', 'completed'),
    ];

    expect(evaluateGoalPeriod(goal, checkins, '2026-04-10')).toEqual({
      goalId: 'goal-1',
      periodKey: 'goal-1:2026-04-01:2026-04-05:5',
      windowStart: '2026-04-01',
      windowEnd: '2026-04-05',
      plannedDays: 5,
      requiredDays: 3,
      completedDays: 3,
      completionRate: 60,
      passed: true,
    });
  });

  test('filters eligible punishments by scope and category and dedupes base punishments', () => {
    const goal = createGoal({
      punishmentConfig: {
        scope: 'base',
        categoryMode: 'selected',
        categoryNames: ['estudio'],
      },
    });
    const localBase = defaultPunishments.find((punishment) => punishment.id === 'punish-read') as Punishment;
    const remoteBase: Punishment = {
      ...localBase,
      id: '8e6dfa54-3848-4e6a-a4dd-3f79b4de8b47',
      createdAt: '2026-04-05T10:00:00.000Z',
    };
    const personalPunishment: Punishment = {
      ...localBase,
      id: 'personal-1',
      scope: 'personal',
      createdAt: '2026-04-06T10:00:00.000Z',
    };

    expect(getEligiblePunishments(goal, [localBase, remoteBase, personalPunishment])).toEqual([remoteBase]);
  });

  test('selects the same punishment every time for the same seed', () => {
    const punishments = defaultPunishments.slice(0, 3);
    const firstSelection = selectDeterministicPunishment(punishments, 'goal-1:window');
    const secondSelection = selectDeterministicPunishment(punishments, 'goal-1:window');

    expect(firstSelection).toEqual(secondSelection);
  });

  test('builds deterministic UUIDs', () => {
    const first = buildDeterministicUuid('goal-1:period');
    const second = buildDeterministicUuid('goal-1:period');

    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  test('assigns and completes punishments with predictable ids', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-06T09:30:00.000Z'));

    const assigned = assignPunishment(createGoal(), defaultPunishments[0], 'goal-1:period');
    const completed = completePunishment(assigned);

    expect(assigned).toMatchObject({
      id: buildAssignedPunishmentId('goal-1', 'goal-1:period'),
      goalId: 'goal-1',
      punishmentId: defaultPunishments[0].id,
      periodKey: 'goal-1:period',
      status: 'pending',
      assignedAt: '2026-04-06T09:30:00.000Z',
    });
    expect(completed).toMatchObject({
      id: assigned.id,
      status: 'completed',
      completedAt: '2026-04-06T09:30:00.000Z',
    });
  });

  test('builds a goal outcome from the evaluation result', () => {
    const goal = createGoal();
    const evaluation = evaluateGoalPeriod(
      goal,
      [
        createCheckin('2026-04-01', 'completed'),
        createCheckin('2026-04-02', 'completed'),
        createCheckin('2026-04-04', 'completed'),
      ],
      '2026-04-05',
    );

    expect(
      buildGoalOutcome({
        goal,
        evaluation,
        evaluatedAt: '2026-04-05T12:00:00.000Z',
        resolutionSource: 'manual',
        assignedPunishmentId: 'assigned-1',
      }),
    ).toMatchObject({
      goalId: goal.id,
      periodKey: evaluation.periodKey,
      assignedPunishmentId: 'assigned-1',
      minimumSuccessRate: 60,
      passed: true,
      resolutionSource: 'manual',
      evaluatedAt: '2026-04-05T12:00:00.000Z',
    });
  });

  test('prefers remote base punishments when deduping duplicates', () => {
    const localBase = defaultPunishments.find((punishment) => punishment.id === 'punish-read') as Punishment;
    const remoteBase: Punishment = {
      ...localBase,
      id: 'ecdf8a9c-b6ce-4af1-b6a6-694bc712f8f0',
      createdAt: '2026-04-05T10:00:00.000Z',
    };

    expect(dedupePunishments([localBase, remoteBase])).toEqual([remoteBase]);
  });

  test('computes current streak and best streak from completed checkins', () => {
    const checkins = [
      createCheckin('2026-04-01', 'completed'),
      createCheckin('2026-04-02', 'completed'),
      createCheckin('2026-04-03', 'missed'),
      createCheckin('2026-04-04', 'completed'),
      createCheckin('2026-04-05', 'completed'),
      createCheckin('2026-04-06', 'completed'),
    ];

    expect(getCurrentStreak('goal-1', checkins, '2026-04-06')).toBe(3);
    expect(getBestStreak('goal-1', checkins)).toBe(3);
  });
});
