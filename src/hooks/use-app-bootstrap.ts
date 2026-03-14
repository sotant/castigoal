import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useAuth } from '@/src/hooks/use-auth';
import { useAppStore } from '@/src/store/app-store';
import { clearReminderScheduleUseCase, syncPersistedReminderSettingsUseCase } from '@/src/use-cases/settings-actions';

export function useAppBootstrap() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { hydrated, initializeApp, settings } = useAppStore(
    useShallow((state) => ({
      hydrated: state.hydrated,
      initializeApp: state.initializeApp,
      settings: state.userSettings,
    })),
  );

  useEffect(() => {
    void initializeApp();
    if (!userId) {
      void clearReminderScheduleUseCase();
    }
  }, [initializeApp, userId]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    void syncPersistedReminderSettingsUseCase(settings);
  }, [hydrated, settings]);
}
