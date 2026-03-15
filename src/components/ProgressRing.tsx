import { StyleSheet, Text, View } from 'react-native';

import { palette, radius } from '@/src/constants/theme';

type Props = {
  value: number;
  size?: number;
  label?: string;
};

export function ProgressRing({ value, size = 88, label = 'cumplido' }: Props) {
  const tone = value >= 80 ? palette.success : value >= 40 ? palette.primary : palette.warning;

  return (
    <View style={[styles.outer, { width: size, height: size, borderColor: tone }]}>
      <View style={styles.inner}>
        <Text style={styles.value}>{value}%</Text>
        <Text style={styles.label}>{label}</Text>
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
  label: {
    fontSize: 10,
    color: palette.slate,
    textTransform: 'uppercase',
  },
});
