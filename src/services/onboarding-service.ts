import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';

import { normalizeRepositoryError } from '@/src/lib/app-error';
import { supabase } from '@/src/lib/supabase';
import { loadProgressSignals } from '@/src/services/progress-service';
import type {
  OnboardingDecision,
  OnboardingEventName,
  OnboardingProgressSignal,
  OnboardingSnapshot,
  OnboardingState,
  OnboardingStatus,
} from '@/src/features/onboarding/types';

const ONBOARDING_STORAGE_PREFIX = 'castigoal.v1.onboarding';
const ONBOARDING_STATE_KEY = `${ONBOARDING_STORAGE_PREFIX}.state`;
const ONBOARDING_USER_ID_KEY = `${ONBOARDING_STORAGE_PREFIX}.local-user-id`;
const ONBOARDING_VERSION = 1;
const INTRO_SLIDE_MAX_INDEX = 2;

const memoryStorage = new Map<string, string>();

type AnalyticsPayload = Record<string, unknown>;
type AnalyticsHandler = (eventName: OnboardingEventName, payload: AnalyticsPayload) => void;

let analyticsHandler: AnalyticsHandler | null = null;

function nowIso() {
  return new Date().toISOString();
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

async function getStorageItem(key: string) {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.warn('[onboarding] AsyncStorage get failed. Falling back to memory storage.', error);
    return memoryStorage.get(key) ?? null;
  }
}

async function setStorageItem(key: string, value: string) {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.warn('[onboarding] AsyncStorage set failed. Falling back to memory storage.', error);
    memoryStorage.set(key, value);
  }
}

async function removeStorageItem(key: string) {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.warn('[onboarding] AsyncStorage remove failed. Falling back to memory storage.', error);
    memoryStorage.delete(key);
  }
}

async function getOrCreateLocalUserId() {
  const saved = await getStorageItem(ONBOARDING_USER_ID_KEY);
  if (saved) {
    return saved;
  }

  const nextId = createUuid();
  await setStorageItem(ONBOARDING_USER_ID_KEY, nextId);
  return nextId;
}

function buildDefaultState(localUserId: string): OnboardingState {
  const timestamp = nowIso();
  return {
    localUserId,
    hasSeenOnboarding: false,
    isCompleted: false,
    isSkipped: false,
    currentStep: 'not_started',
    introSlideIndex: 0,
    goalCreationHighlightDismissed: false,
    todayProgressTooltipSeen: false,
    todayActionTooltipSeen: false,
    todayCastigoTooltipSeen: false,
    punishmentsTooltipSeen: false,
    punishmentsReinforcementSeen: false,
    statsTooltipSeen: false,
    onboardingVersion: ONBOARDING_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
    hasCreatedFirstGoal: false,
    hasLoggedFirstDay: false,
  };
}

function sanitizeStoredState(raw: Partial<OnboardingState> | null, localUserId: string) {
  const base = buildDefaultState(localUserId);

  if (!raw) {
    return base;
  }

  const sanitizedIntroSlideIndex =
    typeof raw.introSlideIndex === 'number' && Number.isFinite(raw.introSlideIndex)
      ? Math.max(Math.min(raw.introSlideIndex, INTRO_SLIDE_MAX_INDEX), 0)
      : 0;

  return {
    ...base,
    ...raw,
    localUserId,
    currentStep: isValidStatus(raw.currentStep) ? raw.currentStep : base.currentStep,
    onboardingVersion: typeof raw.onboardingVersion === 'number' ? raw.onboardingVersion : ONBOARDING_VERSION,
    hasSeenOnboarding: Boolean(raw.hasSeenOnboarding),
    isCompleted: Boolean(raw.isCompleted),
    isSkipped: Boolean(raw.isSkipped),
    introSlideIndex: sanitizedIntroSlideIndex,
    goalCreationHighlightDismissed: Boolean(raw.goalCreationHighlightDismissed),
    todayProgressTooltipSeen: Boolean(raw.todayProgressTooltipSeen),
    todayActionTooltipSeen: Boolean(raw.todayActionTooltipSeen),
    todayCastigoTooltipSeen: Boolean(raw.todayCastigoTooltipSeen),
    punishmentsTooltipSeen: Boolean(raw.punishmentsTooltipSeen),
    punishmentsReinforcementSeen: Boolean(raw.punishmentsReinforcementSeen),
    statsTooltipSeen: Boolean(raw.statsTooltipSeen),
    hasCreatedFirstGoal: Boolean(raw.hasCreatedFirstGoal),
    hasLoggedFirstDay: Boolean(raw.hasLoggedFirstDay),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : base.createdAt,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : base.updatedAt,
  } satisfies OnboardingState;
}

