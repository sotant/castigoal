import { Redirect } from 'expo-router';

import { useAuth } from '@/src/hooks/use-auth';
import { appRoutes } from '@/src/navigation/app-routes';
import { useAppStore } from '@/src/store/app-store';

export default function IndexRoute() {
  const { isLoading, profile, session } = useAuth();
  const hydrated = useAppStore((state) => state.hydrated);

  if (!hydrated || isLoading) {
    return null;
  }

  if (!session) {
    return <Redirect href={appRoutes.auth} />;
  }

  return <Redirect href={profile?.onboarding_completed ? appRoutes.home : appRoutes.onboarding} />;
}
