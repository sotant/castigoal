import { StyleSheet, Text, View } from 'react-native';

import { palette, radius } from '@/src/constants/theme';

type Props = {
  value: number;
  size?: number;
  label?: string;
  valueText?: string;
  helperText?: string;
  showDivider?: boolean;
  valueFontSize?: number;
};

export function ProgressRing({
  value,
  size = 88,
  label = 'cumplido',
  valueText,
  helperText,
  showDivider = false,
  valueFontSize = 18,
}: Props) {
  const tone = value >= 80 ? palette.success : value >= 40 ? palette.primary : palette.warning;

  return (
    <View style={[styles.outer, { width: size, height: size, borderColor: tone }]}>
      <View style={styles.inner}>
        <Text style={[styles.value, { fontSize: valueFontSize }]}>{valueText ?? `${value}%`}</Text>
        {showDivider ? <View style={[styles.divider, { backgroundColor: tone }]} /> : null}
        <Text style={styles.label}>{helperText ?? label}</Text>
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
