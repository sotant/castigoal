import { useLocalSearchParams } from 'expo-router';

import { PunishmentScreen } from '@/src/screens/PunishmentScreen';

export default function PunishmentRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <PunishmentScreen assignedId={id} />;
}
