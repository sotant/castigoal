import { Tables } from '@/src/lib/database.types';
import { createAppError, normalizeRepositoryError } from '@/src/lib/app-error';
import { supabase } from '@/src/lib/supabase';
import {
  AppBootstrapData,
  AssignedPunishment,
  Checkin,
  CompletedPunishmentHistoryEntry,
  Goal,
  GoalCalendarDay,
  GoalEvaluation,
  HomeGoalSummary,
  HomeSummary,
  PendingAssignedPunishmentSummary,
  PendingPunishmentPreview,
  Punishment,
  StatsSummary,
  UserSettings,
} from '@/src/models/types';

type GoalRow = Tables<'goals'>;
type CheckinRow = Tables<'checkins'>;
type AssignedPunishmentRow = Tables<'assigned_punishments'>;
type PunishmentRow = Tables<'punishments'>;
type UserSettingsRow = Tables<'user_settings'>;
type PunishmentCompletionHistoryRow = Tables<'punishment_completion_history'>;

type GoalEvaluationRow = {
  completed_days: number;
  completion_rate: number;
  goal_id: string;
  passed: boolean;
  period_key: string;
  planned_days: number;
  window_end: string;
  window_start: string;
};

type RecordGoalCheckinRow = {
  assigned_punishment_assigned_at: string | null;
  assigned_punishment_completed_at: string | null;
  assigned_punishment_due_date: string | null;
  assigned_punishment_goal_id: string | null;
  assigned_punishment_id: string | null;
  assigned_punishment_period_key: string | null;
  assigned_punishment_punishment_id: string | null;
  assigned_punishment_status: string | null;
  checkin_created_at: string;
  checkin_date: string;
  checkin_goal_id: string;
  checkin_id: string;
  checkin_note: string | null;
  checkin_status: string;
  evaluation_completed_days: number;
  evaluation_completion_rate: number;
  evaluation_goal_id: string;
  evaluation_passed: boolean;
  evaluation_period_key: string;
  evaluation_planned_days: number;
  evaluation_window_end: string;
  evaluation_window_start: string;
};

type HomeSummaryRow = {
  active_goals_count: number;
  pending_punishments_count: number;
  latest_pending_assigned_id: string | null;
  latest_pending_goal_id: string | null;
  latest_pending_punishment_id: string | null;
  latest_pending_due_date: string | null;
  latest_pending_status: string | null;
  latest_punishment_title: string | null;
  latest_punishment_description: string | null;
  latest_punishment_category: string | null;
  latest_punishment_difficulty: number | null;
  latest_punishment_scope: 'base' | 'personal' | null;
};

type HomeGoalSummaryRow = {
  goal_id: string;
  title: string;
  description: string | null;
  active: boolean;
  completion_rate: number;
  current_streak: number;
  best_streak: number;
  today_status: Checkin['status'] | null;
  days_until_start: number;
  remaining_days: number;
};

type StatsSummaryRow = {
  average_rate: number;
  completion_ratio: number;
  goals_active_count: number;
  completed_punishments: number;
};

type GoalCalendarDayRow = {
  date: string;
  day_number: number;
  in_month: boolean;
  status: Checkin['status'] | null;
};

type PunishmentCatalogRow = {
  id: string;
  title: string;
  description: string;
  category: Punishment['category'];
  difficulty: Punishment['difficulty'];
  scope: Punishment['scope'];
};

type PendingAssignedPunishmentRow = {
  assigned_id: string;
  goal_id: string;
  goal_title: string;
  punishment_id: string;
  punishment_title: string;
  punishment_description: string;
  punishment_category: Punishment['category'];
  punishment_difficulty: Punishment['difficulty'];
  punishment_scope: Punishment['scope'];
  assigned_at: string;
  due_date: string;
  status: AssignedPunishment['status'];
};

type CompletedPunishmentHistoryRow = Pick<
  PunishmentCompletionHistoryRow,
  'id' | 'assigned_punishment_id' | 'goal_id' | 'punishment_id' | 'punishment_title' | 'punishment_description' | 'completed_at'
> & {
  goal_title: string | null;
};

export type GoalInput = Pick<
  Goal,
  'title' | 'description' | 'startDate' | 'targetDays' | 'minimumSuccessRate' | 'active'
>;

export type CheckinInput = {
  goalId: string;
  date?: string;
  status: Checkin['status'];
  note?: string;
};

