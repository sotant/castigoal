import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { getPunishmentDisplay } from '@/src/constants/punishments';
import { useCurrentLanguage } from '@/src/i18n';
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
  const currentLanguage = useCurrentLanguage();

  return useMemo(
    () => {
      const visiblePunishments = punishments.map((punishment) => getPunishmentDisplay(punishment));

      return {
        addCustomPunishment,
        basePunishments: visiblePunishments
          .filter((item) => item.scope === 'base')
          .sort((left, right) => left.title.localeCompare(right.title, currentLanguage)),
        deleteCustomPunishment,
        personalPunishments: visiblePunishments
          .filter((item) => item.scope === 'personal')
        .sort((left, right) => {
          const leftCreatedAt = left.createdAt ?? '';
          const rightCreatedAt = right.createdAt ?? '';
          return rightCreatedAt.localeCompare(leftCreatedAt) || left.title.localeCompare(right.title, currentLanguage);
        }),
        punishmentsLoaded,
        refreshPunishmentCatalog,
        updateCustomPunishment,
      };
    },
    [
      addCustomPunishment,
      currentLanguage,
      deleteCustomPunishment,
      punishments,
      punishmentsLoaded,
      refreshPunishmentCatalog,
      updateCustomPunishment,
    ],
  );
}
