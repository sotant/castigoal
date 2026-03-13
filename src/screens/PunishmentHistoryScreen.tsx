import { Feather } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { ReactNode, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Directions, FlingGestureHandler } from 'react-native-gesture-handler';

import { EmptyState } from '@/src/components/EmptyState';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, radius, spacing } from '@/src/constants/theme';
import { usePunishmentCatalog } from '@/src/features/punishments/selectors';
import { CompletedPunishmentHistoryEntry, PendingAssignedPunishmentSummary, Punishment } from '@/src/models/types';
import { getAdjacentTabHref } from '@/src/navigation/app-routes';
import { useAppStore } from '@/src/store/app-store';
import { formatLongDate, toISODate } from '@/src/utils/date';

function PunishmentCard({ punishment, actions }: { punishment: Punishment; actions?: ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{punishment.title}</Text>
        <Text style={[styles.badge, punishment.scope === 'personal' ? styles.badgeCustom : styles.badgeDefault]}>
          {punishment.scope === 'personal' ? 'Personal' : 'Base'}
        </Text>
      </View>
      <Text style={styles.cardDescription}>{punishment.description}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Categoria: {punishment.category}</Text>
        <Text style={styles.metaText}>Dificultad: {punishment.difficulty}/3</Text>
      </View>
      {actions}
    </View>
  );
}

function PendingPunishmentCard({
  onComplete,
  pendingPunishment,
  working,
}: {
  onComplete: () => void;
  pendingPunishment: PendingAssignedPunishmentSummary;
  working: boolean;
}) {
  return (
    <View style={styles.pendingItem}>
      <View style={styles.pendingCopy}>
        <Text style={styles.pendingGoal}>{pendingPunishment.goalTitle}</Text>
        <Text style={styles.pendingTitle}>{pendingPunishment.punishment.title}</Text>
        <Text style={styles.pendingDescription}>{pendingPunishment.punishment.description}</Text>
        <Text style={styles.pendingMeta}>Vence: {formatLongDate(pendingPunishment.dueDate)}</Text>
      </View>

      <Pressable disabled={working} onPress={onComplete} style={[styles.pendingButton, working && styles.disabled]}>
        <Text style={styles.pendingButtonLabel}>{working ? 'Guardando...' : 'Cumplido'}</Text>
      </Pressable>
    </View>
  );
}

function CompletedHistoryCard({ entry }: { entry: CompletedPunishmentHistoryEntry }) {
  return (
    <View style={styles.historyCard}>
      <Text style={styles.historyTitle}>{entry.punishmentTitle}</Text>
      <Text style={styles.historyDescription}>{entry.punishmentDescription}</Text>
      <Text style={styles.historyMeta}>Cumplido el {formatLongDate(toISODate(entry.completedAt))}</Text>
      {entry.goalTitle ? <Text style={styles.historyMeta}>Objetivo relacionado: {entry.goalTitle}</Text> : null}
    </View>
  );
}

function CollapsibleSection({ children, initiallyExpanded, title }: { children: ReactNode; initiallyExpanded: boolean; title: string }) {
  const [expanded, setExpanded] = useState(initiallyExpanded);

  return (
    <View style={styles.section}>
      <Pressable onPress={() => setExpanded((value) => !value)} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Feather color={palette.slate} name={expanded ? 'chevron-up' : 'chevron-down'} size={18} />
      </Pressable>
      {expanded ? children : null}
    </View>
  );
}

type PunishmentTabKey = 'pending' | 'custom' | 'history' | 'catalog';

const PUNISHMENT_TABS: Array<{ key: PunishmentTabKey; label: string }> = [
  { key: 'pending', label: 'Pendientes' },
  { key: 'custom', label: 'Custom' },
  { key: 'history', label: 'Historico' },
  { key: 'catalog', label: 'Catalogo' },
];

