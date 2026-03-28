export const appRoutes = {
  auth: '/auth',
  feedbackBugReport: '/feedback/bug-report',
  feedbackSuggestion: '/feedback/suggestion',
  resetPassword: '/reset-password',
  privacy: '/privacy',
  onboarding: '/onboarding',
  home: '/home',
  goals: '/goals',
  punishments: '/punishments',
  stats: '/stats',
  settings: '/settings',
  createGoal: '/goals/create',
  createPunishment: '/punishments/create',
  editPunishment: (punishmentId: string) => `/punishments/edit/${punishmentId}` as const,
  goalDetail: (goalId: string) => `/goal-detail/${goalId}` as const,
  editGoal: (goalId: string) => `/goals/edit/${goalId}` as const,
} as const;

export const mainTabPaths = ['/home', '/goals', '/punishments', '/stats', '/settings'] as const;

type MainTabPath = (typeof mainTabPaths)[number];

export function isMainTabPath(pathname: string): pathname is MainTabPath {
  return mainTabPaths.some((route) => route === pathname);
}

export function getAdjacentTabHref(pathname: string, direction: 'left' | 'right'): MainTabPath | null {
  const currentIndex = mainTabPaths.findIndex((route) => route === pathname);

  if (currentIndex === -1) {
    return null;
  }

  const targetIndex = direction === 'left' ? currentIndex + 1 : currentIndex - 1;

  if (targetIndex < 0 || targetIndex >= mainTabPaths.length) {
    return null;
  }

  return mainTabPaths[targetIndex];
}
