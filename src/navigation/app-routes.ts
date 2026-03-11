export const appRoutes = {
  auth: '/auth',
  privacy: '/privacy',
  onboarding: '/onboarding',
  home: '/(tabs)/home',
  goals: '/(tabs)/goals',
  punishments: '/(tabs)/punishments',
  stats: '/(tabs)/stats',
  settings: '/(tabs)/settings',
  createGoal: '/goals/create',
  goalDetail: (goalId: string) => `/goals/${goalId}` as const,
  editGoal: (goalId: string) => `/goals/edit/${goalId}` as const,
  checkin: (goalId: string) => `/checkin/${goalId}` as const,
  punishment: (assignedId: string) => `/punishments/${assignedId}` as const,
} as const;

export const mainTabPaths = ['/home', '/goals', '/punishments', '/stats', '/settings'] as const;

type MainTabPath = (typeof mainTabPaths)[number];
type MainTabHref =
  | '/(tabs)/home'
  | '/(tabs)/goals'
  | '/(tabs)/punishments'
  | '/(tabs)/stats'
  | '/(tabs)/settings';

const mainTabHrefByPath: Record<MainTabPath, MainTabHref> = {
  '/home': '/(tabs)/home',
  '/goals': '/(tabs)/goals',
  '/punishments': '/(tabs)/punishments',
  '/stats': '/(tabs)/stats',
  '/settings': '/(tabs)/settings',
};

export function isMainTabPath(pathname: string): pathname is MainTabPath {
  return mainTabPaths.some((route) => route === pathname);
}

export function getAdjacentTabHref(pathname: string, direction: 'left' | 'right'): MainTabHref | null {
  const currentIndex = mainTabPaths.findIndex((route) => route === pathname);

  if (currentIndex === -1) {
    return null;
  }

  const targetIndex = direction === 'left' ? currentIndex + 1 : currentIndex - 1;

  if (targetIndex < 0 || targetIndex >= mainTabPaths.length) {
    return null;
  }

  return mainTabHrefByPath[mainTabPaths[targetIndex]];
}
