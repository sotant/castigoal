import { Redirect, useLocalSearchParams } from 'expo-router';

import { appRoutes } from '@/src/navigation/app-routes';

export default function GoalDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return null;
  }

  return <Redirect href={appRoutes.goalDetail(id)} />;
}
