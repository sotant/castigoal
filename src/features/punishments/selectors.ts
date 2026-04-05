import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useAppStore } from '@/src/store/app-store';
import { dedupePunishments } from '@/src/utils/goal-evaluation';

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
    () => {
      const uniquePunishments = dedupePunishments(punishments);

      return {
        addCustomPunishment,
        basePunishments: uniquePunishments.filter((item) => item.scope === 'base'),
        deleteCustomPunishment,
        personalPunishments: uniquePunishments
          .filter((item) => item.scope === 'personal')
          .sort((left, right) => {
            const leftCreatedAt = left.createdAt ?? '';
            const rightCreatedAt = right.createdAt ?? '';
            return rightCreatedAt.localeCompare(leftCreatedAt) || left.title.localeCompare(right.title, 'es');
          }),
        punishmentsLoaded,
        refreshPunishmentCatalog,
        updateCustomPunishment,
      };
    },
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