function isValidStatus(value: unknown): value is OnboardingStatus {
  return (
    value === 'not_started' ||
    value === 'intro_pending' ||
    value === 'goal_creation_pending' ||
    value === 'daily_tracking_pending' ||
    value === 'punishments_pending' ||
    value === 'completed' ||
    value === 'skipped'
  );
}

async function readLocalState() {
  const localUserId = await getOrCreateLocalUserId();
  const stored = await getStorageItem(ONBOARDING_STATE_KEY);

  if (!stored) {
    const created = buildDefaultState(localUserId);
    await persistLocalState(created);
    return created;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<OnboardingState>;
    const sanitized = sanitizeStoredState(parsed, localUserId);
    if (JSON.stringify(parsed) !== JSON.stringify(sanitized)) {
      await persistLocalState(sanitized);
    }
    return sanitized;
  } catch (error) {
    console.warn('[onboarding] Corrupted local state detected. Resetting onboarding state.', error);
    const reset = buildDefaultState(localUserId);
    await persistLocalState(reset);
    return reset;
  }
}

async function persistLocalState(state: OnboardingState) {
  await setStorageItem(ONBOARDING_STATE_KEY, JSON.stringify(state));
}

function deriveStep(state: OnboardingState): OnboardingStatus {
  if (state.isCompleted) {
    return 'completed';
  }

  if (state.hasCreatedFirstGoal && state.hasLoggedFirstDay) {
    return 'punishments_pending';
  }

  if (state.hasCreatedFirstGoal) {
    return 'daily_tracking_pending';
  }

  if (!state.hasSeenOnboarding && !state.isSkipped && state.currentStep === 'not_started') {
    return 'not_started';
  }

  if ((!state.hasSeenOnboarding || state.currentStep === 'intro_pending') && !state.isSkipped) {
    return 'intro_pending';
  }

  if (state.hasSeenOnboarding || state.isSkipped) {
    return 'goal_creation_pending';
  }

  return 'not_started';
}

function buildDecision(state: OnboardingState): OnboardingDecision {
  const activeStep = deriveStep(state);
  const shouldShowIntro = activeStep === 'not_started' || activeStep === 'intro_pending';
  const shouldGuideGoalCreation = activeStep === 'goal_creation_pending' && !state.hasCreatedFirstGoal;
  const shouldGuidePunishments = activeStep === 'punishments_pending' && !state.isCompleted;
  const shouldGuideStats = state.isCompleted && !state.statsTooltipSeen;
  const shouldShowOnboarding = shouldShowIntro;

  return {
    shouldShowOnboarding,
    shouldShowIntro,
    shouldGuideGoalCreation,
    shouldGuidePunishments,
    shouldGuideStats,
    shouldResume:
      (state.hasSeenOnboarding || state.isSkipped) &&
      (shouldShowIntro || shouldGuideGoalCreation || shouldGuidePunishments),
    activeStep,
    canSkip: shouldShowIntro,
  };
}

function mergeSignalsIntoState(state: OnboardingState, signal: OnboardingProgressSignal): OnboardingState {
  const hasCreatedFirstGoal = state.hasCreatedFirstGoal || signal.goalCount > 0;
  const hasLoggedFirstDay = state.hasLoggedFirstDay || signal.checkinCount > 0;
  const isCompleted = state.isCompleted;
  const nextStep = deriveStep({
    ...state,
    hasCreatedFirstGoal,
    hasLoggedFirstDay,
    isCompleted,
  });

  if (
    hasCreatedFirstGoal === state.hasCreatedFirstGoal &&
    hasLoggedFirstDay === state.hasLoggedFirstDay &&
    isCompleted === state.isCompleted &&
    nextStep === state.currentStep
  ) {
    return state;
  }

  return {
    ...state,
    hasCreatedFirstGoal,
    hasLoggedFirstDay,
    isCompleted,
    goalCreationHighlightDismissed: hasCreatedFirstGoal ? true : state.goalCreationHighlightDismissed,
    currentStep: nextStep,
    updatedAt: nowIso(),
  };
}