export type RecordCheckinResult = {
  assignedPunishment?: AssignedPunishment;
  checkin: Checkin;
  evaluation: GoalEvaluation;
};

function mapGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    startDate: row.start_date,
    targetDays: row.target_days,
    minimumSuccessRate: row.minimum_success_rate,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCheckin(row: CheckinRow): Checkin {
  return {
    id: row.id,
    goalId: row.goal_id,
    date: row.checkin_date,
    status: row.status as Checkin['status'],
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

function mapPunishmentFromCatalog(row: PunishmentCatalogRow): Punishment {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    difficulty: row.difficulty,
    scope: row.scope,
  };
}

function mapPunishmentRow(row: Pick<PunishmentRow, 'id' | 'title' | 'description' | 'category' | 'difficulty' | 'owner_id'>): Punishment {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category as Punishment['category'],
    difficulty: row.difficulty as Punishment['difficulty'],
    scope: row.owner_id ? 'personal' : 'base',
  };
}

function mapAssignedPunishment(row: AssignedPunishmentRow): AssignedPunishment {
  return {
    id: row.id,
    goalId: row.goal_id,
    punishmentId: row.punishment_id,
    assignedAt: row.assigned_at,
    dueDate: row.due_date,
    status: row.status as AssignedPunishment['status'],
    completedAt: row.completed_at ?? undefined,
    periodKey: row.period_key,
  };
}

function mapPendingAssignedPunishment(row: PendingAssignedPunishmentRow): PendingAssignedPunishmentSummary {
  return {
    assignedId: row.assigned_id,
    goalId: row.goal_id,
    goalTitle: row.goal_title,
    punishmentId: row.punishment_id,
    assignedAt: row.assigned_at,
    dueDate: row.due_date,
    status: row.status,
    punishment: {
      id: row.punishment_id,
      title: row.punishment_title,
      description: row.punishment_description,
      category: row.punishment_category,
      difficulty: row.punishment_difficulty,
      scope: row.punishment_scope,
    },
  };
}

function mapCompletedPunishmentHistoryEntry(row: CompletedPunishmentHistoryRow): CompletedPunishmentHistoryEntry {
  return {
    id: row.id,
    assignedPunishmentId: row.assigned_punishment_id ?? undefined,
    goalId: row.goal_id ?? undefined,
    goalTitle: row.goal_title ?? undefined,
    punishmentId: row.punishment_id ?? undefined,
    punishmentTitle: row.punishment_title,
    punishmentDescription: row.punishment_description,
    completedAt: row.completed_at,
  };
}

function mapGoalEvaluation(row: GoalEvaluationRow): GoalEvaluation {
  return {
    goalId: row.goal_id,
    periodKey: row.period_key,
    windowStart: row.window_start,
    windowEnd: row.window_end,
    plannedDays: row.planned_days,
    completedDays: row.completed_days,
    completionRate: row.completion_rate,
    passed: row.passed,
  };
}

function mapGoalEvaluations(rows: GoalEvaluationRow[]) {
  return Object.fromEntries(
    rows.map((row) => {
      const evaluation = mapGoalEvaluation(row);
      return [evaluation.goalId, evaluation];
    }),
  );
}

function mapHomeGoalSummary(row: HomeGoalSummaryRow): HomeGoalSummary {
  return {
    goalId: row.goal_id,
    title: row.title,
    description: row.description ?? undefined,
    active: row.active,
    completionRate: row.completion_rate,
    currentStreak: row.current_streak,
    bestStreak: row.best_streak,
    todayStatus: row.today_status ?? undefined,
    daysUntilStart: row.days_until_start,
    remainingDays: row.remaining_days,
  };
}

function mapPendingPunishmentPreview(row: HomeSummaryRow): PendingPunishmentPreview | undefined {
  if (
    !row.latest_pending_assigned_id ||
    !row.latest_pending_goal_id ||
    !row.latest_pending_punishment_id ||
    !row.latest_pending_due_date ||
    !row.latest_pending_status ||
    !row.latest_punishment_title ||
    !row.latest_punishment_description ||
    !row.latest_punishment_category ||
    !row.latest_punishment_difficulty ||
    !row.latest_punishment_scope
  ) {
    return undefined;
  }

  return {
    assignedId: row.latest_pending_assigned_id,
    goalId: row.latest_pending_goal_id,
    punishmentId: row.latest_pending_punishment_id,
    dueDate: row.latest_pending_due_date,
    status: row.latest_pending_status as AssignedPunishment['status'],
    punishment: {
      id: row.latest_pending_punishment_id,
      title: row.latest_punishment_title,
      description: row.latest_punishment_description,
      category: row.latest_punishment_category as Punishment['category'],
      difficulty: row.latest_punishment_difficulty as Punishment['difficulty'],
      scope: row.latest_punishment_scope,
    },
  };
}

