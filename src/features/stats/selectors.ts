import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useAppStore } from '@/src/store/app-store';

export function useStatsOverview() {
  const { goals, statsSummary } = useAppStore(
    useShallow((state) => ({
      goals: state.goals,
      statsSummary: state.statsSummary,
    })),
  );

  return useMemo(
    () => ({
      averageRate: statsSummary.averageRate,
      completedPunishments: statsSummary.completedPunishments,
      completionRatio: statsSummary.completionRatio,
      goals,
      goalsActiveCount: statsSummary.goalsActiveCount,
      totalCheckins: statsSummary.totalCheckins,
    }),
    [goals, statsSummary],
  );
}