async function fetchRemoteState(session: Session) {
  const { data, error } = await supabase
    .from('onboarding_state' as never)
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudo cargar el onboarding remoto.',
      code: 'ONBOARDING_REMOTE_LOAD_FAILED',
      fallback: 'No se pudo cargar el onboarding remoto.',
    });
  }

  if (!data || typeof data !== 'object') {
    return null;
  }

  return sanitizeStoredState(
    {
      localUserId: typeof data.local_user_id === 'string' ? data.local_user_id : undefined,
      hasSeenOnboarding: Boolean(data.has_seen_onboarding),
      isCompleted: Boolean(data.is_completed),
      isSkipped: Boolean(data.is_skipped),
      currentStep: typeof data.current_step === 'string' ? data.current_step : undefined,
      onboardingVersion: typeof data.onboarding_version === 'number' ? data.onboarding_version : undefined,
      createdAt: typeof data.created_at === 'string' ? data.created_at : undefined,
      updatedAt: typeof data.updated_at === 'string' ? data.updated_at : undefined,
      hasCreatedFirstGoal: Boolean(data.has_created_first_goal),
      hasLoggedFirstDay: Boolean(data.has_logged_first_day),
    },
    typeof data.local_user_id === 'string' ? data.local_user_id : await getOrCreateLocalUserId(),
  );
}

async function upsertRemoteState(session: Session, state: OnboardingState) {
  const payload = {
    user_id: session.user.id,
    local_user_id: state.localUserId,
    has_seen_onboarding: state.hasSeenOnboarding,
    is_completed: state.isCompleted,
    is_skipped: state.isSkipped,
    current_step: state.currentStep,
    onboarding_version: state.onboardingVersion,
    created_at: state.createdAt,
    updated_at: state.updatedAt,
    has_created_first_goal: state.hasCreatedFirstGoal,
    has_logged_first_day: state.hasLoggedFirstDay,
  };

  const { error } = await supabase.from('onboarding_state' as never).upsert(payload, { onConflict: 'user_id' });

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: 'No se pudo guardar el onboarding remoto.',
      code: 'ONBOARDING_REMOTE_SAVE_FAILED',
      fallback: 'No se pudo guardar el onboarding remoto.',
    });
  }

  if (state.isCompleted) {
    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: session.user.id,
        onboarding_completed: true,
      },
      { onConflict: 'id' },
    );

    if (profileError) {
      throw normalizeRepositoryError(profileError, {
        authMessage: 'No se pudo actualizar el perfil con el estado del onboarding.',
        code: 'ONBOARDING_PROFILE_SYNC_FAILED',
        fallback: 'No se pudo actualizar el perfil con el estado del onboarding.',
      });
    }
  }
}

async function loadRemoteSignals(session: Session): Promise<OnboardingProgressSignal> {
  const [goalsResult, checkinsResult] = await Promise.all([
    supabase.from('goals').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id),
    supabase.from('checkins').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id),
  ]);

  if (goalsResult.error || checkinsResult.error) {
    throw normalizeRepositoryError(goalsResult.error ?? checkinsResult.error, {
      authMessage: 'No se pudo consultar el progreso remoto del onboarding.',
      code: 'ONBOARDING_REMOTE_PROGRESS_FAILED',
      fallback: 'No se pudo consultar el progreso remoto del onboarding.',
    });
  }

  return {
    goalCount: goalsResult.count ?? 0,
    checkinCount: checkinsResult.count ?? 0,
  };
}

function getNewestState(localState: OnboardingState, remoteState: OnboardingState | null) {
  if (!remoteState) {
    return localState;
  }

  return remoteState.updatedAt > localState.updatedAt ? remoteState : localState;
}

async function loadSignals(session: Session | null) {
  const localSignal = await loadProgressSignals();

  if (!session) {
    return localSignal;
  }

  try {
    const remoteSignal = await loadRemoteSignals(session);
    return {
      goalCount: Math.max(localSignal.goalCount, remoteSignal.goalCount),
      checkinCount: Math.max(localSignal.checkinCount, remoteSignal.checkinCount),
    };
  } catch (error) {
    console.warn('[onboarding] Remote progress reconciliation failed. Using local signals only.', error);
    return localSignal;
  }
}

async function saveAndSync(state: OnboardingState, session: Session | null) {
  await persistLocalState(state);

  if (!session) {
    return state;
  }

  try {
    await upsertRemoteState(session, state);
  } catch (error) {
    console.warn('[onboarding] Remote onboarding sync failed.', error);
  }

  return state;
}

function emitEvent(eventName: OnboardingEventName, payload: AnalyticsPayload) {
  try {
    analyticsHandler?.(eventName, payload);
  } catch (error) {
    console.warn('[onboarding] Analytics handler failed.', error);
  }
}

export function setOnboardingAnalyticsHandler(handler: AnalyticsHandler | null) {
  analyticsHandler = handler;
}

