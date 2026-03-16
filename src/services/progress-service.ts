import AsyncStorage from '@react-native-async-storage/async-storage';

import { defaultPunishments } from '@/src/constants/punishments';
import type { Tables } from '@/src/lib/database.types';
import { supabase } from '@/src/lib/supabase';
import type {
  AppBootstrapData,
  AssignedPunishment,
  AssignedPunishmentDetail,
  Checkin,
  CompletedPunishmentHistoryEntry,
  Goal,
  GoalCalendarDay,
  GoalDetailSummary,
  GoalEvaluation,
  HomeGoalSummary,
  HomeSummary,
  PendingAssignedPunishmentSummary,
  Punishment,
  StatsSummary,
  User,
  UserSettings,
} from '@/src/models/types';
import {
  assignPunishment,
  completePunishment,
  evaluateGoalPeriod,
  generateRandomPunishment,
  getBestStreak,
  getCurrentStreak,
  getGoalDeadline,
  getGoalDaysUntilStart,
  getGoalRemainingDays,
} from '@/src/utils/goal-evaluation';
import { addDays, startOfToday, toISODate } from '@/src/utils/date';

type SessionMode = 'guest' | 'authenticated';
type SyncStatus = 'idle' | 'pending' | 'syncing' | 'error';
type EntityKind =
  | 'goals'
  | 'checkins'
  | 'assignedPunishments'
  | 'punishments'
  | 'punishmentHistory'
  | 'userSettings';

export type GoalInput = Pick<
  Goal,
  'title' | 'description' | 'startDate' | 'targetDays' | 'minimumSuccessRate' | 'active'
>;

export type CheckinInput = {
  date?: string;
  goalId: string;
  status: Checkin['status'];
};

export type RecordCheckinResult = {
  assignedPunishment?: AssignedPunishment;
  checkin: Checkin;
  evaluation: GoalEvaluation;
};

export type ClearCheckinResult = {
  evaluation: GoalEvaluation;
  removedAssignedPunishmentId?: string;
};

type EntitySyncState = 'synced' | 'pending_upsert';

type SyncMeta = {
  lastModifiedAt: string;
  lastSyncedAt?: string;
  sourceGuestId?: string;
  state: EntitySyncState;
};

type SyncRecord<T> = {
  data: T;
  meta: SyncMeta;
};

type DeletedRecord = {
  deletedAt: string;
  id: string;
};

type LocalContainer = {
  actorId: string;
  actorType: SessionMode;
  createdAt: string;
  deleted: Record<EntityKind, Record<string, DeletedRecord>>;
  deviceId: string;
  guestId: string;
  punishmentsSeeded: boolean;
  records: {
    assignedPunishments: Record<string, SyncRecord<AssignedPunishment>>;
    checkins: Record<string, SyncRecord<Checkin>>;
    goals: Record<string, SyncRecord<Goal>>;
    punishmentHistory: Record<string, SyncRecord<CompletedPunishmentHistoryEntry>>;
    punishments: Record<string, SyncRecord<Punishment>>;
    userSettings: SyncRecord<UserSettings> | null;
  };
  sync: {
    errorMessage?: string;
    lastAttemptAt?: string;
    lastSuccessAt?: string;
    migrationPending: boolean;
    migrationSourceGuestId?: string;
    status: SyncStatus;
  };
  updatedAt: string;
  version: 1;
};

export type AppSessionState = {
  activeOwnerId: string;
  guestId: string;
  mode: SessionMode;
  syncError?: string;
  syncStatus: SyncStatus;
};

type BootstrapSnapshot = AppBootstrapData & {
  sessionState: AppSessionState;
  statsSummary: StatsSummary;
  user: User;
};

const APP_STORAGE_PREFIX = 'castigoal.v2';
const DEVICE_ID_KEY = `${APP_STORAGE_PREFIX}.device-id`;
const CURRENT_GUEST_ID_KEY = `${APP_STORAGE_PREFIX}.guest-id`;

const defaultSettings: UserSettings = {
  remindersEnabled: true,
  reminderHour: 20,
  reminderMinute: 0,
  pendingPunishmentReminderEnabled: true,
};

function nowIso() {
  return new Date().toISOString();
}

function createEmptyEntityBucket<T>() {
  return {} as Record<string, SyncRecord<T>>;
}

function createEmptyDeletedBucket() {
  return {
    assignedPunishments: {},
    checkins: {},
    goals: {},
    punishmentHistory: {},
    punishments: {},
    userSettings: {},
  } satisfies Record<EntityKind, Record<string, DeletedRecord>>;
}

function ownerKey(mode: SessionMode, actorId: string) {
  return `${APP_STORAGE_PREFIX}.container.${mode}.${actorId}`;
}

