import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BottomNavIcon, getBottomNavScreenOptions } from '@/src/components/BottomNav';
import { navigationCopy } from '@/src/i18n/navigation';
import { useAppStore } from '@/src/store/app-store';

export default function TabLayout() {
  useTranslation();
  const pendingPunishmentsCount = useAppStore((state) => state.homeSummary.pendingPunishmentsCount);

  return (
    <Tabs
      backBehavior="history"
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
          title: navigationCopy.tabs.home,
          tabBarIcon: ({ color, focused, size }) => (
            <BottomNavIcon color={color} focused={focused} iconFamily="ionicons" name="home" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: navigationCopy.tabs.goals,
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
          title: navigationCopy.tabs.punishments,
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
          title: navigationCopy.tabs.stats,
          tabBarIcon: ({ color, focused, size }) => (
            <BottomNavIcon color={color} focused={focused} iconFamily="feather" name="stats" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: navigationCopy.tabs.settings,
          tabBarIcon: ({ color, focused, size }) => (
            <BottomNavIcon color={color} focused={focused} iconFamily="ionicons" name="settings" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="feedback/suggestion"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="feedback/bug-report"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