export async function bootstrapOnboarding(session: Session | null): Promise<OnboardingSnapshot> {
  const localState = await readLocalState();
  let workingState = localState;

  if (session) {
    try {
      const remoteState = await fetchRemoteState(session);
      workingState = getNewestState(localState, remoteState);
      if (workingState !== localState) {
        await persistLocalState(workingState);
      }
    } catch (error) {
      console.warn('[onboarding] Remote state load failed. Keeping local onboarding state.', error);
    }
  }

  const signals = await loadSignals(session);
  const reconciled = mergeSignalsIntoState(workingState, signals);

  if (reconciled.updatedAt !== workingState.updatedAt || reconciled.currentStep !== workingState.currentStep) {
    await saveAndSync(reconciled, session);
  } else if (session) {
    void saveAndSync(reconciled, session);
  }

  return {
    state: reconciled,
    decision: buildDecision(reconciled),
  };
}

export async function markOnboardingStarted(session: Session | null) {
  const snapshot = await bootstrapOnboarding(session);
  const current = snapshot.state;

  if (current.hasSeenOnboarding || current.isSkipped || current.isCompleted) {
    return snapshot;
  }

  const nextState: OnboardingState = {
    ...current,
    currentStep: 'intro_pending',
    updatedAt: nowIso(),
  };

  await saveAndSync(nextState, session);
  emitEvent('onboarding_started', { localUserId: nextState.localUserId });
  emitEvent('onboarding_intro_viewed', { localUserId: nextState.localUserId, slideIndex: nextState.introSlideIndex });
  return {
    state: nextState,
    decision: buildDecision(nextState),
  };
}

export async function markOnboardingStepViewed(step: OnboardingStatus, session: Session | null) {
  const snapshot = await bootstrapOnboarding(session);
  const nextState: OnboardingState = {
    ...snapshot.state,
    currentStep: step,
    updatedAt: nowIso(),
  };

  await saveAndSync(nextState, session);
  emitEvent('onboarding_step_viewed', { localUserId: nextState.localUserId, step });
  if (step === 'intro_pending') {
    emitEvent('onboarding_intro_viewed', {
      localUserId: nextState.localUserId,
      slideIndex: nextState.introSlideIndex,
    });
  }
  if (step === 'goal_creation_pending') {
    emitEvent('onboarding_goal_cta_highlight_viewed', { localUserId: nextState.localUserId });
  }
  return {
    state: nextState,
    decision: buildDecision(nextState),
  };
}

export async function setOnboardingIntroSlide(index: number, session: Session | null) {
  const snapshot = await bootstrapOnboarding(session);
  const nextState: OnboardingState = {
    ...snapshot.state,
    currentStep: 'intro_pending',
    introSlideIndex: Math.max(Math.min(index, INTRO_SLIDE_MAX_INDEX), 0),
    updatedAt: nowIso(),
  };

  await saveAndSync(nextState, session);
  return {
    state: nextState,
    decision: buildDecision(nextState),
  };
}

export async function completeOnboardingIntro(session: Session | null) {
  const snapshot = await bootstrapOnboarding(session);
  const nextState: OnboardingState = {
    ...snapshot.state,
    hasSeenOnboarding: true,
    isSkipped: false,
    currentStep: snapshot.state.hasCreatedFirstGoal ? 'daily_tracking_pending' : 'goal_creation_pending',
    introSlideIndex: INTRO_SLIDE_MAX_INDEX,
    updatedAt: nowIso(),
  };

  await saveAndSync(nextState, session);
  emitEvent('onboarding_intro_completed', { localUserId: nextState.localUserId });
  return {
    state: nextState,
    decision: buildDecision(nextState),
  };
}

export async function skipOnboarding(session: Session | null) {
  const snapshot = await bootstrapOnboarding(session);
  const nextState: OnboardingState = {
    ...snapshot.state,
    hasSeenOnboarding: true,
    isSkipped: true,
    currentStep: snapshot.state.hasCreatedFirstGoal ? 'daily_tracking_pending' : 'goal_creation_pending',
    goalCreationHighlightDismissed: false,
    updatedAt: nowIso(),
  };

  await saveAndSync(nextState, session);
  emitEvent('onboarding_skipped', { localUserId: nextState.localUserId });
  emitEvent('onboarding_intro_skipped', { localUserId: nextState.localUserId });
  return {
    state: nextState,
    decision: buildDecision(nextState),
  };
}

export async function reconcileOnboarding(session: Session | null) {
  return bootstrapOnboarding(session);
}

