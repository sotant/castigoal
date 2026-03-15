import { Feather, Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { StyleSheet, View } from 'react-native';

import { palette } from '@/src/constants/theme';

export function BottomNavIcon({
  color,
  focused,
  iconFamily,
  name,
  size,
  showDot = false,
}: {
  color: string;
  focused: boolean;
  iconFamily: 'ionicons' | 'feather';
  name: string;
  size: number;
  showDot?: boolean;
}) {
  const icon = iconFamily === 'ionicons'
    ? (
      <Ionicons
        color={color}
        name={focused ? (name as keyof typeof Ionicons.glyphMap) : (`${name}-outline` as keyof typeof Ionicons.glyphMap)}
        size={size}
      />
    )
    : focused
      ? <Feather color={color} name="bar-chart-2" size={size - 1} />
      : <Feather color={color} name="bar-chart" size={size - 1} />;

  return (
    <View style={[styles.iconShell, focused && styles.iconShellActive]}>
      {icon}
      {showDot ? <View style={styles.notificationDot} /> : null}
    </View>
  );
}

export function getBottomNavScreenOptions(): BottomTabNavigationOptions {
  return {
    headerShown: false,
    animation: 'shift',
    tabBarActiveTintColor: palette.primaryDeep,
    tabBarInactiveTintColor: '#708198',
    tabBarAllowFontScaling: true,
    tabBarHideOnKeyboard: true,
    tabBarLabelStyle: styles.tabBarLabel,
    tabBarItemStyle: styles.tabBarItem,
    tabBarStyle: styles.tabBar,
  };
}

const styles = StyleSheet.create({
  tabBar: {
    height: 86,
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 10,
    backgroundColor: '#FCFDFE',
    borderTopWidth: 1,
    borderTopColor: '#E6ECF4',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -3 },
    elevation: 12,
  },
  tabBarItem: {
    minHeight: 58,
    paddingTop: 2,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  iconShell: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 42,
    minHeight: 32,
    borderRadius: 16,
  },
  iconShellActive: {
    backgroundColor: '#EAF1FF',
  },
  notificationDot: {
    position: 'absolute',
    top: 1,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#FF4D4F',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
