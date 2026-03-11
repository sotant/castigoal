import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useAuth } from '@/src/hooks/use-auth';
import { useAppStore } from '@/src/store/app-store';
import { clearReminderScheduleUseCase, syncPersistedReminderSettingsUseCase } from '@/src/use-cases/settings-actions';

export function useAppBootstrap() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { clearRemoteState, hydrated, initializeApp, settings } = useAppStore(
    useShallow((state) => ({
      clearRemoteState: state.clearRemoteState,
      hydrated: state.hydrated,
      initializeApp: state.initializeApp,
      settings: state.userSettings,
    })),
  );

  useEffect(() => {
    if (!userId) {
      clearRemoteState();
      void clearReminderScheduleUseCase();
      return;
    }

    void initializeApp();
  }, [clearRemoteState, initializeApp, userId]);

  useEffect(() => {
    if (!hydrated || !userId) {
      return;
    }

    void syncPersistedReminderSettingsUseCase(settings);
  }, [hydrated, settings, userId]);
}