export async function completeOnboarding(session: Session | null) {
  const snapshot = await bootstrapOnboarding(session);
  const nextState: OnboardingState = {
    ...snapshot.state,
    hasSeenOnboarding: true,
    isCompleted: true,
    hasLoggedFirstDay: true,
    currentStep: 'completed',
    updatedAt: nowIso(),
  };

  await saveAndSync(nextState, session);
  emitEvent('onboarding_completed', { localUserId: nextState.localUserId });
  return {
    state: nextState,
    decision: buildDecision(nextState),
  };
}

export async function dismissGoalCreationHighlight(session: Session | null) {
  const snapshot = await bootstrapOnboarding(session);
  const nextState: OnboardingState = {
    ...snapshot.state,
    goalCreationHighlightDismissed: true,
    updatedAt: nowIso(),
  };

  await saveAndSync(nextState, session);
  return {
    state: nextState,
    decision: buildDecision(nextState),
  };
}

export async function markGoalCreationStarted(session: Session | null) {
  const snapshot = await bootstrapOnboarding(session);
  emitEvent('onboarding_goal_creation_started', { localUserId: snapshot.state.localUserId });
  return snapshot;
}

export async function markGoalCreationCompleted(session: Session | null) {
  const snapshot = await bootstrapOnboarding(session);
  emitEvent('onboarding_goal_creation_completed', { localUserId: snapshot.state.localUserId });
  return snapshot;
}

export async function markTodayScreenViewed(session: Session | null) {
  const snapshot = await bootstrapOnboarding(session);
  emitEvent('onboarding_today_viewed', { localUserId: snapshot.state.localUserId });
  return snapshot;
}

async function updateTooltipFlag(
  session: Session | null,
  input: {
    eventName: OnboardingEventName;
    key:
      | 'todayProgressTooltipSeen'
      | 'todayActionTooltipSeen'
      | 'todayCastigoTooltipSeen'
      | 'punishmentsTooltipSeen'
      | 'punishmentsReinforcementSeen'
      | 'statsTooltipSeen';
  },
) {
  const snapshot = await bootstrapOnboarding(session);

  if (snapshot.state[input.key]) {
    return snapshot;
  }

  const nextState: OnboardingState = {
    ...snapshot.state,
    [input.key]: true,
    updatedAt: nowIso(),
  };

  await saveAndSync(nextState, session);
  emitEvent(input.eventName, { localUserId: nextState.localUserId });

  return {
    state: nextState,
    decision: buildDecision(nextState),
  };
}

export async function markTodayProgressTooltipSeen(session: Session | null) {
  return updateTooltipFlag(session, {
    key: 'todayProgressTooltipSeen',
    eventName: 'onboarding_progress_tooltip_seen',
  });
}

export async function markTodayActionTooltipSeen(session: Session | null) {
  return updateTooltipFlag(session, {
    key: 'todayActionTooltipSeen',
    eventName: 'onboarding_action_tooltip_seen',
  });
}

export async function markTodayCastigoTooltipSeen(session: Session | null) {
  return updateTooltipFlag(session, {
    key: 'todayCastigoTooltipSeen',
    eventName: 'onboarding_castigo_message_seen',
  });
}

export async function markFirstCheckinCompleted(session: Session | null) {
  const snapshot = await bootstrapOnboarding(session);
  emitEvent('onboarding_first_checkin_completed', { localUserId: snapshot.state.localUserId });
  return snapshot;
}

export async function markPunishmentsTooltipSeen(session: Session | null) {
  return updateTooltipFlag(session, {
    key: 'punishmentsTooltipSeen',
    eventName: 'onboarding_castigos_viewed',
  });
}

export async function markPunishmentsReinforcementSeen(session: Session | null) {
  return updateTooltipFlag(session, {
    key: 'punishmentsReinforcementSeen',
    eventName: 'onboarding_castigos_viewed',
  });
}

export async function markStatsTooltipSeen(session: Session | null) {
  return updateTooltipFlag(session, {
    key: 'statsTooltipSeen',
    eventName: 'onboarding_stats_viewed',
  });
}

export async function resetOnboarding(session: Session | null) {
  const nextState = buildDefaultState(await getOrCreateLocalUserId());
  await saveAndSync(nextState, session);
  return {
    state: nextState,
    decision: buildDecision(nextState),
  };
}

export async function clearOnboardingStorage() {
  await Promise.all([removeStorageItem(ONBOARDING_STATE_KEY), removeStorageItem(ONBOARDING_USER_ID_KEY)]);
}
