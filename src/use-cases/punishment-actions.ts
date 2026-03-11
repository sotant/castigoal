import { AssignedPunishment, AssignedPunishmentDetail, Punishment, StatsSummary } from '@/src/models/types';
import {
  addCustomPunishmentRecord,
  completeAssignedPunishmentRecord,
  deleteCustomPunishmentRecord,
  loadAssignedPunishmentById,
  loadHomeSummary,
  loadPunishmentById,
  loadPunishmentCatalog,
  loadStatsSummary,
  updateCustomPunishmentRecord,
} from '@/src/repositories/app-repository';

export async function loadPunishmentCatalogUseCase() {
  return loadPunishmentCatalog();
}

export async function addCustomPunishmentUseCase(input: Omit<Punishment, 'id' | 'scope'>) {
  await addCustomPunishmentRecord(input);
  return loadPunishmentCatalog();
}

export async function updateCustomPunishmentUseCase(punishmentId: string, input: Omit<Punishment, 'id' | 'scope'>) {
  await updateCustomPunishmentRecord(punishmentId, input);
  return loadPunishmentCatalog();
}

export async function deleteCustomPunishmentUseCase(punishmentId: string) {
  await deleteCustomPunishmentRecord(punishmentId);
  return loadPunishmentCatalog();
}

export async function loadAssignedPunishmentDetailUseCase(assignedId: string): Promise<AssignedPunishmentDetail | null> {
  const assigned = await loadAssignedPunishmentById(assignedId);

  if (!assigned) {
    return null;
  }

  const punishment = await loadPunishmentById(assigned.punishmentId);

  if (!punishment) {
    return null;
  }

  return {
    assigned,
    punishment,
  };
}

export async function completeAssignedPunishmentUseCase(assignedId: string): Promise<{
  assigned: AssignedPunishment;
  homeSummary: Awaited<ReturnType<typeof loadHomeSummary>>;
  statsSummary: StatsSummary;
}> {
  const assigned = await completeAssignedPunishmentRecord(assignedId, {
    completedAt: new Date().toISOString(),
    status: 'completed',
  });
  const [homeSummary, statsSummary] = await Promise.all([loadHomeSummary(), loadStatsSummary()]);

  return {
    assigned,
    homeSummary,
    statsSummary,
  };
}