function mapHomeSummary(summaryRow: HomeSummaryRow, goalRows: HomeGoalSummaryRow[]): HomeSummary {
  return {
    activeGoalsCount: summaryRow.active_goals_count,
    pendingPunishmentsCount: summaryRow.pending_punishments_count,
    latestPending: mapPendingPunishmentPreview(summaryRow),
    goalSummaries: goalRows.map(mapHomeGoalSummary),
  };
}

function mapStatsSummary(row: StatsSummaryRow): StatsSummary {
  return {
    averageRate: row.average_rate,
    completionRatio: row.completion_ratio,
    goalsActiveCount: row.goals_active_count,
    completedPunishments: row.completed_punishments,
  };
}

function mapGoalCalendarDay(row: GoalCalendarDayRow): GoalCalendarDay {
  return {
    date: row.date,
    dayNumber: row.day_number,
    inMonth: row.in_month,
    status: row.status ?? undefined,
  };
}

function mapUserSettings(row: UserSettingsRow): UserSettings {
  return {
    remindersEnabled: row.reminders_enabled,
    reminderHour: row.reminder_hour,
    reminderMinute: row.reminder_minute,
    pendingPunishmentReminderEnabled: row.pending_punishment_reminder_enabled,
  };
}

function mapCheckinRpcRow(row: RecordGoalCheckinRow): RecordCheckinResult {
  const evaluation: GoalEvaluation = {
    goalId: row.evaluation_goal_id,
    periodKey: row.evaluation_period_key,
    windowStart: row.evaluation_window_start,
    windowEnd: row.evaluation_window_end,
    plannedDays: row.evaluation_planned_days,
    completedDays: row.evaluation_completed_days,
    completionRate: row.evaluation_completion_rate,
    passed: row.evaluation_passed,
  };

  const checkin: Checkin = {
    id: row.checkin_id,
    goalId: row.checkin_goal_id,
    date: row.checkin_date,
    status: row.checkin_status as Checkin['status'],
    note: row.checkin_note ?? undefined,
    createdAt: row.checkin_created_at,
  };

  const assignedPunishment = row.assigned_punishment_id
    ? {
        id: row.assigned_punishment_id,
        goalId: row.assigned_punishment_goal_id!,
        punishmentId: row.assigned_punishment_punishment_id!,
        assignedAt: row.assigned_punishment_assigned_at!,
        dueDate: row.assigned_punishment_due_date!,
        status: row.assigned_punishment_status as AssignedPunishment['status'],
        completedAt: row.assigned_punishment_completed_at ?? undefined,
        periodKey: row.assigned_punishment_period_key!,
      }
    : undefined;

  return {
    assignedPunishment,
    checkin,
    evaluation,
  };
}

export async function getRequiredUserId() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'Necesitas iniciar sesion para continuar.',
      code: 'APP_GET_SESSION_FAILED',
      fallback: 'No se pudo comprobar la sesion activa.',
    });
  }

  if (!session?.user?.id) {
    throw createAppError('Necesitas iniciar sesion para continuar.', 'AUTH_REQUIRED', 'auth');
  }

  return session.user.id;
}

export async function ensureUserSettings(userId: string) {
  const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle();

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudieron cargar los ajustes.',
      code: 'SETTINGS_LOAD_FAILED',
      fallback: 'No se pudieron cargar los ajustes.',
    });
  }

  if (data) {
    return data;
  }

  const { data: created, error: upsertError } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId }, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (upsertError) {
    throw normalizeRepositoryError(upsertError, {
      authMessage: 'No se pudieron crear los ajustes iniciales.',
      code: 'SETTINGS_CREATE_FAILED',
      fallback: 'No se pudieron crear los ajustes iniciales.',
    });
  }

  return created;
}

export async function loadGoalEvaluations(referenceDate?: string) {
  const { data, error } = await supabase.rpc('list_goal_evaluations', {
    p_reference_date: referenceDate,
  });

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudieron calcular las evaluaciones de objetivos.',
      code: 'GOAL_EVALUATIONS_LOAD_FAILED',
      fallback: 'No se pudieron calcular las evaluaciones de objetivos.',
    });
  }

  return mapGoalEvaluations((data ?? []) as GoalEvaluationRow[]);
}

