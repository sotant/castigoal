import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { ComponentProps, ReactNode, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Directions, FlingGestureHandler } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/src/components/EmptyState';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import { usePunishmentCatalog } from '@/src/features/punishments/selectors';
import { CompletedPunishmentHistoryEntry, PendingAssignedPunishmentSummary, Punishment } from '@/src/models/types';
import { appRoutes, getAdjacentTabHref } from '@/src/navigation/app-routes';
import { useAppStore } from '@/src/store/app-store';
import { formatLongDate, toISODate } from '@/src/utils/date';

function PunishmentCard({ punishment, actions }: { punishment: Punishment; actions?: ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{punishment.title}</Text>
        <Text style={[styles.badge, punishment.scope === 'personal' ? styles.badgeCustom : styles.badgeDefault]}>
          {punishment.scope === 'personal' ? 'Personal' : 'Predeterminado'}
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

type PrimaryTabKey = 'mine' | 'library';

type SecondaryNavItem =
  | {
      type: 'tab';
      key: PrimaryTabKey;
      label: string;
      icon: ComponentProps<typeof Ionicons>['name'];
    }
  | {
      type: 'action';
      key: 'new';
      label: string;
      icon: ComponentProps<typeof Ionicons>['name'];
    };

const SECONDARY_NAV_ITEMS: SecondaryNavItem[] = [
  { type: 'tab', key: 'mine', label: 'Mis castigos', icon: 'shield-half' },
  { type: 'tab', key: 'library', label: 'Biblioteca', icon: 'library' },
  { type: 'action', key: 'new', label: 'Nuevo', icon: 'add-outline' },
];

const PRIMARY_TABS = SECONDARY_NAV_ITEMS.filter((item): item is Extract<SecondaryNavItem, { type: 'tab' }> => item.type === 'tab');

export function PunishmentHistoryScreen() {
  const pathname = usePathname();
  const {
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
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const [activePrimaryTab, setActivePrimaryTab] = useState<PrimaryTabKey>('mine');
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
    setActivePrimaryTab('library');
  };

  const cancelEditing = () => {
    setEditingPunishmentId(null);
    setEditingPunishmentTitle('');
  };

  const confirmCompletion = (pendingPunishment: PendingAssignedPunishmentSummary) => {
    setPendingCompletion(pendingPunishment);
    setActivePrimaryTab('mine');
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

  const handlePrimaryTabSwipe = (direction: 'left' | 'right') => {
    const currentIndex = PRIMARY_TABS.findIndex((tab) => tab.key === activePrimaryTab);

    if (currentIndex === -1) {
      return;
    }

    const targetIndex = direction === 'left' ? currentIndex + 1 : currentIndex - 1;
    const targetTab = PRIMARY_TABS[targetIndex];

    if (targetTab) {
      setActivePrimaryTab(targetTab.key);
      return;
    }

    const adjacentMainTab = getAdjacentTabHref(pathname, direction);

    if (adjacentMainTab) {
      router.navigate(adjacentMainTab);
    }
  };

  const renderPendingSummary = () => {
    if (pendingPunishments.length === 0) {
      return (
        <View style={styles.summaryEmptyState}>
          <Text style={styles.summaryEmptyTitle}>Sin castigos pendientes</Text>
          <Text style={styles.summaryEmptyDescription}>
            Cuando incumplas un objetivo y se te asigne un castigo, aparecera aqui para que puedas completarlo.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.summaryPendingList}>
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

  const renderHistoryView = () => (
    <View style={styles.contentSection}>
      <View style={styles.contentSectionHeader}>
        <View style={styles.sectionHeaderCopy}>
          <Text style={styles.sectionTitle}>Castigos cumplidos</Text>
        </View>
        <View style={[styles.countBadge, styles.historyCountBadge]}>
          <Text style={[styles.countBadgeLabel, styles.historyCountBadgeLabel]}>{completedPunishmentHistory.length}</Text>
        </View>
      </View>

      {completedPunishmentHistory.length === 0 ? (
        <View style={styles.inlineEmpty}>
          <EmptyState
            title="Sin castigos cumplidos"
            message="Cuando confirmes un castigo como cumplido, se guardara aqui con su fecha."
          />
        </View>
      ) : (
        completedPunishmentHistory.map((entry) => <CompletedHistoryCard key={entry.id} entry={entry} />)
      )}
    </View>
  );

  const renderPersonalPunishments = () => {
    if (personalPunishments.length === 0) {
      return (
        <View style={styles.inlineEmpty}>
          <EmptyState title="Sin castigos creados" message="Crea tu primer castigo personalizado y lo veras aqui al momento." />
        </View>
      );
    }

    return personalPunishments.map((punishment) => {
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
    });
  };

  const renderLibraryView = () => (
    <View style={styles.pageContent}>
      <View style={[styles.summaryCard, styles.librarySummaryCard]}>
        <Text style={styles.summaryEyebrow}>Biblioteca</Text>
        <Text style={styles.summaryTitle}>Predeterminados y personalizados</Text>
        <Text style={styles.summaryDescription}>
          Guarda tus propios castigos, consulta los predeterminados de la app y manten tu biblioteca ordenada en un solo sitio.
        </Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatValue}>{basePunishments.length}</Text>
            <Text style={styles.summaryStatLabel}>Predeterminados</Text>
          </View>
          <View style={styles.summaryStatDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatValue}>{personalPunishments.length}</Text>
            <Text style={styles.summaryStatLabel}>Mios</Text>
          </View>
        </View>
      </View>

      <View style={styles.contentSection}>
        <View style={styles.contentSectionHeader}>
          <View style={styles.sectionHeaderCopy}>
            <Text style={styles.sectionEyebrow}>Mis castigos</Text>
            <Text style={styles.sectionTitle}>Castigos creados por mi</Text>
            <Text style={styles.sectionDescription}>Edita o elimina tus propios castigos sin salir de la biblioteca.</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeLabel}>{personalPunishments.length}</Text>
          </View>
        </View>

        {renderPersonalPunishments()}
      </View>

      <View style={styles.contentSection}>
        <View style={styles.contentSectionHeader}>
          <View style={styles.sectionHeaderCopy}>
            <Text style={styles.sectionEyebrow}>Predeterminados</Text>
            <Text style={styles.sectionTitle}>Castigos de la app</Text>
            <Text style={styles.sectionDescription}>Opciones base listas para utilizar sin tener que configurarlas de nuevo.</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeLabel}>{basePunishments.length}</Text>
          </View>
        </View>

        {basePunishments.length === 0 ? (
          <View style={styles.inlineEmpty}>
            <EmptyState title="Sin castigos base" message="No hay castigos predeterminados disponibles en este momento." />
          </View>
        ) : (
          basePunishments.map((punishment) => <PunishmentCard key={punishment.id} punishment={punishment} />)
        )}
      </View>
    </View>
  );

  const renderMineView = () => (
    <View style={styles.pageContent}>
      <View style={[styles.summaryCard, styles.mineSummaryCard]}>
        <Text style={styles.summaryTitle}>Tienes {pendingPunishments.length} castigos pendientes</Text>
        {renderPendingSummary()}
      </View>

      {renderHistoryView()}
    </View>
  );

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
            <Text style={styles.modalTitle}>Has cumplido el castigo?</Text>
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

      <FlingGestureHandler direction={Directions.LEFT} onActivated={() => handlePrimaryTabSwipe('left')}>
        <FlingGestureHandler direction={Directions.RIGHT} onActivated={() => handlePrimaryTabSwipe('right')}>
          <View style={styles.layout}>
            <ScrollView
              contentContainerStyle={[
                styles.contentScroll,
                { paddingBottom: tabBarHeight + insets.bottom + 88 },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {activePrimaryTab === 'mine' ? renderMineView() : renderLibraryView()}
            </ScrollView>

            <View style={styles.secondaryNavShell}>
              <View style={styles.secondaryNavBar}>
                {SECONDARY_NAV_ITEMS.map((item, index) => {
                  const isTab = item.type === 'tab';
                  const isActive = isTab && item.key === activePrimaryTab;
                  const iconName = isActive ? item.icon : item.icon;
                  const iconColor = isActive ? palette.primaryDeep : '#708198';
                  const handlePress = () => {
                    if (item.type === 'tab') {
                      setActivePrimaryTab(item.key);
                      return;
                    }

                    router.push(appRoutes.createPunishment);
                  };

                  return (
                    <View key={item.key} style={styles.secondaryNavItem}>
                      <Pressable
                        accessibilityHint={item.type === 'action' ? 'Abre la pantalla para crear un castigo' : undefined}
                        accessibilityLabel={item.type === 'action' ? 'Agregar castigo' : item.label}
                        accessibilityRole="button"
                        onPress={handlePress}
                        style={({ pressed }) => [
                          styles.secondaryNavTab,
                          isActive && styles.secondaryNavTabActive,
                          pressed && styles.secondaryNavPressed,
                        ]}>
                        <View style={[styles.secondaryNavIconShell, isActive && styles.secondaryNavIconShellActive]}>
                          <Ionicons color={iconColor} name={iconName} size={17} />
                        </View>
                        <Text
                          minimumFontScale={0.9}
                          numberOfLines={1}
                          style={[styles.secondaryNavTabLabel, isActive && styles.secondaryNavTabLabelActive]}>
                          {item.label}
                        </Text>
                      </Pressable>
                      {index < SECONDARY_NAV_ITEMS.length - 1 ? <View pointerEvents="none" style={styles.secondaryNavDivider} /> : null}
                    </View>
                  );
                })}
              </View>
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
  },
  contentScroll: {
    flexGrow: 1,
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  pageContent: {
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
    ...shadows.card,
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
  summaryCard: {
    padding: spacing.lg,
    borderRadius: 28,
    borderWidth: 1,
    gap: spacing.md,
    ...shadows.card,
  },
  mineSummaryCard: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  librarySummaryCard: {
    backgroundColor: '#F4F8FF',
    borderColor: '#D8E6FF',
  },
  summaryEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: palette.primaryDeep,
    textTransform: 'uppercase',
  },
  summaryTitle: {
    fontSize: 25,
    fontWeight: '900',
    color: palette.ink,
  },
  summaryDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.slate,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  summaryStat: {
    flex: 1,
    gap: 2,
  },
  summaryStatDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(111, 128, 153, 0.18)',
  },
  summaryStatValue: {
    fontSize: 26,
    fontWeight: '900',
    color: palette.ink,
  },
  summaryStatLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.slate,
  },
  summaryPendingList: {
    gap: spacing.sm,
  },
  summaryEmptyState: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
    padding: spacing.md,
    gap: spacing.xs,
  },
  summaryEmptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#92400E',
  },
  summaryEmptyDescription: {
    color: '#92400E',
    lineHeight: 20,
  },
  contentSection: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: palette.line,
    gap: spacing.sm,
    ...shadows.card,
  },
  contentSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: palette.primaryDeep,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.ink,
  },
  sectionDescription: {
    color: palette.slate,
    lineHeight: 20,
  },
  countBadge: {
    minWidth: 40,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF3FB',
  },
  countBadgeLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: palette.primaryDeep,
  },
  historyCountBadge: {
    minWidth: 32,
    paddingHorizontal: spacing.xs,
    paddingVertical: 7,
  },
  historyCountBadgeLabel: {
    fontSize: 12,
  },
  inlineEmpty: {
    paddingTop: spacing.xs,
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
    backgroundColor: '#F9FBFF',
    borderWidth: 1,
    borderColor: '#E1EAF5',
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
  secondaryNavShell: {
    marginHorizontal: -spacing.md,
    marginBottom: -spacing.md,
  },
  secondaryNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    minHeight: 58,
    paddingTop: 4,
    paddingBottom: 5,
    paddingHorizontal: 8,
    backgroundColor: '#FCFDFE',
    borderTopWidth: 1,
    borderTopColor: '#E6ECF4',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -3 },
    elevation: 12,
  },
  secondaryNavItem: {
    flex: 1,
    position: 'relative',
  },
  secondaryNavTab: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  secondaryNavTabActive: {
    backgroundColor: 'transparent',
  },
  secondaryNavPressed: {
    opacity: 0.86,
  },
  secondaryNavDivider: {
    position: 'absolute',
    right: 0,
    top: 6,
    bottom: 6,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(112, 129, 152, 0.42)',
  },
  secondaryNavIconShell: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 22,
    borderRadius: 16,
    overflow: 'hidden',
  },
  secondaryNavIconShellActive: {
    backgroundColor: '#EEF4FF',
    borderRadius: 16,
  },
  secondaryNavTabLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#708198',
    textAlign: 'center',
  },
  secondaryNavTabLabelActive: {
    color: palette.primaryDeep,
  },
});
