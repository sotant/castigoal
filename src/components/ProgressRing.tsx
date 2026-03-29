import { StyleSheet, Text, View } from 'react-native';

import { palette, radius } from '@/src/constants/theme';
import { commonCopy } from '@/src/i18n/common';

type Props = {
  value: number;
  size?: number;
  label?: string;
  valueText?: string;
  helperText?: string;
  showDivider?: boolean;
  valueFontSize?: number;
  toneColor?: string;
  valueColor?: string;
  helperColor?: string;
};

export function ProgressRing({
  value,
  size = 88,
  label = commonCopy.states.completed.toLowerCase(),
  valueText,
  helperText,
  showDivider = false,
  valueFontSize = 18,
  toneColor,
  valueColor,
  helperColor,
}: Props) {
  const tone = toneColor ?? (value >= 80 ? palette.success : value >= 40 ? palette.primary : palette.warning);

  return (
    <View style={[styles.outer, { width: size, height: size, borderColor: tone }]}>
      <View style={styles.inner}>
        <Text style={[styles.value, { color: valueColor ?? styles.value.color, fontSize: valueFontSize }]}>
          {valueText ?? `${value}%`}
        </Text>
        {showDivider ? <View style={[styles.divider, { backgroundColor: tone }]} /> : null}
        <Text style={[styles.label, helperColor ? { color: helperColor } : null]}>{helperText ?? label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderWidth: 8,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.snow,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
  },
  divider: {
    width: 34,
    height: 3,
    borderRadius: radius.pill,
    marginVertical: 6,
  },
  label: {
    fontSize: 10,
    color: palette.slate,
  },
});
