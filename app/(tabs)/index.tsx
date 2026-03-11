import { Redirect } from 'expo-router';

import { appRoutes } from '@/src/navigation/app-routes';

export default function TabsIndexRoute() {
  return <Redirect href={appRoutes.home} />;
}
