import { useLocalSearchParams } from 'expo-router';

import { CheckinScreen } from '@/src/screens/CheckinScreen';
import { useAppStore } from '@/src/store/app-store';

export default function CheckinRoute() {
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const goal = useAppStore((state) => state.goals.find((item) => item.id === goalId));

  return <CheckinScreen goal={goal} />;
}