export async function loadHomeSummary() {
  const [summaryResult, goalsResult] = await Promise.all([
    supabase.rpc('get_home_summary').single(),
    supabase.rpc('list_home_goal_summaries'),
  ]);

  if (summaryResult.error) {
    throw normalizeRepositoryError(summaryResult.error, {
      authMessage: 'No se pudo cargar el resumen de inicio.',
      code: 'HOME_SUMMARY_LOAD_FAILED',
      fallback: 'No se pudo cargar el resumen de inicio.',
    });
  }

  if (goalsResult.error) {
    throw normalizeRepositoryError(goalsResult.error, {
      authMessage: 'No se pudieron cargar los objetivos del inicio.',
      code: 'HOME_GOALS_LOAD_FAILED',
      fallback: 'No se pudieron cargar los objetivos del inicio.',
    });
  }

  return mapHomeSummary(summaryResult.data as HomeSummaryRow, (goalsResult.data ?? []) as HomeGoalSummaryRow[]);
}

export async function loadStatsSummary(referenceDate?: string) {
  const { data, error } = await supabase
    .rpc('get_stats_summary', {
      p_reference_date: referenceDate,
    })
    .single();

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudo cargar el resumen de estadisticas.',
      code: 'STATS_SUMMARY_LOAD_FAILED',
      fallback: 'No se pudo cargar el resumen de estadisticas.',
    });
  }

  return mapStatsSummary(data as StatsSummaryRow);
}

export async function loadGoalCalendarMonth(goalId: string, monthStart: string) {
  const { data, error } = await supabase.rpc('get_goal_calendar_month', {
    p_goal_id: goalId,
    p_month_start: monthStart,
  });

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudo cargar el calendario del objetivo.',
      code: 'GOAL_CALENDAR_LOAD_FAILED',
      fallback: 'No se pudo cargar el calendario del objetivo.',
    });
  }

  return ((data ?? []) as GoalCalendarDayRow[]).map(mapGoalCalendarDay);
}

export async function loadPunishmentCatalog() {
  const { data, error } = await supabase.rpc('list_punishment_catalog');

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudo cargar el catalogo de castigos.',
      code: 'PUNISHMENT_CATALOG_LOAD_FAILED',
      fallback: 'No se pudo cargar el catalogo de castigos.',
    });
  }

  return ((data ?? []) as PunishmentCatalogRow[]).map(mapPunishmentFromCatalog);
}

export async function loadPendingPunishments() {
  const { data, error } = await supabase.rpc('list_pending_punishments');

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudieron cargar los castigos pendientes.',
      code: 'PENDING_PUNISHMENTS_LOAD_FAILED',
      fallback: 'No se pudieron cargar los castigos pendientes.',
    });
  }

  return ((data ?? []) as PendingAssignedPunishmentRow[]).map(mapPendingAssignedPunishment);
}

export async function loadCompletedPunishmentHistory(limit = 50) {
  const { data, error } = await supabase.rpc('list_punishment_completion_history', {
    p_limit: limit,
  });

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudo cargar el historico de castigos cumplidos.',
      code: 'PUNISHMENT_HISTORY_LOAD_FAILED',
      fallback: 'No se pudo cargar el historico de castigos cumplidos.',
    });
  }

  return ((data ?? []) as CompletedPunishmentHistoryRow[]).map(mapCompletedPunishmentHistoryEntry);
}

export async function loadBootstrapData(userId: string): Promise<AppBootstrapData> {
  const [goalsResult, evaluations, homeSummary, settingsRow] = await Promise.all([
    supabase.from('goals').select('*').order('created_at', { ascending: false }),
    loadGoalEvaluations(),
    loadHomeSummary(),
    ensureUserSettings(userId),
  ]);

  if (goalsResult.error) {
    throw normalizeRepositoryError(goalsResult.error, {
      authMessage: 'No se pudieron cargar los objetivos.',
      code: 'GOALS_LOAD_FAILED',
      fallback: 'No se pudieron cargar los objetivos.',
    });
  }

  return {
    goals: goalsResult.data.map(mapGoal),
    goalEvaluations: evaluations,
    homeSummary,
    userSettings: mapUserSettings(settingsRow),
  };
}

