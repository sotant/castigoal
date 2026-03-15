import { useLocalSearchParams } from 'expo-router';

import { GoalDetailScreen } from '@/src/screens/GoalDetailScreen';
import { useAppStore } from '@/src/store/app-store';

export default function GoalDetailTabRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goal = useAppStore((state) => state.goals.find((item) => item.id === id));

  return <GoalDetailScreen goal={goal} />;
}
