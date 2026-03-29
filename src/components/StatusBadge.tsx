import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { radius } from '@/src/constants/theme';
import { commonCopy } from '@/src/i18n/common';
import { Goal } from '@/src/models/types';

type Props = {
  lifecycleStatus: Goal['lifecycleStatus'];
  resolutionStatus: Goal['resolutionStatus'];
};

function getBadgeCopy(lifecycleStatus: Goal['lifecycleStatus'], resolutionStatus: Goal['resolutionStatus']) {
  if (lifecycleStatus === 'active') {
    return {
      backgroundColor: '#EAF8F0',
      borderColor: '#CBECD8',
      color: '#177245',
      icon: 'play' as const,
      label: commonCopy.states.active,
    };
  }

  if (resolutionStatus === 'passed') {
    return {
      backgroundColor: '#ECFDF3',
      borderColor: '#C6F6D5',
      color: '#15803D',
      icon: 'check' as const,
      label: commonCopy.states.approved,
    };
  }

  if (resolutionStatus === 'failed') {
    return {
      backgroundColor: '#FEF2F2',
      borderColor: '#FECACA',
      color: '#B91C1C',
      icon: 'x' as const,
      label: commonCopy.states.failed,
    };
  }

  return {
    backgroundColor: '#EEF4FB',
    borderColor: '#D9E4F2',
    color: '#45607E',
    icon: 'square' as const,
    label: commonCopy.states.closed,
  };
}

export function StatusBadge({ lifecycleStatus, resolutionStatus }: Props) {
  const badge = getBadgeCopy(lifecycleStatus, resolutionStatus);

  return (
    <View
      accessibilityLabel={`Estado: ${badge.label}`}
      style={[styles.badge, { backgroundColor: badge.backgroundColor, borderColor: badge.borderColor }]}>
      <Feather color={badge.color} name={badge.icon} size={11} />
      <Text style={[styles.label, { color: badge.color }]}>{badge.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});
