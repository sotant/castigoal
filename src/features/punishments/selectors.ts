import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useAppStore } from '@/src/store/app-store';

export function usePunishmentCatalog() {
  const {
    addCustomPunishment,
    deleteCustomPunishment,
    punishments,
    punishmentsLoaded,
    refreshPunishmentCatalog,
    updateCustomPunishment,
  } = useAppStore(
    useShallow((state) => ({
      addCustomPunishment: state.addCustomPunishment,
      deleteCustomPunishment: state.deleteCustomPunishment,
      punishments: state.punishments,
      punishmentsLoaded: state.punishmentsLoaded,
      refreshPunishmentCatalog: state.refreshPunishmentCatalog,
      updateCustomPunishment: state.updateCustomPunishment,
    })),
  );

  return useMemo(
    () => ({
      addCustomPunishment,
      basePunishments: punishments.filter((item) => item.scope === 'base'),
      deleteCustomPunishment,
      personalPunishments: punishments
        .filter((item) => item.scope === 'personal')
        .sort((left, right) => {
          const leftCreatedAt = left.createdAt ?? '';
          const rightCreatedAt = right.createdAt ?? '';
          return rightCreatedAt.localeCompare(leftCreatedAt) || left.title.localeCompare(right.title, 'es');
        }),
      punishmentsLoaded,
      refreshPunishmentCatalog,
      updateCustomPunishment,
    }),
    [
      addCustomPunishment,
      deleteCustomPunishment,
      punishments,
      punishmentsLoaded,
      refreshPunishmentCatalog,
      updateCustomPunishment,
    ],
  );
}
