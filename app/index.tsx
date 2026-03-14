import { Redirect } from 'expo-router';

import { appRoutes } from '@/src/navigation/app-routes';
import { useAppStore } from '@/src/store/app-store';

export default function IndexRoute() {
  const hydrated = useAppStore((state) => state.hydrated);

  if (!hydrated) {
    return null;
  }

  return <Redirect href={appRoutes.home} />;
}
