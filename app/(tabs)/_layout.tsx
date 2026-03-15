import { Tabs } from 'expo-router';

import { BottomNavIcon, getBottomNavScreenOptions } from '@/src/components/BottomNav';
import { useAppStore } from '@/src/store/app-store';

export default function TabLayout() {
  const pendingPunishmentsCount = useAppStore((state) => state.homeSummary.pendingPunishmentsCount);

  return (
    <Tabs
      screenOptions={getBottomNavScreenOptions()}>
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Hoy',
          tabBarIcon: ({ color, focused, size }) => (
            <BottomNavIcon color={color} focused={focused} iconFamily="ionicons" name="home" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Objetivos',
          tabBarIcon: ({ color, focused, size }) => (
            <BottomNavIcon color={color} focused={focused} iconFamily="ionicons" name="compass" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="goal-detail/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="punishments"
        options={{
          title: 'Castigos',
          tabBarIcon: ({ color, focused, size }) => (
            <BottomNavIcon
              color={color}
              focused={focused}
              iconFamily="ionicons"
              name="notifications"
              showDot={pendingPunishmentsCount > 0}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, focused, size }) => (
            <BottomNavIcon color={color} focused={focused} iconFamily="feather" name="stats" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, focused, size }) => (
            <BottomNavIcon color={color} focused={focused} iconFamily="ionicons" name="settings" size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