function createUuid() {
  const values = new Uint8Array(16);
  const cryptoObject = globalThis.crypto as { getRandomValues?: (array: Uint8Array) => Uint8Array } | undefined;

  if (cryptoObject?.getRandomValues) {
    cryptoObject.getRandomValues(values);
  } else {
    for (let index = 0; index < values.length; index += 1) {
      values[index] = Math.floor(Math.random() * 256);
    }
  }

  values[6] = (values[6] & 0x0f) | 0x40;
  values[8] = (values[8] & 0x3f) | 0x80;
  const hex = Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function readJson<T>(key: string): Promise<T | null> {
  const value = await AsyncStorage.getItem(key);
  return value ? (JSON.parse(value) as T) : null;
}

async function writeJson(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function getOrCreateDeviceId() {
  const saved = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (saved) {
    return saved;
  }

  const next = createUuid();
  await AsyncStorage.setItem(DEVICE_ID_KEY, next);
  return next;
}

async function getCurrentGuestId() {
  const saved = await AsyncStorage.getItem(CURRENT_GUEST_ID_KEY);
  if (saved) {
    return saved;
  }

  const next = createUuid();
  await AsyncStorage.setItem(CURRENT_GUEST_ID_KEY, next);
  return next;
}

async function rotateGuestId() {
  const next = createUuid();
  await AsyncStorage.setItem(CURRENT_GUEST_ID_KEY, next);
  return next;
}

function createContainer(input: {
  actorId: string;
  actorType: SessionMode;
  deviceId: string;
  guestId: string;
}): LocalContainer {
  const createdAt = nowIso();
  return {
    actorId: input.actorId,
    actorType: input.actorType,
    createdAt,
    deleted: createEmptyDeletedBucket(),
    deviceId: input.deviceId,
    guestId: input.guestId,
    punishmentsSeeded: false,
    records: {
      assignedPunishments: createEmptyEntityBucket<AssignedPunishment>(),
      checkins: createEmptyEntityBucket<Checkin>(),
      goals: createEmptyEntityBucket<Goal>(),
      punishmentHistory: createEmptyEntityBucket<CompletedPunishmentHistoryEntry>(),
      punishments: createEmptyEntityBucket<Punishment>(),
      userSettings: null,
    },
    sync: {
      migrationPending: false,
      status: 'idle',
    },
    updatedAt: createdAt,
    version: 1,
  };
}

async function loadContainer(mode: SessionMode, actorId: string) {
  return readJson<LocalContainer>(ownerKey(mode, actorId));
}

async function saveContainer(container: LocalContainer) {
  container.updatedAt = nowIso();
  await writeJson(ownerKey(container.actorType, container.actorId), container);
}

function createSyncRecord<T>(data: T, state: EntitySyncState, sourceGuestId?: string): SyncRecord<T> {
  const timestamp = nowIso();
  return {
    data,
    meta: {
      lastModifiedAt: timestamp,
      sourceGuestId,
      state,
    },
  };
}

function touchRecord<T>(record: SyncRecord<T>, nextData: T, sourceGuestId?: string): SyncRecord<T> {
  return {
    data: nextData,
    meta: {
      ...record.meta,
      lastModifiedAt: nowIso(),
      sourceGuestId: sourceGuestId ?? record.meta.sourceGuestId,
      state: 'pending_upsert',
    },
  };
}

function markSynced<T>(record: SyncRecord<T>): SyncRecord<T> {
  return {
    data: record.data,
    meta: {
      ...record.meta,
      lastSyncedAt: nowIso(),
      state: 'synced',
    },
  };
}

function seedBasePunishments(container: LocalContainer) {
  if (container.punishmentsSeeded) {
    return;
  }

  for (const punishment of defaultPunishments) {
    container.records.punishments[punishment.id] = createSyncRecord(punishment, 'synced');
  }

  container.punishmentsSeeded = true;
}

async function getOrCreateContainer(mode: SessionMode, actorId: string, guestId?: string) {
  const existing = await loadContainer(mode, actorId);
  if (existing) {
    return existing;
  }

  const container = createContainer({
    actorId,
    actorType: mode,
    deviceId: await getOrCreateDeviceId(),
    guestId: guestId ?? (mode === 'guest' ? actorId : await getCurrentGuestId()),
  });
  seedBasePunishments(container);
  container.records.userSettings = createSyncRecord(defaultSettings, 'synced');
  await saveContainer(container);
  return container;
}

function getValues<T>(records: Record<string, SyncRecord<T>>) {
  return Object.values(records).map((record) => record.data);
}

function sortGoals(goals: Goal[]) {
  return [...goals].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function expireGoalsIfNeeded(container: LocalContainer, referenceDate = startOfToday()) {
  const today = toISODate(referenceDate);
  let changed = false;

  for (const [goalId, record] of Object.entries(container.records.goals)) {
    const goal = record.data;

    if (!goal.active || today <= getGoalDeadline(goal)) {
      continue;
    }

    container.records.goals[goalId] = touchRecord(
      record,
      {
        ...goal,
        active: false,
        updatedAt: nowIso(),
      },
      container.actorType === 'guest' ? container.guestId : undefined,
    );
    changed = true;
  }

  if (changed && container.actorType === 'authenticated') {
    container.sync.status = 'pending';
  }

  return changed;
}

function getGoalEvaluationsMap(goals: Goal[], checkins: Checkin[], referenceDate = startOfToday()) {
  return Object.fromEntries(goals.map((goal) => [goal.id, evaluateGoalPeriod(goal, checkins, referenceDate)]));
}

function getTodayStatus(goalId: string, checkins: Checkin[]) {
  const today = startOfToday();
  return checkins.find((item) => item.goalId === goalId && item.date === today)?.status;
}

function buildHomeGoalSummary(goal: Goal, checkins: Checkin[], evaluation: GoalEvaluation): HomeGoalSummary {
  return {
    active: goal.active,
    bestStreak: getBestStreak(goal.id, checkins),
    completionRate: evaluation.completionRate,
    currentStreak: getCurrentStreak(goal.id, checkins),
    daysUntilStart: getGoalDaysUntilStart(goal),
    description: goal.description,
    goalId: goal.id,
    remainingDays: getGoalRemainingDays(goal),
    title: goal.title,
    todayStatus: getTodayStatus(goal.id, checkins),
  };
}

function buildStatsSummary(goals: Goal[], checkins: Checkin[], completedHistory: CompletedPunishmentHistoryEntry[]): StatsSummary {
  const evaluations = Object.values(getGoalEvaluationsMap(goals, checkins));
  const completedCheckins = checkins.filter((checkin) => checkin.status === 'completed').length;
  const totalCheckins = checkins.length;

  return {
    averageRate: evaluations.length
      ? Math.round(evaluations.reduce((total, evaluation) => total + evaluation.completionRate, 0) / evaluations.length)
      : 0,
    completedPunishments: completedHistory.length,
    completionRatio: totalCheckins ? Math.round((completedCheckins / totalCheckins) * 100) : 0,
    goalsActiveCount: goals.filter((goal) => goal.active).length,
  };
}

function buildCalendarMonth(checkins: Checkin[], goalId: string, monthStart: string): GoalCalendarDay[] {
  const monthDate = new Date(`${monthStart}T00:00:00`);
  const start = new Date(monthDate);
  const day = start.getDay();
  const normalized = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - normalized);
  const days: GoalCalendarDay[] = [];
  const targetMonth = monthDate.getMonth();
  const checkinsByDate = new Map(
    checkins.filter((item) => item.goalId === goalId).map((item) => [item.date, item]),
  );

  for (let index = 0; index < 42; index += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    const iso = toISODate(current);
    days.push({
      date: iso,
      dayNumber: current.getDate(),
      inMonth: current.getMonth() === targetMonth,
      status: checkinsByDate.get(iso)?.status,
    });
  }

  return days;
}

function buildGoalDetailSummary(goal: Goal, checkins: Checkin[], evaluation: GoalEvaluation): GoalDetailSummary {
  const goalCheckins = checkins
    .filter((checkin) => checkin.goalId === goal.id)
    .sort((left, right) => right.date.localeCompare(left.date));

  const daysUntilStart = getGoalDaysUntilStart(goal);
  const remainingDays = getGoalRemainingDays(goal);

  return {
    bestStreak: getBestStreak(goal.id, checkins),
    currentStreak: getCurrentStreak(goal.id, checkins),
    daysUntilStart,
    deadline: getGoalDeadline(goal),
    evaluation,
    goalId: goal.id,
    recentCheckins: goalCheckins.slice(0, 7),
    remainingDays,
    scheduleStatus:
      daysUntilStart > 0
        ? daysUntilStart === 1
          ? 'Empieza manana.'
          : `Empieza en ${daysUntilStart} dias.`
        : remainingDays > 0
          ? remainingDays === 1
            ? 'Queda 1 dia para cerrar el plazo.'
            : `Quedan ${remainingDays} dias para cerrar el plazo.`
          : 'El plazo configurado ya ha terminado.',
  };
}

function getPendingPunishmentSummaries(
  assignedPunishments: AssignedPunishment[],
  goals: Goal[],
  punishments: Punishment[],
): PendingAssignedPunishmentSummary[] {
  const goalsById = new Map(goals.map((goal) => [goal.id, goal]));
  const punishmentsById = new Map(punishments.map((punishment) => [punishment.id, punishment]));

  return assignedPunishments
    .filter((assigned) => assigned.status === 'pending')
    .map((assigned) => {
      const goal = goalsById.get(assigned.goalId);
      const punishment = punishmentsById.get(assigned.punishmentId);

      if (!goal || !punishment) {
        return null;
      }

      return {
        assignedAt: assigned.assignedAt,
        assignedId: assigned.id,
        dueDate: assigned.dueDate,
        goalId: goal.id,
        goalTitle: goal.title,
        punishment,
        punishmentId: punishment.id,
        status: assigned.status,
      } satisfies PendingAssignedPunishmentSummary;
    })
    .filter((item): item is PendingAssignedPunishmentSummary => Boolean(item))
    .sort((left, right) => right.assignedAt.localeCompare(left.assignedAt));
}

function buildHomeSummary(goals: Goal[], checkins: Checkin[], pending: PendingAssignedPunishmentSummary[]): HomeSummary {
  const evaluations = getGoalEvaluationsMap(goals, checkins);
  const latestPending = pending[0];

  return {
    activeGoalsCount: goals.filter((goal) => goal.active).length,
    goalSummaries: goals.map((goal) => buildHomeGoalSummary(goal, checkins, evaluations[goal.id])),
    latestPending: latestPending
      ? {
          assignedId: latestPending.assignedId,
          dueDate: latestPending.dueDate,
          goalId: latestPending.goalId,
          punishment: latestPending.punishment,
          punishmentId: latestPending.punishmentId,
          status: latestPending.status,
        }
      : undefined,
    pendingPunishmentsCount: pending.length,
  };
}

function getDerivedData(container: LocalContainer, referenceDate = startOfToday()) {
  seedBasePunishments(container);
  const goals = sortGoals(getValues(container.records.goals));
  const checkins = getValues(container.records.checkins);
  const assignedPunishments = getValues(container.records.assignedPunishments);
  const punishments = getValues(container.records.punishments).sort((left, right) =>
    left.title.localeCompare(right.title, 'es'),
  );
  const completedHistory = getValues(container.records.punishmentHistory).sort((left, right) =>
    right.completedAt.localeCompare(left.completedAt),
  );
  const pendingPunishments = getPendingPunishmentSummaries(assignedPunishments, goals, punishments);
  const goalEvaluations = getGoalEvaluationsMap(goals, checkins, referenceDate);

  return {
    assignedPunishments,
    checkins,
    completedHistory,
    goalEvaluations,
    goals,
    homeSummary: buildHomeSummary(goals, checkins, pendingPunishments),
    pendingPunishments,
    punishments,
    settings: container.records.userSettings?.data ?? defaultSettings,
    statsSummary: buildStatsSummary(goals, checkins, completedHistory),
  };
}

async function getCurrentAuthState() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    return null;
  }

  return session;
}