export function PunishmentHistoryScreen() {
  const pathname = usePathname();
  const {
    addCustomPunishment,
    personalPunishments,
    basePunishments,
    deleteCustomPunishment,
    punishmentsLoaded,
    refreshPunishmentCatalog,
    updateCustomPunishment,
  } = usePunishmentCatalog();
  const completedPunishmentHistory = useAppStore((state) => state.completedPunishmentHistory);
  const completeAssignedPunishment = useAppStore((state) => state.completeAssignedPunishment);
  const pendingPunishments = useAppStore((state) => state.pendingPunishments);
  const punishmentHistoryLoaded = useAppStore((state) => state.punishmentHistoryLoaded);
  const refreshPunishmentHistory = useAppStore((state) => state.refreshPunishmentHistory);
  const [activeTab, setActiveTab] = useState<PunishmentTabKey>('pending');
  const [customPunishmentTitle, setCustomPunishmentTitle] = useState('');
  const [editingPunishmentId, setEditingPunishmentId] = useState<string | null>(null);
  const [editingPunishmentTitle, setEditingPunishmentTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [completingAssignedId, setCompletingAssignedId] = useState<string | null>(null);
  const [pendingCompletion, setPendingCompletion] = useState<PendingAssignedPunishmentSummary | null>(null);

  useEffect(() => {
    const tasks: Promise<unknown>[] = [];

    if (!punishmentsLoaded) {
      tasks.push(refreshPunishmentCatalog());
    }

    if (!punishmentHistoryLoaded) {
      tasks.push(refreshPunishmentHistory());
    }

    if (tasks.length > 0) {
      void Promise.all(tasks).catch(() => {
        return;
      });
    }
  }, [punishmentHistoryLoaded, punishmentsLoaded, refreshPunishmentCatalog, refreshPunishmentHistory]);

  const startEditing = (punishment: Punishment) => {
    setEditingPunishmentId(punishment.id);
    setEditingPunishmentTitle(punishment.title);
    setConfirmDeleteId(null);
    setActiveTab('custom');
  };

  const cancelEditing = () => {
    setEditingPunishmentId(null);
    setEditingPunishmentTitle('');
  };

  const confirmCompletion = (pendingPunishment: PendingAssignedPunishmentSummary) => {
    setPendingCompletion(pendingPunishment);
    setActiveTab('pending');
  };

  const handleCompleteConfirmed = async () => {
    if (!pendingCompletion) {
      return;
    }

    const assignedId = pendingCompletion.assignedId;
    setCompletingAssignedId(assignedId);

    try {
      await completeAssignedPunishment(assignedId);
      setPendingCompletion(null);
    } catch {
      return;
    } finally {
      setCompletingAssignedId(null);
    }
  };

  const handleSubTabSwipe = (direction: 'left' | 'right') => {
    const currentIndex = PUNISHMENT_TABS.findIndex((tab) => tab.key === activeTab);

    if (currentIndex === -1) {
      return;
    }

    const targetIndex = direction === 'left' ? currentIndex + 1 : currentIndex - 1;
    const targetTab = PUNISHMENT_TABS[targetIndex];

    if (targetTab) {
      setActiveTab(targetTab.key);
      return;
    }

    const adjacentMainTab = getAdjacentTabHref(pathname, direction);

    if (adjacentMainTab) {
      router.navigate(adjacentMainTab);
    }
  };

  const renderPendingTab = () => {
    if (pendingPunishments.length === 0) {
      return (
        <EmptyState
          title="Sin castigos pendientes"
          message="Cuando incumplas un objetivo y se te asigne un castigo, aparecera aqui para que puedas completarlo."
        />
      );
    }

    return (
      <View style={styles.pendingSection}>
        <View style={styles.pendingHeader}>
          <Text style={styles.pendingSectionTitle}>Castigos pendientes</Text>
          <Text style={styles.pendingSectionSubtitle}>Tienes {pendingPunishments.length} por cumplir.</Text>
        </View>

        {pendingPunishments.map((pendingPunishment) => (
          <PendingPunishmentCard
            key={pendingPunishment.assignedId}
            pendingPunishment={pendingPunishment}
            working={completingAssignedId === pendingPunishment.assignedId}
            onComplete={() => confirmCompletion(pendingPunishment)}
          />
        ))}
      </View>
    );
  };

  const renderHistoryTab = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Historico de castigos cumplidos</Text>
      {completedPunishmentHistory.length === 0 ? (
        <EmptyState
          title="Sin castigos cumplidos"
          message="Cuando confirmes un castigo como cumplido, se guardara aqui con su fecha."
        />
      ) : (
        completedPunishmentHistory.map((entry) => <CompletedHistoryCard key={entry.id} entry={entry} />)
      )}
    </View>
  );

  const renderCustomTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Guardar castigo personal</Text>
        <TextInput
          editable={!saving}
          value={customPunishmentTitle}
          onChangeText={setCustomPunishmentTitle}
          style={styles.input}
          placeholder="Ejemplo: limpiar el coche"
        />
        <Pressable
          disabled={saving}
          onPress={async () => {
            if (!customPunishmentTitle.trim()) {
              return;
            }

            setSaving(true);

            try {
              await addCustomPunishment({
                title: customPunishmentTitle.trim(),
                description: customPunishmentTitle.trim(),
                category: 'custom',
                difficulty: 1,
              });
              setCustomPunishmentTitle('');
            } catch {
              return;
            } finally {
              setSaving(false);
            }
          }}
          style={[styles.primaryButton, saving && styles.disabled]}>
          <Text style={styles.primaryLabel}>{saving ? 'Guardando...' : 'Guardar castigo'}</Text>
        </Pressable>
      </View>

      {personalPunishments.length > 0 ? (
        <CollapsibleSection initiallyExpanded title="Tus castigos personales">
          {personalPunishments.map((punishment) => {
            const isEditing = editingPunishmentId === punishment.id;
            const isConfirmingDelete = confirmDeleteId === punishment.id;

            if (isEditing) {
              return (
                <View key={punishment.id} style={styles.card}>
                  <Text style={styles.cardTitle}>Editar castigo</Text>
                  <TextInput
                    editable={!saving}
                    value={editingPunishmentTitle}
                    onChangeText={setEditingPunishmentTitle}
                    style={styles.input}
                    placeholder="Ejemplo: limpiar el coche"
                  />
                  <View style={styles.actionsRow}>
                    <Pressable disabled={saving} onPress={cancelEditing} style={[styles.secondaryButton, saving && styles.disabled]}>
                      <Text style={styles.secondaryLabel}>Cancelar</Text>
                    </Pressable>
                    <Pressable
                      disabled={saving}
                      onPress={async () => {
                        if (!editingPunishmentTitle.trim()) {
                          return;
                        }

                        setSaving(true);

                        try {
                          await updateCustomPunishment(punishment.id, {
                            title: editingPunishmentTitle.trim(),
                            description: editingPunishmentTitle.trim(),
                            category: 'custom',
                            difficulty: 1,
                          });
                          cancelEditing();
                        } catch {
                          return;
                        } finally {
                          setSaving(false);
                        }
                      }}
                      style={[styles.primaryButton, styles.actionButton, saving && styles.disabled]}>
                      <Text style={styles.primaryLabel}>{saving ? 'Guardando...' : 'Guardar cambios'}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            }

            return (
              <PunishmentCard
                key={punishment.id}
                punishment={punishment}
                actions={
                  <>
                    <View style={styles.actionsRow}>
                      <Pressable
                        disabled={saving}
                        onPress={() => startEditing(punishment)}
                        style={[styles.secondaryButton, saving && styles.disabled]}>
                        <Text style={styles.secondaryLabel}>Editar</Text>
                      </Pressable>
                      <Pressable
                        disabled={saving}
                        onPress={() => {
                          setConfirmDeleteId((current) => (current === punishment.id ? null : punishment.id));
                        }}
                        style={[styles.dangerButton, saving && styles.disabled]}>
                        <Text style={styles.dangerLabel}>{isConfirmingDelete ? 'Cancelar borrado' : 'Borrar'}</Text>
                      </Pressable>
                    </View>
                    {isConfirmingDelete ? (
                      <View style={styles.confirmCard}>
                        <Text style={styles.confirmText}>
                          Confirma el borrado. El servidor bloqueara el borrado si este castigo ya fue asignado para conservar el historial.
                        </Text>
                        <Pressable
                          disabled={saving}
                          onPress={async () => {
                            setSaving(true);

                            try {
                              await deleteCustomPunishment(punishment.id);
                              if (editingPunishmentId === punishment.id) {
                                cancelEditing();
                              }
                              setConfirmDeleteId(null);
                            } catch {
                              return;
                            } finally {
                              setSaving(false);
                            }
                          }}
                          style={[styles.confirmDeleteButton, saving && styles.disabled]}>
                          <Text style={styles.confirmDeleteLabel}>{saving ? 'Borrando...' : 'Confirmar borrado'}</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </>
                }
              />
            );
          })}
        </CollapsibleSection>
      ) : (
        <EmptyState title="Sin castigos personales" message="Crea tu primer castigo personalizado y se guardara aqui." />
      )}
    </View>
  );

  const renderCatalogTab = () =>
    basePunishments.length === 0 ? (
      <EmptyState title="Sin castigos base" message="No hay castigos base disponibles en este momento." />
    ) : (
      <View style={styles.tabContent}>
        {basePunishments.map((punishment) => (
          <PunishmentCard key={punishment.id} punishment={punishment} />
        ))}
      </View>
    );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'custom':
        return renderCustomTab();
      case 'history':
        return renderHistoryTab();
      case 'catalog':
        return renderCatalogTab();
      case 'pending':
      default:
        return renderPendingTab();
    }
  };

  return (
    <ScreenContainer title="Castigos" scroll={false} enableTabSwipe={false}>
      <Modal
        animationType="fade"
        transparent
        visible={pendingCompletion !== null}
        onRequestClose={() => {
          if (!completingAssignedId) {
            setPendingCompletion(null);
          }
        }}>
        <View style={styles.modalOverlay}>
          <Pressable
            disabled={Boolean(completingAssignedId)}
            style={styles.modalBackdrop}
            onPress={() => {
              if (!completingAssignedId) {
                setPendingCompletion(null);
              }
            }}
          />

          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>¿Has cumplido el castigo?</Text>
            <View style={styles.modalActions}>
              <Pressable
                disabled={Boolean(completingAssignedId)}
                onPress={() => setPendingCompletion(null)}
                style={[styles.secondaryButton, completingAssignedId && styles.disabled]}>
                <Text style={styles.secondaryLabel}>No</Text>
              </Pressable>
              <Pressable
                disabled={Boolean(completingAssignedId)}
                onPress={() => {
                  void handleCompleteConfirmed();
                }}
                style={[styles.pendingButton, completingAssignedId && styles.disabled]}>
                <Text style={styles.pendingButtonLabel}>{completingAssignedId ? 'Guardando...' : 'Si'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <FlingGestureHandler direction={Directions.LEFT} onActivated={() => handleSubTabSwipe('left')}>
        <FlingGestureHandler direction={Directions.RIGHT} onActivated={() => handleSubTabSwipe('right')}>
          <View style={styles.layout}>
            <ScrollView contentContainerStyle={styles.contentScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {renderActiveTab()}
            </ScrollView>

            <View style={styles.internalTabBar}>
              {PUNISHMENT_TABS.map((tab) => {
                const isActive = tab.key === activeTab;

                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
                    style={[styles.internalTab, isActive && styles.internalTabActive]}>
                    <Text style={[styles.internalTabLabel, isActive && styles.internalTabLabelActive]}>{tab.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </FlingGestureHandler>
      </FlingGestureHandler>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    gap: spacing.md,
  },
  contentScroll: {
    flexGrow: 1,
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  tabContent: {
    gap: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(11, 23, 38, 0.45)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.snow,
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.ink,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pendingSection: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    gap: spacing.sm,
  },
  pendingHeader: {
    gap: spacing.xs,
  },
  pendingSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#92400E',
  },
  pendingSectionSubtitle: {
    color: '#A16207',
    lineHeight: 20,
  },
  pendingItem: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    gap: spacing.sm,
  },
  pendingCopy: {
    gap: spacing.xs,
  },
  pendingGoal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#A16207',
    textTransform: 'uppercase',
  },
  pendingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
  },
  pendingDescription: {
    color: palette.slate,
    lineHeight: 21,
  },
  pendingMeta: {
    color: '#92400E',
    fontWeight: '700',
  },
  pendingButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: '#CA8A04',
  },
  pendingButtonLabel: {
    color: palette.snow,
    fontWeight: '800',
  },
  formCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: palette.line,
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.cloud,
    fontSize: 16,
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: palette.primary,
  },
  primaryLabel: {
    color: palette.snow,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.6,
  },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: palette.line,
    gap: spacing.sm,
  },
  historyCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: palette.line,
    gap: spacing.xs,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
  },
  historyDescription: {
    color: palette.slate,
    lineHeight: 21,
  },
  historyMeta: {
    color: palette.slate,
    fontSize: 13,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
  },
  cardDescription: {
    color: palette.slate,
    lineHeight: 21,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 13,
    color: palette.slate,
  },
  badge: {
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    fontSize: 12,
    fontWeight: '700',
  },
  badgeDefault: {
    backgroundColor: '#E0F2FE',
    color: '#075985',
  },
  badgeCustom: {
    backgroundColor: '#ECFDF5',
    color: '#065F46',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
  },
  secondaryLabel: {
    color: palette.ink,
    fontWeight: '800',
  },
  dangerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: '#FEE4E2',
  },
  dangerLabel: {
    color: palette.danger,
    fontWeight: '800',
  },
  confirmCard: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#FFF1E8',
    gap: spacing.sm,
  },
  confirmText: {
    color: palette.slate,
    lineHeight: 20,
  },
  confirmDeleteButton: {
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: palette.danger,
  },
  confirmDeleteLabel: {
    color: palette.snow,
    fontWeight: '800',
  },
  internalTabBar: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: 6,
    borderRadius: radius.lg,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: palette.line,
  },
  internalTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: palette.cloud,
  },
  internalTabActive: {
    backgroundColor: palette.primary,
  },
  internalTabLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: palette.slate,
    textAlign: 'center',
  },
  internalTabLabelActive: {
    color: palette.snow,
  },
});
