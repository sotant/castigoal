import {
  AssignedPunishment,
  AssignedPunishmentDetail,
  CompletedPunishmentHistoryEntry,
  PendingAssignedPunishmentSummary,
  Punishment,
  StatsSummary,
} from '@/src/models/types';
import {
  addCustomPunishmentRecord,
  completeAssignedPunishmentRecord,
  loadAssignedPunishmentById,
  loadPunishmentById,
  loadPunishmentCatalog,
  loadCompletedPunishmentHistory,
  loadHomeSummary,
  loadPendingPunishments,
  loadStatsSummary,
  deleteCustomPunishmentRecord,
  updateCustomPunishmentRecord,
} from '@/src/services/progress-service';

export async function loadPunishmentCatalogUseCase() {
  return loadPunishmentCatalog();
}

export async function loadPunishmentHistoryUseCase(): Promise<{
  completedPunishmentHistory: CompletedPunishmentHistoryEntry[];
  pendingPunishments: PendingAssignedPunishmentSummary[];
}> {
  const [pendingPunishments, completedPunishmentHistory] = await Promise.all([
    loadPendingPunishments(),
    loadCompletedPunishmentHistory(),
  ]);

  return {
    pendingPunishments,
    completedPunishmentHistory,
  };
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
  completedPunishmentHistory: CompletedPunishmentHistoryEntry[];
  homeSummary: Awaited<ReturnType<typeof loadHomeSummary>>;
  pendingPunishments: PendingAssignedPunishmentSummary[];
  statsSummary: StatsSummary;
}> {
  const assigned = await completeAssignedPunishmentRecord(assignedId);
  const [homeSummary, statsSummary, pendingPunishments, completedPunishmentHistory] = await Promise.all([
    loadHomeSummary(),
    loadStatsSummary(),
    loadPendingPunishments(),
    loadCompletedPunishmentHistory(),
  ]);

  return {
    assigned,
    completedPunishmentHistory,
    homeSummary,
    pendingPunishments,
    statsSummary,
  };
}
