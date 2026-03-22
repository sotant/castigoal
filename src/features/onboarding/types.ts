export type OnboardingStatus =
  | 'not_started'
  | 'intro_pending'
  | 'goal_creation_pending'
  | 'daily_tracking_pending'
  | 'punishments_pending'
  | 'completed'
  | 'skipped';

export type OnboardingEventName =
  | 'onboarding_started'
  | 'onboarding_skipped'
  | 'onboarding_step_viewed'
  | 'onboarding_completed'
  | 'onboarding_intro_viewed'
  | 'onboarding_intro_skipped'
  | 'onboarding_intro_completed'
  | 'onboarding_goal_cta_highlight_viewed'
  | 'onboarding_goal_creation_started'
  | 'onboarding_goal_creation_completed'
  | 'onboarding_today_viewed'
  | 'onboarding_progress_tooltip_seen'
  | 'onboarding_action_tooltip_seen'
  | 'onboarding_first_checkin_completed'
  | 'onboarding_castigo_message_seen'
  | 'onboarding_castigos_viewed'
  | 'onboarding_stats_viewed';

export interface OnboardingState {
  localUserId: string;
  hasSeenOnboarding: boolean;
  isCompleted: boolean;
  isSkipped: boolean;
  currentStep: OnboardingStatus;
  introSlideIndex: number;
  goalCreationHighlightDismissed: boolean;
  todayProgressTooltipSeen: boolean;
  todayActionTooltipSeen: boolean;
  todayCastigoTooltipSeen: boolean;
  punishmentsTooltipSeen: boolean;
  punishmentsReinforcementSeen: boolean;
  statsTooltipSeen: boolean;
  onboardingVersion: number;
  createdAt: string;
  updatedAt: string;
  hasCreatedFirstGoal: boolean;
  hasLoggedFirstDay: boolean;
}

export interface OnboardingProgressSignal {
  goalCount: number;
  checkinCount: number;
}

export interface OnboardingDecision {
  shouldShowOnboarding: boolean;
  shouldShowIntro: boolean;
  shouldGuideGoalCreation: boolean;
  shouldGuidePunishments: boolean;
  shouldGuideStats: boolean;
  shouldResume: boolean;
  activeStep: OnboardingStatus;
  canSkip: boolean;
}

export interface OnboardingSnapshot {
  decision: OnboardingDecision;
  state: OnboardingState;
}