export async function loadGoalCheckinHistory(goalId: string) {
  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('goal_id', goalId)
    .order('checkin_date', { ascending: false });

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudo cargar el historial del objetivo.',
      code: 'GOAL_CHECKIN_HISTORY_LOAD_FAILED',
      fallback: 'No se pudo cargar el historial del objetivo.',
    });
  }

  return (data ?? []).map(mapCheckin);
}

export async function loadAssignedPunishmentById(assignedId: string) {
  const { data, error } = await supabase.from('assigned_punishments').select('*').eq('id', assignedId).maybeSingle();

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudo cargar el castigo asignado.',
      code: 'ASSIGNED_PUNISHMENT_LOAD_FAILED',
      fallback: 'No se pudo cargar el castigo asignado.',
    });
  }

  return data ? mapAssignedPunishment(data) : null;
}

export async function loadPunishmentById(punishmentId: string) {
  const { data, error } = await supabase
    .from('punishments')
    .select('id, title, description, category, difficulty, owner_id')
    .eq('id', punishmentId)
    .maybeSingle();

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudo cargar el castigo.',
      code: 'PUNISHMENT_LOAD_FAILED',
      fallback: 'No se pudo cargar el castigo.',
    });
  }

  return data ? mapPunishmentRow(data) : null;
}

export async function createGoalRecord(input: GoalInput) {
  const userId = await getRequiredUserId();
  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: userId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      start_date: input.startDate,
      frequency: 'daily',
      target_days: input.targetDays,
      minimum_success_rate: input.minimumSuccessRate,
      active: input.active,
    })
    .select('*')
    .single();

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudo crear el objetivo.',
      code: 'GOAL_CREATE_FAILED',
      fallback: 'No se pudo crear el objetivo.',
    });
  }

  return mapGoal(data);
}

export async function updateGoalRecord(goalId: string, input: GoalInput) {
  const { data, error } = await supabase
    .from('goals')
    .update({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      start_date: input.startDate,
      frequency: 'daily',
      target_days: input.targetDays,
      minimum_success_rate: input.minimumSuccessRate,
      active: input.active,
    })
    .eq('id', goalId)
    .select('*')
    .single();

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudo actualizar el objetivo.',
      code: 'GOAL_UPDATE_FAILED',
      fallback: 'No se pudo actualizar el objetivo.',
    });
  }

  return mapGoal(data);
}

export async function deleteGoalRecord(goalId: string) {
  const { error } = await supabase.from('goals').delete().eq('id', goalId);

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudo borrar el objetivo.',
      code: 'GOAL_DELETE_FAILED',
      fallback: 'No se pudo borrar el objetivo.',
    });
  }
}

export async function toggleGoalActiveRecord(goalId: string, active: boolean) {
  const { data, error } = await supabase
    .from('goals')
    .update({ active })
    .eq('id', goalId)
    .select('*')
    .single();

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudo cambiar el estado del objetivo.',
      code: 'GOAL_TOGGLE_FAILED',
      fallback: 'No se pudo cambiar el estado del objetivo.',
    });
  }

  return mapGoal(data);
}

export async function recordGoalCheckinRecord(input: CheckinInput & { date: string }) {
  const { data, error } = await supabase
    .rpc('record_goal_checkin', {
      p_checkin_date: input.date,
      p_goal_id: input.goalId,
      p_note: input.note?.trim() || undefined,
      p_status: input.status,
    })
    .single();

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudo registrar el check-in.',
      code: 'CHECKIN_RECORD_FAILED',
      fallback: 'No se pudo registrar el check-in.',
    });
  }

  return mapCheckinRpcRow(data as RecordGoalCheckinRow);
}

export async function completeAssignedPunishmentRecord(assignedId: string) {
  const { data, error } = await supabase.rpc('complete_assigned_punishment', {
    p_assigned_id: assignedId,
  });

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudo completar el castigo.',
      code: 'ASSIGNED_PUNISHMENT_COMPLETE_FAILED',
      fallback: 'No se pudo completar el castigo.',
    });
  }

  return mapAssignedPunishment(data);
}

export async function addCustomPunishmentRecord(input: Omit<Punishment, 'id' | 'scope'>) {
  const userId = await getRequiredUserId();
  const { data, error } = await supabase
    .from('punishments')
    .insert({
      owner_id: userId,
      title: input.title.trim(),
      description: input.description.trim(),
      category: 'custom',
      difficulty: input.difficulty,
      is_custom: true,
    })
    .select('id, title, description, category, difficulty, owner_id')
    .single();

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudo guardar el castigo personalizado.',
      code: 'PUNISHMENT_CREATE_FAILED',
      fallback: 'No se pudo guardar el castigo personalizado.',
    });
  }

  return mapPunishmentRow(data);
}