async function loadProfileName(userId: string, email?: string | null) {
  const { data } = await supabase.from('profiles').select('display_name').eq('id', userId).maybeSingle();
  return data?.display_name ?? email?.split('@')[0] ?? 'Usuario';
}

async function getActiveContainer() {
  const session = await getCurrentAuthState();

  if (!session) {
    const guestId = await getCurrentGuestId();
    const container = await getOrCreateContainer('guest', guestId, guestId);
    if (expireGoalsIfNeeded(container)) {
      await saveContainer(container);
    }
    return {
      container,
      mode: 'guest' as const,
      session: null,
    };
  }

  const guestId = await getCurrentGuestId();
  const container = await getOrCreateContainer('authenticated', session.user.id, guestId);
  if (expireGoalsIfNeeded(container)) {
    await saveContainer(container);
  }
  return {
    container,
    mode: 'authenticated' as const,
    session,
  };
}

function getSessionState(container: LocalContainer): AppSessionState {
  return {
    activeOwnerId: container.actorId,
    guestId: container.guestId,
    mode: container.actorType,
    syncError: container.sync.errorMessage,
    syncStatus: container.sync.status,
  };
}

function setSyncStatus(container: LocalContainer, status: SyncStatus, errorMessage?: string) {
  container.sync.status = status;
  container.sync.errorMessage = errorMessage;
  container.sync.lastAttemptAt = nowIso();
}

function clearDeleted(container: LocalContainer, kind: EntityKind, id: string) {
  delete container.deleted[kind][id];
}

function setDeleted(container: LocalContainer, kind: EntityKind, id: string) {
  container.deleted[kind][id] = {
    deletedAt: nowIso(),
    id,
  };
}

function setRecord<T>(
  container: LocalContainer,
  bucket: Record<string, SyncRecord<T>>,
  id: string,
  data: T,
  sourceGuestId?: string,
) {
  bucket[id] = bucket[id] ? touchRecord(bucket[id], data, sourceGuestId) : createSyncRecord(data, 'pending_upsert', sourceGuestId);
}

function mergeGuestIntoAccount(guest: LocalContainer, account: LocalContainer) {
  const hasGuestData =
    Object.keys(guest.records.goals).length > 0 ||
    Object.keys(guest.records.checkins).length > 0 ||
    Object.keys(guest.records.assignedPunishments).length > 0 ||
    Object.keys(guest.records.punishmentHistory).length > 0 ||
    Object.values(guest.records.punishments).some((item) => item.data.scope === 'personal');

  if (!hasGuestData || account.sync.migrationSourceGuestId === guest.actorId) {
    return false;
  }

  for (const [id, record] of Object.entries(guest.records.goals)) {
    account.records.goals[id] = {
      data: record.data,
      meta: {
        ...record.meta,
        lastModifiedAt: nowIso(),
        sourceGuestId: guest.actorId,
        state: 'pending_upsert',
      },
    };
  }

  for (const [id, record] of Object.entries(guest.records.checkins)) {
    account.records.checkins[id] = {
      data: record.data,
      meta: {
        ...record.meta,
        lastModifiedAt: nowIso(),
        sourceGuestId: guest.actorId,
        state: 'pending_upsert',
      },
    };
  }

  for (const [id, record] of Object.entries(guest.records.assignedPunishments)) {
    account.records.assignedPunishments[id] = {
      data: record.data,
      meta: {
        ...record.meta,
        lastModifiedAt: nowIso(),
        sourceGuestId: guest.actorId,
        state: 'pending_upsert',
      },
    };
  }

  for (const [id, record] of Object.entries(guest.records.punishmentHistory)) {
    account.records.punishmentHistory[id] = {
      data: record.data,
      meta: {
        ...record.meta,
        lastModifiedAt: nowIso(),
        sourceGuestId: guest.actorId,
        state: 'pending_upsert',
      },
    };
  }

  for (const [id, record] of Object.entries(guest.records.punishments)) {
    if (record.data.scope !== 'personal') {
      continue;
    }

    account.records.punishments[id] = {
      data: record.data,
      meta: {
        ...record.meta,
        lastModifiedAt: nowIso(),
        sourceGuestId: guest.actorId,
        state: 'pending_upsert',
      },
    };
  }

  if (guest.records.userSettings) {
    account.records.userSettings = {
      data: guest.records.userSettings.data,
      meta: {
        ...guest.records.userSettings.meta,
        lastModifiedAt: nowIso(),
        sourceGuestId: guest.actorId,
        state: 'pending_upsert',
      },
    };
  }

  account.sync.migrationPending = true;
  account.sync.migrationSourceGuestId = guest.actorId;
  account.sync.status = 'pending';
  return true;
}

