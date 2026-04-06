import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { useAuth } from '@/src/hooks/use-auth';
import { useAppStore } from '@/src/store/app-store';
import { clearReminderScheduleUseCase, syncPersistedReminderSettingsUseCase } from '@/src/use-cases/settings-actions';

export function useAppBootstrap() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { goals, hydrated, initializeApp, pendingPunishmentsCount, settings } = useAppStore(
    useShallow((state) => ({
      goals: state.goals,
      hydrated: state.hydrated,
      initializeApp: state.initializeApp,
      pendingPunishmentsCount: state.homeSummary.pendingPunishmentsCount,
      settings: state.userSettings,
    })),
  );

  useEffect(() => {
    void initializeApp();
  }, [initializeApp, userId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void initializeApp();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [initializeApp]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    void syncPersistedReminderSettingsUseCase(settings, goals, pendingPunishmentsCount > 0);
  }, [goals, hydrated, pendingPunishmentsCount, settings]);

  useEffect(() => {
    return () => {
      if (!userId) {
        void clearReminderScheduleUseCase();
      }
    };
  }, [userId]);
}