export async function updateCustomPunishmentRecord(punishmentId: string, input: Omit<Punishment, 'id' | 'scope'>) {
  const { data, error } = await supabase
    .from('punishments')
    .update({
      title: input.title.trim(),
      description: input.description.trim(),
      category: 'custom',
      difficulty: input.difficulty,
    })
    .eq('id', punishmentId)
    .eq('is_custom', true)
    .select('id, title, description, category, difficulty, owner_id')
    .single();

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudo actualizar el castigo personalizado.',
      code: 'PUNISHMENT_UPDATE_FAILED',
      fallback: 'No se pudo actualizar el castigo personalizado.',
    });
  }

  return mapPunishmentRow(data);
}

export async function deleteCustomPunishmentRecord(punishmentId: string) {
  const { error } = await supabase.rpc('delete_personal_punishment', {
    p_punishment_id: punishmentId,
  });

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudo borrar el castigo personalizado.',
      code: 'PUNISHMENT_DELETE_FAILED',
      fallback: 'No se pudo borrar el castigo personalizado.',
    });
  }
}

export async function updateUserSettingsRecord(input: UserSettings) {
  const userId = await getRequiredUserId();
  const { data, error } = await supabase
    .from('user_settings')
    .upsert(
      {
        user_id: userId,
        reminders_enabled: input.remindersEnabled,
        reminder_hour: input.reminderHour,
        reminder_minute: input.reminderMinute,
        pending_punishment_reminder_enabled: input.pendingPunishmentReminderEnabled,
      },
      { onConflict: 'user_id' },
    )
    .select('*')
    .single();

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudieron actualizar los ajustes.',
      code: 'SETTINGS_UPDATE_FAILED',
      fallback: 'No se pudieron actualizar los ajustes.',
    });
  }

  return mapUserSettings(data);
}

export async function resetUserData() {
  const userId = await getRequiredUserId();

  const historyDelete = supabase.from('punishment_completion_history').delete().eq('user_id', userId);
  const assignedDelete = supabase.from('assigned_punishments').delete().eq('user_id', userId);
  const checkinsDelete = supabase.from('checkins').delete().eq('user_id', userId);
  const goalsDelete = supabase.from('goals').delete().eq('user_id', userId);
  const customPunishmentsDelete = supabase.from('punishments').delete().eq('owner_id', userId);

  const [historyResult, assignedResult, checkinsResult, goalsResult, customPunishmentsResult] = await Promise.all([
    historyDelete,
    assignedDelete,
    checkinsDelete,
    goalsDelete,
    customPunishmentsDelete,
  ]);

  if (historyResult.error) {
    throw normalizeRepositoryError(historyResult.error, {
      authMessage: 'No se pudo borrar el historico de castigos.',
      code: 'RESET_PUNISHMENT_HISTORY_FAILED',
      fallback: 'No se pudo borrar el historico de castigos.',
    });
  }

  if (assignedResult.error) {
    throw normalizeRepositoryError(assignedResult.error, {
      authMessage: 'No se pudieron borrar los castigos asignados.',
      code: 'RESET_ASSIGNED_PUNISHMENTS_FAILED',
      fallback: 'No se pudieron borrar los castigos asignados.',
    });
  }

  if (checkinsResult.error) {
    throw normalizeRepositoryError(checkinsResult.error, {
      authMessage: 'No se pudieron borrar los check-ins.',
      code: 'RESET_CHECKINS_FAILED',
      fallback: 'No se pudieron borrar los check-ins.',
    });
  }

  if (goalsResult.error) {
    throw normalizeRepositoryError(goalsResult.error, {
      authMessage: 'No se pudieron borrar los objetivos.',
      code: 'RESET_GOALS_FAILED',
      fallback: 'No se pudieron borrar los objetivos.',
    });
  }

  if (customPunishmentsResult.error) {
    throw normalizeRepositoryError(customPunishmentsResult.error, {
      authMessage: 'No se pudieron borrar los castigos personalizados.',
      code: 'RESET_PUNISHMENTS_FAILED',
      fallback: 'No se pudieron borrar los castigos personalizados.',
    });
  }
}