function compareSyncMeta(left?: SyncMeta, right?: SyncMeta) {
  if (!left && !right) {
    return 0;
  }

  if (!left) {
    return -1;
  }

  if (!right) {
    return 1;
  }

  return left.lastModifiedAt.localeCompare(right.lastModifiedAt);
}

function mergeRemoteRecord<T>(local: SyncRecord<T> | undefined, remote: SyncRecord<T>) {
  if (!local) {
    return remote;
  }

  if (local.meta.state === 'pending_upsert') {
    return compareSyncMeta(local.meta, remote.meta) >= 0 ? local : remote;
  }

  return compareSyncMeta(local.meta, remote.meta) >= 0 ? local : remote;
}

type RemoteSnapshot = {
  assignedPunishments: Record<string, SyncRecord<AssignedPunishment>>;
  checkins: Record<string, SyncRecord<Checkin>>;
  goals: Record<string, SyncRecord<Goal>>;
  punishmentHistory: Record<string, SyncRecord<CompletedPunishmentHistoryEntry>>;
  punishments: Record<string, SyncRecord<Punishment>>;
  settings: SyncRecord<UserSettings> | null;
};

function mapGoalRow(row: Tables<'goals'>): SyncRecord<Goal> {
  return {
    data: {
      active: row.active,
      createdAt: row.created_at,
      description: row.description ?? undefined,
      id: row.id,
      minimumSuccessRate: row.minimum_success_rate,
      startDate: row.start_date,
      targetDays: row.target_days,
      title: row.title,
      updatedAt: row.updated_at,
    },
    meta: {
      lastModifiedAt: row.updated_at,
      lastSyncedAt: row.updated_at,
      state: 'synced',
    },
  };
}

function mapCheckinRow(row: Tables<'checkins'>): SyncRecord<Checkin> {
  return {
    data: {
      createdAt: row.created_at,
      date: row.checkin_date,
      goalId: row.goal_id,
      id: row.id,
      status: row.status as Checkin['status'],
    },
    meta: {
      lastModifiedAt: row.created_at,
      lastSyncedAt: row.created_at,
      state: 'synced',
    },
  };
}

function mapAssignedPunishmentRow(row: Tables<'assigned_punishments'>): SyncRecord<AssignedPunishment> {
  return {
    data: {
      assignedAt: row.assigned_at,
      completedAt: row.completed_at ?? undefined,
      dueDate: row.due_date,
      goalId: row.goal_id,
      id: row.id,
      periodKey: row.period_key,
      punishmentId: row.punishment_id,
      status: row.status as AssignedPunishment['status'],
    },
    meta: {
      lastModifiedAt: row.completed_at ?? row.assigned_at,
      lastSyncedAt: row.completed_at ?? row.assigned_at,
      state: 'synced',
    },
  };
}

function mapPunishmentRow(row: Tables<'punishments'>): SyncRecord<Punishment> {
  return {
    data: {
      category: row.category as Punishment['category'],
      description: row.description,
      difficulty: row.difficulty as Punishment['difficulty'],
      id: row.id,
      scope: row.owner_id ? 'personal' : 'base',
      title: row.title,
    },
    meta: {
      lastModifiedAt: row.created_at,
      lastSyncedAt: row.created_at,
      state: 'synced',
    },
  };
}

function mapHistoryRow(
  row: Tables<'punishment_completion_history'>,
  goals: Record<string, SyncRecord<Goal>>,
): SyncRecord<CompletedPunishmentHistoryEntry> {
  return {
    data: {
      assignedPunishmentId: row.assigned_punishment_id ?? undefined,
      completedAt: row.completed_at,
      goalId: row.goal_id ?? undefined,
      goalTitle: row.goal_id ? goals[row.goal_id]?.data.title : undefined,
      id: row.id,
      punishmentDescription: row.punishment_description,
      punishmentId: row.punishment_id ?? undefined,
      punishmentTitle: row.punishment_title,
    },
    meta: {
      lastModifiedAt: row.completed_at,
      lastSyncedAt: row.completed_at,
      state: 'synced',
    },
  };
}

function mapSettingsRow(row: Tables<'user_settings'>): SyncRecord<UserSettings> {
  return {
    data: {
      pendingPunishmentReminderEnabled: row.pending_punishment_reminder_enabled,
      reminderHour: row.reminder_hour,
      reminderMinute: row.reminder_minute,
      remindersEnabled: row.reminders_enabled,
    },
    meta: {
      lastModifiedAt: row.updated_at,
      lastSyncedAt: row.updated_at,
      state: 'synced',
    },
  };
}

function isMissingSyncMetadataColumnError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const message = 'message' in error && typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return message.includes('origin_device_id') || message.includes('source_guest_id');
}

async function upsertWithSyncMetadataFallback<
  T extends
    | 'goals'
    | 'checkins'
    | 'assigned_punishments'
    | 'punishments'
    | 'punishment_completion_history'
    | 'user_settings',
>(table: T, payloadWithMetadata: Record<string, unknown>[], payloadWithoutMetadata: Record<string, unknown>[], onConflict: string) {
  const firstAttempt = await (supabase.from(table) as any).upsert(payloadWithMetadata, { onConflict });

  if (!firstAttempt.error) {
    return firstAttempt;
  }

  if (!isMissingSyncMetadataColumnError(firstAttempt.error)) {
    return firstAttempt;
  }

  return (supabase.from(table) as any).upsert(payloadWithoutMetadata, { onConflict });
}

