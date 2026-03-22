import { Redirect } from 'expo-router';

import { appRoutes } from '@/src/navigation/app-routes';
import { useAppStore } from '@/src/store/app-store';

export default function OnboardingRoute() {
  const goals = useAppStore((state) => state.goals);

  return <Redirect href={goals.length === 0 ? appRoutes.goals : appRoutes.home} />;
}
