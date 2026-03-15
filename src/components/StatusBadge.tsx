import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { radius } from '@/src/constants/theme';

type Props = {
  active: boolean;
};

export function StatusBadge({ active }: Props) {
  return (
    <View
      accessibilityLabel={`Estado: ${active ? 'Activo' : 'Finalizado'}`}
      style={[styles.badge, active ? styles.badgeActive : styles.badgeFinalized]}>
      <Feather
        color={active ? '#177245' : '#45607E'}
        name={active ? 'play' : 'check'}
        size={11}
      />
      <Text style={[styles.label, active ? styles.labelActive : styles.labelFinalized]}>
        {active ? 'Activo' : 'Finalizado'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  badgeActive: {
    backgroundColor: '#EAF8F0',
    borderColor: '#CBECD8',
  },
  badgeFinalized: {
    backgroundColor: '#EEF4FB',
    borderColor: '#D9E4F2',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelActive: {
    color: '#177245',
  },
  labelFinalized: {
    color: '#45607E',
  },
});