async function fetchRemoteSnapshot(userId: string): Promise<RemoteSnapshot> {
  const [goalsResult, checkinsResult, assignedResult, punishmentsResult, historyResult, settingsResult] = await Promise.all([
    supabase.from('goals').select('*').eq('user_id', userId),
    supabase.from('checkins').select('*').eq('user_id', userId),
    supabase.from('assigned_punishments').select('*').eq('user_id', userId),
    supabase.from('punishments').select('*').or(`owner_id.is.null,owner_id.eq.${userId}`),
    supabase.from('punishment_completion_history').select('*').eq('user_id', userId),
    supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  if (goalsResult.error) throw goalsResult.error;
  if (checkinsResult.error) throw checkinsResult.error;
  if (assignedResult.error) throw assignedResult.error;
  if (punishmentsResult.error) throw punishmentsResult.error;
  if (historyResult.error) throw historyResult.error;
  if (settingsResult.error) throw settingsResult.error;

  const goals = Object.fromEntries((goalsResult.data ?? []).map((row) => [row.id, mapGoalRow(row)]));
  const checkins = Object.fromEntries((checkinsResult.data ?? []).map((row) => [row.id, mapCheckinRow(row)]));
  const assignedPunishments = Object.fromEntries((assignedResult.data ?? []).map((row) => [row.id, mapAssignedPunishmentRow(row)]));
  const punishments = Object.fromEntries((punishmentsResult.data ?? []).map((row) => [row.id, mapPunishmentRow(row)]));
  const punishmentHistory = Object.fromEntries(
    (historyResult.data ?? []).map((row) => [row.id, mapHistoryRow(row, goals)]),
  );

  return {
    assignedPunishments,
    checkins,
    goals,
    punishmentHistory,
    punishments,
    settings: settingsResult.data ? mapSettingsRow(settingsResult.data) : null,
  };
}

function mergeRemoteSnapshot(container: LocalContainer, remote: RemoteSnapshot) {
  for (const [id, record] of Object.entries(remote.goals)) {
    container.records.goals[id] = mergeRemoteRecord(container.records.goals[id], record);
  }
  for (const [id, record] of Object.entries(remote.checkins)) {
    container.records.checkins[id] = mergeRemoteRecord(container.records.checkins[id], record);
  }
  for (const [id, record] of Object.entries(remote.assignedPunishments)) {
    container.records.assignedPunishments[id] = mergeRemoteRecord(container.records.assignedPunishments[id], record);
  }
  for (const [id, record] of Object.entries(remote.punishments)) {
    if (record.data.scope === 'base' && container.records.punishments[id]?.data.scope === 'personal') {
      continue;
    }
    container.records.punishments[id] = mergeRemoteRecord(container.records.punishments[id], record);
  }
  for (const [id, record] of Object.entries(remote.punishmentHistory)) {
    container.records.punishmentHistory[id] = mergeRemoteRecord(container.records.punishmentHistory[id], record);
  }
  if (remote.settings) {
    container.records.userSettings = mergeRemoteRecord(container.records.userSettings ?? undefined, remote.settings);
  }
}

async function deleteRemoteRecords(container: LocalContainer) {
  const userId = container.actorId;
  const deletedGoals = Object.keys(container.deleted.goals);
  const deletedCheckins = Object.keys(container.deleted.checkins);
  const deletedAssigned = Object.keys(container.deleted.assignedPunishments);
  const deletedPunishments = Object.keys(container.deleted.punishments);
  const deletedHistory = Object.keys(container.deleted.punishmentHistory);
  const deletions: any[] = [];

  if (deletedHistory.length) {
    deletions.push(supabase.from('punishment_completion_history').delete().eq('user_id', userId).in('id', deletedHistory));
  }
  if (deletedAssigned.length) {
    deletions.push(supabase.from('assigned_punishments').delete().eq('user_id', userId).in('id', deletedAssigned));
  }
  if (deletedCheckins.length) {
    deletions.push(supabase.from('checkins').delete().eq('user_id', userId).in('id', deletedCheckins));
  }
  if (deletedGoals.length) {
    deletions.push(supabase.from('goals').delete().eq('user_id', userId).in('id', deletedGoals));
  }
  if (deletedPunishments.length) {
    deletions.push(supabase.from('punishments').delete().eq('owner_id', userId).in('id', deletedPunishments));
  }

  await Promise.all(deletions);
  container.deleted = createEmptyDeletedBucket();
}

async function pushPendingRecords(container: LocalContainer) {
  const userId = container.actorId;
  const deviceId = container.deviceId;

  const goals = Object.values(container.records.goals).filter((record) => record.meta.state === 'pending_upsert');
  if (goals.length) {
    const payload = goals.map((record) => ({
      active: record.data.active,
      created_at: record.data.createdAt,
      description: record.data.description ?? null,
      frequency: 'daily',
      id: record.data.id,
      minimum_success_rate: record.data.minimumSuccessRate,
      origin_device_id: deviceId,
      source_guest_id: record.meta.sourceGuestId ?? null,
      start_date: record.data.startDate,
      target_days: record.data.targetDays,
      title: record.data.title,
      updated_at: record.data.updatedAt,
      user_id: userId,
    }));
    const payloadWithoutMetadata = goals.map((record) => ({
      active: record.data.active,
      created_at: record.data.createdAt,
      description: record.data.description ?? null,
      frequency: 'daily',
      id: record.data.id,
      minimum_success_rate: record.data.minimumSuccessRate,
      start_date: record.data.startDate,
      target_days: record.data.targetDays,
      title: record.data.title,
      updated_at: record.data.updatedAt,
      user_id: userId,
    }));
    const { error } = await upsertWithSyncMetadataFallback('goals', payload, payloadWithoutMetadata, 'id');
    if (error) throw error;
    for (const record of goals) {
      container.records.goals[record.data.id] = markSynced(record);
    }
  }

  const checkins = Object.values(container.records.checkins).filter((record) => record.meta.state === 'pending_upsert');
  if (checkins.length) {
    const payload = checkins.map((record) => ({
      checkin_date: record.data.date,
      created_at: record.data.createdAt,
      goal_id: record.data.goalId,
      id: record.data.id,
      origin_device_id: deviceId,
      source_guest_id: record.meta.sourceGuestId ?? null,
      status: record.data.status,
      user_id: userId,
    }));
    const payloadWithoutMetadata = checkins.map((record) => ({
      checkin_date: record.data.date,
      created_at: record.data.createdAt,
      goal_id: record.data.goalId,
      id: record.data.id,
      status: record.data.status,
      user_id: userId,
    }));
    const { error } = await upsertWithSyncMetadataFallback('checkins', payload, payloadWithoutMetadata, 'id');
    if (error) throw error;
    for (const record of checkins) {
      container.records.checkins[record.data.id] = markSynced(record);
    }
  }

  const assigned = Object.values(container.records.assignedPunishments).filter((record) => record.meta.state === 'pending_upsert');
  if (assigned.length) {
    const payload = assigned.map((record) => ({
      assigned_at: record.data.assignedAt,
      completed_at: record.data.completedAt ?? null,
      due_date: record.data.dueDate,
      goal_id: record.data.goalId,
      id: record.data.id,
      origin_device_id: deviceId,
      period_key: record.data.periodKey,
      punishment_id: record.data.punishmentId,
      source_guest_id: record.meta.sourceGuestId ?? null,
      status: record.data.status,
      user_id: userId,
    }));
    const payloadWithoutMetadata = assigned.map((record) => ({
      assigned_at: record.data.assignedAt,
      completed_at: record.data.completedAt ?? null,
      due_date: record.data.dueDate,
      goal_id: record.data.goalId,
      id: record.data.id,
      period_key: record.data.periodKey,
      punishment_id: record.data.punishmentId,
      status: record.data.status,
      user_id: userId,
    }));
    const { error } = await upsertWithSyncMetadataFallback(
      'assigned_punishments',
      payload,
      payloadWithoutMetadata,
      'id',
    );
    if (error) throw error;
    for (const record of assigned) {
      container.records.assignedPunishments[record.data.id] = markSynced(record);
    }
  }

  const punishments = Object.values(container.records.punishments).filter(
    (record) => record.meta.state === 'pending_upsert' && record.data.scope === 'personal',
  );
  if (punishments.length) {
    const payload = punishments.map((record) => ({
      category: record.data.category,
      description: record.data.description,
      difficulty: record.data.difficulty,
      id: record.data.id,
      is_custom: true,
      origin_device_id: deviceId,
      owner_id: userId,
      source_guest_id: record.meta.sourceGuestId ?? null,
      title: record.data.title,
    }));
    const payloadWithoutMetadata = punishments.map((record) => ({
      category: record.data.category,
      description: record.data.description,
      difficulty: record.data.difficulty,
      id: record.data.id,
      is_custom: true,
      owner_id: userId,
      title: record.data.title,
    }));
    const { error } = await upsertWithSyncMetadataFallback('punishments', payload, payloadWithoutMetadata, 'id');
    if (error) throw error;
    for (const record of punishments) {
      container.records.punishments[record.data.id] = markSynced(record);
    }
  }

  const history = Object.values(container.records.punishmentHistory).filter((record) => record.meta.state === 'pending_upsert');
  if (history.length) {
    const payload = history.map((record) => ({
      assigned_punishment_id: record.data.assignedPunishmentId ?? null,
      completed_at: record.data.completedAt,
      goal_id: record.data.goalId ?? null,
      id: record.data.id,
      origin_device_id: deviceId,
      punishment_description: record.data.punishmentDescription,
      punishment_id: record.data.punishmentId ?? null,
      punishment_title: record.data.punishmentTitle,
      source_guest_id: record.meta.sourceGuestId ?? null,
      user_id: userId,
    }));
    const payloadWithoutMetadata = history.map((record) => ({
      assigned_punishment_id: record.data.assignedPunishmentId ?? null,
      completed_at: record.data.completedAt,
      goal_id: record.data.goalId ?? null,
      id: record.data.id,
      punishment_description: record.data.punishmentDescription,
      punishment_id: record.data.punishmentId ?? null,
      punishment_title: record.data.punishmentTitle,
      user_id: userId,
    }));
    const { error } = await upsertWithSyncMetadataFallback(
      'punishment_completion_history',
      payload,
      payloadWithoutMetadata,
      'id',
    );
    if (error) throw error;
    for (const record of history) {
      container.records.punishmentHistory[record.data.id] = markSynced(record);
    }
  }

  if (container.records.userSettings?.meta.state === 'pending_upsert') {
    const payload = {
        origin_device_id: deviceId,
        pending_punishment_reminder_enabled: container.records.userSettings.data.pendingPunishmentReminderEnabled,
        reminder_hour: container.records.userSettings.data.reminderHour,
        reminder_minute: container.records.userSettings.data.reminderMinute,
        reminders_enabled: container.records.userSettings.data.remindersEnabled,
        source_guest_id: container.records.userSettings.meta.sourceGuestId ?? null,
        user_id: userId,
      };
    const payloadWithoutMetadata = {
      pending_punishment_reminder_enabled: container.records.userSettings.data.pendingPunishmentReminderEnabled,
      reminder_hour: container.records.userSettings.data.reminderHour,
      reminder_minute: container.records.userSettings.data.reminderMinute,
      reminders_enabled: container.records.userSettings.data.remindersEnabled,
      user_id: userId,
    };
    const { error } = await upsertWithSyncMetadataFallback(
      'user_settings',
      [payload],
      [payloadWithoutMetadata],
      'user_id',
    );
    if (error) throw error;
    container.records.userSettings = markSynced(container.records.userSettings);
  }
}

async function syncAuthenticatedContainer(container: LocalContainer) {
  if (container.actorType !== 'authenticated') {
    return container;
  }

  setSyncStatus(container, 'syncing');
  await saveContainer(container);

  try {
    await deleteRemoteRecords(container);
    await pushPendingRecords(container);
    const remote = await fetchRemoteSnapshot(container.actorId);
    mergeRemoteSnapshot(container, remote);
    container.sync.errorMessage = undefined;
    container.sync.lastSuccessAt = nowIso();
    container.sync.migrationPending = false;
    container.sync.status = 'idle';
    await saveContainer(container);
    return container;
  } catch (error) {
    setSyncStatus(container, 'error', error instanceof Error ? error.message : 'No se pudo sincronizar.');
    await saveContainer(container);
    return container;
  }
}

async function bootstrapContainer() {
  const authState = await getCurrentAuthState();

  if (!authState) {
    const guestId = await getCurrentGuestId();
    const container = await getOrCreateContainer('guest', guestId, guestId);
    if (expireGoalsIfNeeded(container)) {
      await saveContainer(container);
    }
    return container;
  }

  const guestId = await getCurrentGuestId();
  const guestContainer = await getOrCreateContainer('guest', guestId, guestId);
  const accountContainer = await getOrCreateContainer('authenticated', authState.user.id, guestId);
  seedBasePunishments(accountContainer);

  const didMergeGuest = mergeGuestIntoAccount(guestContainer, accountContainer);
  if (didMergeGuest) {
    await saveContainer(accountContainer);
    await rotateGuestId();
  }

  if (expireGoalsIfNeeded(accountContainer)) {
    await saveContainer(accountContainer);
  }

  return syncAuthenticatedContainer(accountContainer);
}

function buildUser(mode: SessionMode, actorId: string, displayName?: string): User {
  return {
    createdAt: nowIso(),
    id: actorId,
    name: displayName ?? (mode === 'guest' ? 'Invitado' : 'Usuario'),
    onboardingCompleted: true,
  };
}

export async function bootstrapAppSession(): Promise<BootstrapSnapshot> {
  const session = await getCurrentAuthState();
  const container = await bootstrapContainer();
  const derived = getDerivedData(container);

  const user = session
    ? buildUser('authenticated', session.user.id, await loadProfileName(session.user.id, session.user.email))
    : buildUser('guest', container.actorId, 'Invitado');

  return {
    goalEvaluations: derived.goalEvaluations,
    goals: derived.goals,
    homeSummary: derived.homeSummary,
    sessionState: getSessionState(container),
    statsSummary: derived.statsSummary,
    user,
    userSettings: derived.settings,
  };
}

async function withActiveContainer<T>(handler: (container: LocalContainer) => Promise<T>): Promise<T> {
  const { container } = await getActiveContainer();
  seedBasePunishments(container);
  if (!container.records.userSettings) {
    container.records.userSettings = createSyncRecord(
      defaultSettings,
      container.actorType === 'authenticated' ? 'pending_upsert' : 'synced',
    );
  }
  const result = await handler(container);
  await saveContainer(container);
  if (container.actorType === 'authenticated') {
    void syncAuthenticatedContainer(container);
  }
  return result;
}

export async function getSessionStateSnapshot(): Promise<AppSessionState> {
  const { container } = await getActiveContainer();
  return getSessionState(container);
}

export async function retryPendingSync() {
  const { container } = await getActiveContainer();
  if (container.actorType !== 'authenticated') {
    return getSessionState(container);
  }

  const synced = await syncAuthenticatedContainer(container);
  return getSessionState(synced);
}

export async function loadGoalEvaluations(referenceDate?: string) {
  const { container } = await getActiveContainer();
  const { goals, checkins } = getDerivedData(container, referenceDate ?? startOfToday());
  return Object.fromEntries(goals.map((goal) => [goal.id, evaluateGoalPeriod(goal, checkins, referenceDate ?? startOfToday())]));
}

export async function loadHomeSummary() {
  const { container } = await getActiveContainer();
  return getDerivedData(container).homeSummary;
}

export async function loadStatsSummary(_referenceDate?: string) {
  const { container } = await getActiveContainer();
  return getDerivedData(container).statsSummary;
}

export async function loadGoalCalendarMonth(goalId: string, monthStart: string) {
  const { container } = await getActiveContainer();
  return buildCalendarMonth(getDerivedData(container).checkins, goalId, monthStart);
}

export async function loadPunishmentCatalog() {
  const { container } = await getActiveContainer();
  return getDerivedData(container).punishments;
}

export async function loadPendingPunishments() {
  const { container } = await getActiveContainer();
  return getDerivedData(container).pendingPunishments;
}

export async function loadCompletedPunishmentHistory() {
  const { container } = await getActiveContainer();
  return getDerivedData(container).completedHistory;
}

export async function loadBootstrapData(): Promise<AppBootstrapData> {
  const { container } = await getActiveContainer();
  const derived = getDerivedData(container);
  return {
    goalEvaluations: derived.goalEvaluations,
    goals: derived.goals,
    homeSummary: derived.homeSummary,
    userSettings: derived.settings,
  };
}

export async function loadGoalCheckinHistory(goalId: string) {
  const { container } = await getActiveContainer();
  return getDerivedData(container).checkins
    .filter((checkin) => checkin.goalId === goalId)
    .sort((left, right) => right.date.localeCompare(left.date));
}

export async function loadAssignedPunishmentById(assignedId: string) {
  const { container } = await getActiveContainer();
  return container.records.assignedPunishments[assignedId]?.data ?? null;
}

export async function loadPunishmentById(punishmentId: string) {
  const { container } = await getActiveContainer();
  return container.records.punishments[punishmentId]?.data ?? null;
}

export async function createGoalRecord(input: GoalInput) {
  return withActiveContainer(async (container) => {
    const timestamp = nowIso();
    const goal: Goal = {
      active: input.active,
      createdAt: timestamp,
      description: input.description?.trim() || undefined,
      id: createUuid(),
      minimumSuccessRate: input.minimumSuccessRate,
      startDate: input.startDate,
      targetDays: input.targetDays,
      title: input.title.trim(),
      updatedAt: timestamp,
    };

    setRecord(container, container.records.goals, goal.id, goal, container.actorType === 'guest' ? container.guestId : undefined);
    clearDeleted(container, 'goals', goal.id);
    container.sync.status = container.actorType === 'authenticated' ? 'pending' : container.sync.status;
    return goal;
  });
}

async function loadGoal(goalId: string) {
  const { container } = await getActiveContainer();
  return container.records.goals[goalId]?.data ?? null;
}

export async function updateGoalRecord(goalId: string, input: GoalInput) {
  return withActiveContainer(async (container) => {
    const current = container.records.goals[goalId]?.data;
    if (!current) {
      throw new Error('No he encontrado el objetivo para actualizarlo.');
    }

    const goal: Goal = {
      ...current,
      active: input.active,
      description: input.description?.trim() || undefined,
      minimumSuccessRate: input.minimumSuccessRate,
      startDate: input.startDate,
      targetDays: input.targetDays,
      title: input.title.trim(),
      updatedAt: nowIso(),
    };

    setRecord(container, container.records.goals, goal.id, goal, container.actorType === 'guest' ? container.guestId : undefined);
    return goal;
  });
}

export async function deleteGoalRecord(goalId: string) {
  return withActiveContainer(async (container) => {
    delete container.records.goals[goalId];
    const relatedCheckins = Object.values(container.records.checkins).filter((item) => item.data.goalId === goalId);
    const relatedAssigned = Object.values(container.records.assignedPunishments).filter((item) => item.data.goalId === goalId);
    const relatedHistory = Object.values(container.records.punishmentHistory).filter((item) => item.data.goalId === goalId);

    for (const record of relatedCheckins) {
      delete container.records.checkins[record.data.id];
      setDeleted(container, 'checkins', record.data.id);
    }
    for (const record of relatedAssigned) {
      delete container.records.assignedPunishments[record.data.id];
      setDeleted(container, 'assignedPunishments', record.data.id);
    }
    for (const record of relatedHistory) {
      delete container.records.punishmentHistory[record.data.id];
      setDeleted(container, 'punishmentHistory', record.data.id);
    }

    setDeleted(container, 'goals', goalId);
  });
}

export async function toggleGoalActiveRecord(goalId: string, active: boolean) {
  const goal = await loadGoal(goalId);
  if (!goal) {
    throw new Error('No he encontrado el objetivo.');
  }

  return updateGoalRecord(goalId, {
    active,
    description: goal.description,
    minimumSuccessRate: goal.minimumSuccessRate,
    startDate: goal.startDate,
    targetDays: goal.targetDays,
    title: goal.title,
  });
}

function findCheckinByGoalDate(container: LocalContainer, goalId: string, date: string) {
  return Object.values(container.records.checkins).find((record) => record.data.goalId === goalId && record.data.date === date);
}

function buildHistoryId(assignedId: string) {
  return assignedId;
}

export async function recordGoalCheckinRecord(input: CheckinInput & { date: string }): Promise<RecordCheckinResult> {
  return withActiveContainer(async (container) => {
    const goal = container.records.goals[input.goalId]?.data;
    if (!goal) {
      throw new Error('No he encontrado el objetivo para registrar el check-in.');
    }

    const existing = findCheckinByGoalDate(container, input.goalId, input.date);
    const checkin: Checkin = {
      createdAt: existing?.data.createdAt ?? nowIso(),
      date: input.date,
      goalId: input.goalId,
      id: existing?.data.id ?? createUuid(),
      status: input.status,
    };

    setRecord(
      container,
      container.records.checkins,
      checkin.id,
      checkin,
      container.actorType === 'guest' ? container.guestId : undefined,
    );

    const { checkins, punishments } = getDerivedData(container, input.date);
    const evaluation = evaluateGoalPeriod(goal, checkins, input.date);
    const deadline = getGoalDeadline(goal);
    let assignedPunishment = Object.values(container.records.assignedPunishments).find(
      (record) => record.data.goalId === goal.id && record.data.periodKey === evaluation.periodKey,
    )?.data;

    if (input.date >= deadline && !evaluation.passed && !assignedPunishment) {
      const punishment = generateRandomPunishment(
        punishments.filter((item) => item.scope === 'base' || item.scope === 'personal'),
        evaluation.periodKey,
      );

      if (punishment) {
        assignedPunishment = assignPunishment(goal, punishment, evaluation.periodKey, addDays(evaluation.windowEnd, 1));
        setRecord(
          container,
          container.records.assignedPunishments,
          assignedPunishment.id,
          assignedPunishment,
          container.actorType === 'guest' ? container.guestId : undefined,
        );
      }
    }

    return {
      assignedPunishment,
      checkin,
      evaluation,
    };
  });
}

export async function clearGoalCheckinRecord(input: { date: string; goalId: string }): Promise<ClearCheckinResult> {
  return withActiveContainer(async (container) => {
    const goal = container.records.goals[input.goalId]?.data;
    if (!goal) {
      throw new Error('No he encontrado el objetivo para actualizar el check-in.');
    }

    const existing = findCheckinByGoalDate(container, input.goalId, input.date);
    if (existing) {
      delete container.records.checkins[existing.data.id];
      setDeleted(container, 'checkins', existing.data.id);
    }

    const { checkins } = getDerivedData(container, input.date);
    const evaluation = evaluateGoalPeriod(goal, checkins, input.date);

    const assignedForPeriod = Object.values(container.records.assignedPunishments).find(
      (record) => record.data.goalId === goal.id && record.data.periodKey === evaluation.periodKey,
    );

    let removedAssignedPunishmentId: string | undefined;

    if (assignedForPeriod && assignedForPeriod.data.status === 'pending' && evaluation.passed) {
      delete container.records.assignedPunishments[assignedForPeriod.data.id];
      setDeleted(container, 'assignedPunishments', assignedForPeriod.data.id);
      removedAssignedPunishmentId = assignedForPeriod.data.id;
    }

    return {
      evaluation,
      removedAssignedPunishmentId,
    };
  });
}

export async function completeAssignedPunishmentRecord(assignedId: string) {
  return withActiveContainer(async (container) => {
    const current = container.records.assignedPunishments[assignedId]?.data;
    if (!current) {
      throw new Error('No he encontrado el castigo asignado.');
    }

    const completed = completePunishment(current);
    setRecord(
      container,
      container.records.assignedPunishments,
      completed.id,
      completed,
      container.actorType === 'guest' ? container.guestId : undefined,
    );

    const punishment = container.records.punishments[completed.punishmentId]?.data;
    const goal = container.records.goals[completed.goalId]?.data;
    const historyEntry: CompletedPunishmentHistoryEntry = {
      assignedPunishmentId: completed.id,
      completedAt: completed.completedAt ?? nowIso(),
      goalId: goal?.id,
      goalTitle: goal?.title,
      id: buildHistoryId(completed.id),
      punishmentDescription: punishment?.description ?? 'Castigo completado.',
      punishmentId: punishment?.id,
      punishmentTitle: punishment?.title ?? 'Castigo',
    };

    setRecord(
      container,
      container.records.punishmentHistory,
      historyEntry.id,
      historyEntry,
      container.actorType === 'guest' ? container.guestId : undefined,
    );

    return completed;
  });
}

export async function addCustomPunishmentRecord(input: Omit<Punishment, 'id' | 'scope'>) {
  return withActiveContainer(async (container) => {
    const punishment: Punishment = {
      category: 'custom',
      description: input.description.trim(),
      difficulty: input.difficulty,
      id: createUuid(),
      scope: 'personal',
      title: input.title.trim(),
    };

    setRecord(
      container,
      container.records.punishments,
      punishment.id,
      punishment,
      container.actorType === 'guest' ? container.guestId : undefined,
    );

    return punishment;
  });
}

export async function updateCustomPunishmentRecord(punishmentId: string, input: Omit<Punishment, 'id' | 'scope'>) {
  return withActiveContainer(async (container) => {
    const current = container.records.punishments[punishmentId]?.data;
    if (!current || current.scope !== 'personal') {
      throw new Error('Solo se pueden editar castigos personalizados.');
    }

    const punishment: Punishment = {
      ...current,
      description: input.description.trim(),
      difficulty: input.difficulty,
      title: input.title.trim(),
    };

    setRecord(
      container,
      container.records.punishments,
      punishment.id,
      punishment,
      container.actorType === 'guest' ? container.guestId : undefined,
    );

    return punishment;
  });
}

export async function deleteCustomPunishmentRecord(punishmentId: string) {
  return withActiveContainer(async (container) => {
    delete container.records.punishments[punishmentId];
    setDeleted(container, 'punishments', punishmentId);
  });
}

export async function updateUserSettingsRecord(input: UserSettings) {
  return withActiveContainer(async (container) => {
    container.records.userSettings = container.records.userSettings
      ? touchRecord(container.records.userSettings, input, container.actorType === 'guest' ? container.guestId : undefined)
      : createSyncRecord(input, container.actorType === 'authenticated' ? 'pending_upsert' : 'synced');

    return input;
  });
}

export async function loadAssignedPunishmentDetail(assignedId: string): Promise<AssignedPunishmentDetail | null> {
  const assigned = await loadAssignedPunishmentById(assignedId);
  if (!assigned) {
    return null;
  }

  const punishment = await loadPunishmentById(assigned.punishmentId);
  if (!punishment) {
    return null;
  }

  return {
    assigned,
    punishment,
  };
}

export async function loadGoalDetail(goalId: string): Promise<GoalDetailSummary | null> {
  const { container } = await getActiveContainer();
  const { checkins, goalEvaluations } = getDerivedData(container);
  const goal = container.records.goals[goalId]?.data;
  if (!goal) {
    return null;
  }

  return buildGoalDetailSummary(goal, checkins, goalEvaluations[goal.id]);
}

export async function resetUserData() {
  return withActiveContainer(async (container) => {
    const next = createContainer({
      actorId: container.actorId,
      actorType: container.actorType,
      deviceId: container.deviceId,
      guestId: container.guestId,
    });

    seedBasePunishments(next);
    next.records.userSettings = createSyncRecord(defaultSettings, container.actorType === 'authenticated' ? 'pending_upsert' : 'synced');
    Object.assign(container, next);
  });
}
