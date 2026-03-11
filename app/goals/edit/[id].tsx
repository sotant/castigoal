import { useLocalSearchParams } from 'expo-router';

import { GoalFormScreen } from '@/src/screens/GoalFormScreen';
import { useAppStore } from '@/src/store/app-store';

export default function EditGoalRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goal = useAppStore((state) => state.goals.find((item) => item.id === id));

  return <GoalFormScreen mode="edit" goal={goal} />;
}
