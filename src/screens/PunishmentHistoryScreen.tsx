import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ComponentProps, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Directions, FlingGestureHandler } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/src/components/EmptyState';
import { GoalActionConfirmationModal } from '@/src/components/GoalActionConfirmationModal';
import { ObjectiveActionsMenu } from '@/src/components/ObjectiveActionsMenu';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import {
  getPunishmentCategoryOption,
  PUNISHMENT_CATEGORY_OPTIONS,
  PUNISHMENT_DIFFICULTY_OPTIONS,
} from '@/src/constants/punishments';
import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import { usePunishmentCatalog } from '@/src/features/punishments/selectors';
import { CompletedPunishmentHistoryEntry, PendingAssignedPunishmentSummary, Punishment } from '@/src/models/types';
import { appRoutes, getAdjacentTabHref } from '@/src/navigation/app-routes';
import { useAppStore } from '@/src/store/app-store';
import { formatLongDate, toISODate } from '@/src/utils/date';

type PrimaryTabKey = 'mine' | 'library';
type LibraryOriginFilter = 'all' | 'personal' | 'base';

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
const ORIGIN_FILTER_OPTIONS: { label: string; value: LibraryOriginFilter }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Personal', value: 'personal' },
  { label: 'Base', value: 'base' },
];
const LIBRARY_PAGE_SIZE = 10;

function PunishmentCard({ punishment, actions }: { punishment: Punishment; actions?: ReactNode }) {
  const categoryOption = getPunishmentCategoryOption(punishment.categoryId, punishment.categoryName);
  const difficultyOption =
    PUNISHMENT_DIFFICULTY_OPTIONS.find((option) => option.value === punishment.difficulty) ?? PUNISHMENT_DIFFICULTY_OPTIONS[0];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{punishment.title}</Text>
        <Text style={[styles.badge, punishment.scope === 'personal' ? styles.badgeCustom : styles.badgeDefault]}>
          {punishment.scope === 'personal' ? 'Personal' : 'Base'}
        </Text>
      </View>

      {punishment.description ? (
        <Text numberOfLines={2} style={styles.cardDescription}>
          {punishment.description}
        </Text>
      ) : null}

      <View style={styles.cardFooter}>
        <View style={styles.previewTags}>
          <View style={[styles.previewTag, { backgroundColor: categoryOption.tint }]}>
            <Text style={[styles.previewTagText, { color: categoryOption.accent }]}>{categoryOption.label}</Text>
          </View>
          <View style={[styles.previewTag, { backgroundColor: difficultyOption.tint }]}>
            <Text style={[styles.previewTagText, { color: difficultyOption.accent }]}>{difficultyOption.label}</Text>
          </View>
        </View>
        {actions ? <View style={styles.cardFooterActions}>{actions}</View> : null}
      </View>
    </View>
  );
}

function PendingPunishmentCard({
  onShowInfo,
  onComplete,
  pendingPunishment,
  working,
}: {
  onShowInfo: () => void;
  onComplete: () => void;
  pendingPunishment: PendingAssignedPunishmentSummary;
  working: boolean;
}) {
  return (
    <View style={styles.pendingItem}>
      <View style={styles.pendingCopy}>
        <Text style={styles.pendingTitle}>{pendingPunishment.punishment.title}</Text>
        <Text style={styles.pendingDescription}>{pendingPunishment.punishment.description}</Text>
      </View>

      <View style={styles.pendingActionRow}>
        <Pressable accessibilityLabel="Ver informacion del objetivo" onPress={onShowInfo} style={styles.pendingInfoButton}>
          <Ionicons color="#92400E" name="information-circle-outline" size={20} />
        </Pressable>
        <Pressable disabled={working} onPress={onComplete} style={[styles.pendingCompleteButton, working && styles.disabled]}>
          <Ionicons color={palette.snow} name="checkmark" size={16} />
          <Text style={styles.pendingButtonLabel}>{working ? 'Guardando...' : 'Completar'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CompletedHistoryCard({
  entry,
  onShowInfo,
}: {
  entry: CompletedPunishmentHistoryEntry;
  onShowInfo: () => void;
}) {
  return (
    <View style={styles.historyCard}>
      <View style={styles.historyCardHeader}>
        <View style={styles.historyCardCopy}>
          <Text style={styles.historyTitle}>{entry.punishmentTitle}</Text>
          <Text style={styles.historyMeta}>Cumplido el {formatLongDate(toISODate(entry.completedAt))}</Text>
        </View>
        <Pressable accessibilityLabel="Ver informacion del castigo cumplido" onPress={onShowInfo} style={styles.historyInfoButton}>
          <Ionicons color={palette.primaryDeep} name="information-circle-outline" size={22} />
        </Pressable>
      </View>
    </View>
  );
}

export function PunishmentHistoryScreen() {
  const pathname = usePathname();
  const params = useLocalSearchParams<{ tab?: PrimaryTabKey }>();
  const { personalPunishments, basePunishments, deleteCustomPunishment, punishmentsLoaded, refreshPunishmentCatalog } =
    usePunishmentCatalog();
  const completedPunishmentHistory = useAppStore((state) => state.completedPunishmentHistory);
  const completeAssignedPunishment = useAppStore((state) => state.completeAssignedPunishment);
  const pendingPunishments = useAppStore((state) => state.pendingPunishments);
  const punishmentHistoryLoaded = useAppStore((state) => state.punishmentHistoryLoaded);
  const refreshPunishmentHistory = useAppStore((state) => state.refreshPunishmentHistory);
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [activePrimaryTab, setActivePrimaryTab] = useState<PrimaryTabKey>(params.tab === 'library' ? 'library' : 'mine');
  const [activeMenuPunishmentId, setActiveMenuPunishmentId] = useState<string | null>(null);
  const [pendingDeletePunishmentId, setPendingDeletePunishmentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [completingAssignedId, setCompletingAssignedId] = useState<string | null>(null);
  const [pendingCompletion, setPendingCompletion] = useState<PendingAssignedPunishmentSummary | null>(null);
  const [infoPunishment, setInfoPunishment] = useState<PendingAssignedPunishmentSummary | null>(null);
  const [infoCompletedEntry, setInfoCompletedEntry] = useState<CompletedPunishmentHistoryEntry | null>(null);
  const [isCompletedHistoryOpen, setIsCompletedHistoryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [originFilter, setOriginFilter] = useState<LibraryOriginFilter>('all');
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [difficultyFilters, setDifficultyFilters] = useState<(1 | 2 | 3)[]>([]);
  const [libraryPage, setLibraryPage] = useState(1);
  const [draftOriginFilter, setDraftOriginFilter] = useState<LibraryOriginFilter>('all');
  const [draftCategoryFilters, setDraftCategoryFilters] = useState<string[]>([]);
  const [draftDifficultyFilters, setDraftDifficultyFilters] = useState<(1 | 2 | 3)[]>([]);
  const [librarySectionY, setLibrarySectionY] = useState(0);
  const [secondaryNavHeight, setSecondaryNavHeight] = useState(0);

  const activeMenuPunishment = personalPunishments.find((item) => item.id === activeMenuPunishmentId) ?? null;
  const pendingDeletePunishment = personalPunishments.find((item) => item.id === pendingDeletePunishmentId) ?? null;
  const allLibraryPunishments = useMemo(() => [...personalPunishments, ...basePunishments], [basePunishments, personalPunishments]);
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase('es');

  const filteredLibraryPunishments = useMemo(
    () =>
      allLibraryPunishments.filter((punishment) => {
        const matchesOrigin = originFilter === 'all' ? true : punishment.scope === originFilter;
        const matchesCategory = categoryFilters.length === 0 ? true : categoryFilters.includes(punishment.categoryName);
        const matchesDifficulty = difficultyFilters.length === 0 ? true : difficultyFilters.includes(punishment.difficulty);
        const matchesSearch = normalizedSearchQuery
          ? `${punishment.title} ${punishment.description}`.toLocaleLowerCase('es').includes(normalizedSearchQuery)
          : true;

        return matchesOrigin && matchesCategory && matchesDifficulty && matchesSearch;
      }),
    [allLibraryPunishments, categoryFilters, difficultyFilters, normalizedSearchQuery, originFilter],
  );
  const totalLibraryPages = Math.max(1, Math.ceil(filteredLibraryPunishments.length / LIBRARY_PAGE_SIZE));
  const paginatedLibraryPunishments = useMemo(() => {
    const startIndex = (libraryPage - 1) * LIBRARY_PAGE_SIZE;
    return filteredLibraryPunishments.slice(startIndex, startIndex + LIBRARY_PAGE_SIZE);
  }, [filteredLibraryPunishments, libraryPage]);

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];

    if (originFilter !== 'all') {
      chips.push({
        key: `origin-${originFilter}`,
        label: originFilter === 'personal' ? 'Personal' : 'Base',
        onRemove: () => setOriginFilter('all'),
      });
    }

    categoryFilters.forEach((value) => {
      const option = PUNISHMENT_CATEGORY_OPTIONS.find((item) => item.name === value);

      if (option) {
        chips.push({
          key: `category-${value}`,
          label: option.label,
          onRemove: () => setCategoryFilters((current) => current.filter((item) => item !== value)),
        });
      }
    });

    difficultyFilters.forEach((value) => {
      const option = PUNISHMENT_DIFFICULTY_OPTIONS.find((item) => item.value === value);

      if (option) {
        chips.push({
          key: `difficulty-${value}`,
          label: option.label,
          onRemove: () => setDifficultyFilters((current) => current.filter((item) => item !== value)),
        });
      }
    });

    if (searchQuery.trim()) {
      chips.push({
        key: 'search',
        label: `"${searchQuery.trim()}"`,
        onRemove: () => setSearchQuery(''),
      });
    }

    return chips;
  }, [categoryFilters, difficultyFilters, originFilter, searchQuery]);

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

  useEffect(() => {
    if (params.tab === 'library' || params.tab === 'mine') {
      setActivePrimaryTab(params.tab);
    }
  }, [params.tab]);

  useEffect(() => {
    if (!isFiltersOpen) {
      return;
    }

    setDraftOriginFilter(originFilter);
    setDraftCategoryFilters(categoryFilters);
    setDraftDifficultyFilters(difficultyFilters);
  }, [categoryFilters, difficultyFilters, isFiltersOpen, originFilter]);

  useEffect(() => {
    setLibraryPage(1);
  }, [searchQuery, originFilter, categoryFilters, difficultyFilters]);

  useEffect(() => {
    if (libraryPage > totalLibraryPages) {
      setLibraryPage(totalLibraryPages);
    }
  }, [libraryPage, totalLibraryPages]);

  useFocusEffect(
    useCallback(() => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
      });
    }, []),
  );

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
    });
  }, [activePrimaryTab]);

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

  const resetAllFilters = () => {
    setOriginFilter('all');
    setCategoryFilters([]);
    setDifficultyFilters([]);
    setSearchQuery('');
    setLibraryPage(1);
  };

  const toggleDraftCategory = (value: string) => {
    setDraftCategoryFilters((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  };

  const toggleDraftDifficulty = (value: 1 | 2 | 3) => {
    setDraftDifficultyFilters((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  };

  const applyFilters = () => {
    setOriginFilter(draftOriginFilter);
    setCategoryFilters(draftCategoryFilters);
    setDifficultyFilters(draftDifficultyFilters);
    setLibraryPage(1);
    setIsFiltersOpen(false);
  };

  const goToLibraryPage = (page: number) => {
    setLibraryPage(page);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, librarySectionY - spacing.sm), animated: true });
    });
  };

  const renderPendingSummary = () => {
    if (pendingPunishments.length === 0) {
      return (
        <View style={styles.summaryEmptyState}>
          <Text style={styles.summaryEmptyTitle}>Sin castigos pendientes</Text>
          <Text style={styles.summaryEmptyDescription}>
            Cuando incumplas un objetivo, veras aqui la consecuencia asociada para que puedas cumplirla
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
            onShowInfo={() => setInfoPunishment(pendingPunishment)}
            onComplete={() => confirmCompletion(pendingPunishment)}
          />
        ))}
      </View>
    );
  };

  const renderHistoryView = () => (
    <View style={styles.contentSection}>
      <Pressable
        accessibilityHint={`${isCompletedHistoryOpen ? 'Oculta' : 'Muestra'} la seccion de castigos cumplidos`}
        accessibilityLabel="Alternar castigos cumplidos"
        accessibilityRole="button"
        onPress={() => setIsCompletedHistoryOpen((current) => !current)}
        style={({ pressed }) => [styles.contentSectionHeader, styles.collapsibleSectionHeader, pressed && styles.secondaryNavPressed]}>
        <View style={styles.sectionHeaderCopy}>
          <Text style={styles.sectionTitle}>Cumplidos</Text>
        </View>
        <View style={styles.historyHeaderActions}>
          <View style={[styles.countBadge, styles.historyCountBadge]}>
            <Text style={[styles.countBadgeLabel, styles.historyCountBadgeLabel]}>{completedPunishmentHistory.length}</Text>
          </View>
          <View style={styles.historyChevron}>
            <Ionicons color={palette.primaryDeep} name={isCompletedHistoryOpen ? 'chevron-up' : 'chevron-down'} size={18} />
          </View>
        </View>
      </Pressable>

      {!isCompletedHistoryOpen ? null : completedPunishmentHistory.length === 0 ? (
        <View style={styles.inlineEmpty}>
          <EmptyState
            title="Sin castigos cumplidos"
            message="Cuando confirmes un castigo como cumplido, se guardara aqui con su fecha."
          />
        </View>
      ) : (
        completedPunishmentHistory.map((entry) => (
          <CompletedHistoryCard key={entry.id} entry={entry} onShowInfo={() => setInfoCompletedEntry(entry)} />
        ))
      )}
    </View>
  );

  const renderLibraryResults = () => {
    if (allLibraryPunishments.length === 0) {
      return (
        <View style={styles.inlineEmpty}>
          <EmptyState
            title="No hay castigos todavia"
            message="Crea tu primer castigo para empezar a construir tu biblioteca."
            actionLabel="Crear castigo"
            onAction={() => router.push(appRoutes.createPunishment)}
          />
        </View>
      );
    }

    if (filteredLibraryPunishments.length === 0) {
      return (
        <View style={styles.inlineEmpty}>
          <EmptyState
            title="No hay castigos que coincidan con los filtros"
            message="Prueba con otra combinacion o limpia los filtros activos."
            actionLabel="Limpiar filtros"
            onAction={resetAllFilters}
          />
        </View>
      );
    }

    return paginatedLibraryPunishments.map((punishment) => (
      <PunishmentCard
        key={punishment.id}
        punishment={punishment}
        actions={
          punishment.scope === 'personal' ? (
            <Pressable
              accessibilityHint="Muestra mas acciones para este castigo"
              accessibilityLabel={`Abrir menu de ${punishment.title}`}
              accessibilityRole="button"
              disabled={saving}
              onPress={(event) => {
                event.stopPropagation();
                setActiveMenuPunishmentId(punishment.id);
              }}
              style={({ pressed }) => [styles.moreButton, pressed && styles.secondaryNavPressed, saving && styles.disabled]}>
              <Ionicons color={palette.ink} name="ellipsis-horizontal" size={18} />
            </Pressable>
          ) : undefined
        }
      />
    ));
  };

  const renderLibraryView = () => (
    <View style={styles.pageContent}>
      <View style={[styles.summaryCard, styles.librarySummaryCard]}>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatLabel}>Mis castigos</Text>
            <Text style={styles.summaryStatValue}>{personalPunishments.length}</Text>
          </View>
          <View style={styles.summaryStatDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatLabel}>Estándar</Text>
            <Text style={styles.summaryStatValue}>{basePunishments.length}</Text>
          </View>
        </View>
      </View>

      <View
        onLayout={(event) => {
          setLibrarySectionY(event.nativeEvent.layout.y);
        }}
        style={styles.contentSection}>
        <View style={styles.contentSectionHeader}>
          <View style={styles.sectionHeaderCopy}>
            <Text style={styles.sectionTitle}>Biblioteca</Text>
          </View>
          <View style={[styles.countBadge, styles.historyCountBadge]}>
            <Text style={[styles.countBadgeLabel, styles.historyCountBadgeLabel]}>{filteredLibraryPunishments.length}</Text>
          </View>
        </View>

        <View style={styles.libraryToolbar}>
          <View style={styles.searchShell}>
            <Ionicons color="#708198" name="search-outline" size={18} />
            <TextInput
              onChangeText={setSearchQuery}
              placeholder="Nombre o descripción"
              placeholderTextColor="#8EA0B7"
              style={styles.searchInput}
              value={searchQuery}
            />
          </View>

          <Pressable onPress={() => setIsFiltersOpen(true)} style={styles.filterButton}>
            <Ionicons color={palette.primaryDeep} name="options-outline" size={18} />
            <Text style={styles.filterButtonLabel}>Filtros</Text>
          </Pressable>
        </View>

        {activeFilterChips.length > 0 ? (
          <View style={styles.activeFiltersBlock}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFiltersRow}>
              {activeFilterChips.map((chip) => (
                <Pressable key={chip.key} onPress={chip.onRemove} style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterChipLabel}>{chip.label}</Text>
                  <Ionicons color={palette.primaryDeep} name="close" size={14} />
                </Pressable>
              ))}
              <Pressable onPress={resetAllFilters} style={styles.clearFiltersChip}>
                <Text style={styles.clearFiltersChipLabel}>Limpiar filtros</Text>
              </Pressable>
            </ScrollView>
          </View>
        ) : null}

        {renderLibraryResults()}

        {filteredLibraryPunishments.length > LIBRARY_PAGE_SIZE ? (
          <View style={styles.paginationRow}>
            <Pressable
              disabled={libraryPage === 1}
              onPress={() => goToLibraryPage(Math.max(1, libraryPage - 1))}
              style={[styles.paginationButton, libraryPage === 1 && styles.disabled]}>
              <Ionicons color={palette.primaryDeep} name="chevron-back" size={16} />
              <Text style={styles.paginationButtonLabel}>Anterior</Text>
            </Pressable>

            <Text style={styles.paginationLabel}>
              Página {libraryPage} de {totalLibraryPages}
            </Text>

            <Pressable
              disabled={libraryPage === totalLibraryPages}
              onPress={() => goToLibraryPage(Math.min(totalLibraryPages, libraryPage + 1))}
              style={[styles.paginationButton, libraryPage === totalLibraryPages && styles.disabled]}>
              <Text style={styles.paginationButtonLabel}>Siguiente</Text>
              <Ionicons color={palette.primaryDeep} name="chevron-forward" size={16} />
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );

  const renderMineView = () => (
    <View style={styles.pageContent}>
      <View style={[styles.summaryCard, styles.mineSummaryCard]}>
        <View style={styles.contentSectionHeader}>
          <View style={styles.sectionHeaderCopy}>
            <Text style={styles.sectionTitle}>Pendientes</Text>
          </View>
          <View style={[styles.countBadge, styles.historyCountBadge, styles.pendingCountBadge]}>
            <Text style={[styles.countBadgeLabel, styles.historyCountBadgeLabel, styles.pendingCountBadgeLabel]}>
              {pendingPunishments.length}
            </Text>
          </View>
        </View>
        {renderPendingSummary()}
      </View>

      {renderHistoryView()}
    </View>
  );

  const renderSecondaryNav = () => (
    <View
      onLayout={(event) => {
        const nextHeight = Math.ceil(event.nativeEvent.layout.height);
        setSecondaryNavHeight((current) => (current === nextHeight ? current : nextHeight));
      }}
      style={styles.secondaryNavShell}>
      <View style={styles.secondaryNavBar}>
        {SECONDARY_NAV_ITEMS.map((item, index) => {
          const isTab = item.type === 'tab';
          const isActive = isTab && item.key === activePrimaryTab;
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
                  <Ionicons color={iconColor} name={item.icon} size={17} />
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
  );

  return (
    <ScreenContainer title="Castigos" scroll={false} enableTabSwipe={false} stableOverlay={renderSecondaryNav()}>
      <Modal
        animationType="fade"
        transparent
        visible={infoCompletedEntry !== null}
        onRequestClose={() => setInfoCompletedEntry(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setInfoCompletedEntry(null)} />

          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Detalle del castigo</Text>

            <View style={styles.infoDetailGroup}>
              <Text style={styles.infoDetailLabel}>Titulo</Text>
              <Text style={styles.infoDetailValue}>{infoCompletedEntry?.punishmentTitle}</Text>
            </View>

            <View style={styles.infoDetailGroup}>
              <Text style={styles.infoDetailLabel}>Descripcion</Text>
              <Text style={styles.infoDetailValue}>
                {infoCompletedEntry?.punishmentDescription || 'Sin descripcion disponible.'}
              </Text>
            </View>

            <View style={styles.infoDetailGroup}>
              <Text style={styles.infoDetailLabel}>Fecha</Text>
              <Text style={styles.infoDetailValue}>
                {infoCompletedEntry ? formatLongDate(toISODate(infoCompletedEntry.completedAt)) : ''}
              </Text>
            </View>

            <View style={styles.infoDetailGroup}>
              <Text style={styles.infoDetailLabel}>Objetivo relacionado</Text>
              <Text style={styles.infoDetailValue}>{infoCompletedEntry?.goalTitle || 'Sin objetivo relacionado'}</Text>
            </View>

            <View style={styles.modalActions}>
              <Pressable onPress={() => setInfoCompletedEntry(null)} style={styles.secondaryButton}>
                <Text style={styles.secondaryLabel}>Cerrar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={infoPunishment !== null} onRequestClose={() => setInfoPunishment(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setInfoPunishment(null)} />

          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Informacion</Text>
            <Text style={styles.infoModalMessage}>
              <Text style={styles.pendingAlertLabel}>No cumpliste: </Text>
              {infoPunishment?.goalTitle}
            </Text>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setInfoPunishment(null)} style={styles.secondaryButton}>
                <Text style={styles.secondaryLabel}>Cerrar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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

      <Modal animationType="fade" transparent visible={isFiltersOpen} onRequestClose={() => setIsFiltersOpen(false)}>
        <View style={styles.filterOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsFiltersOpen(false)} />

          <View style={styles.filterSheet}>
            <View style={styles.filterHandle} />
            <View style={styles.filterSheetHeader}>
              <View>
                <Text style={styles.filterEyebrow}>Filtros</Text>
                <Text style={styles.filterTitle}>Refina la biblioteca</Text>
              </View>
              <Pressable onPress={() => setIsFiltersOpen(false)} style={styles.filterCloseButton}>
                <Ionicons color={palette.ink} name="close" size={18} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterSections}>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Origen</Text>
                <View style={styles.filterOptionWrap}>
                  {ORIGIN_FILTER_OPTIONS.map((option) => {
                    const isActive = draftOriginFilter === option.value;

                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => setDraftOriginFilter(option.value)}
                        style={[styles.filterChip, isActive && styles.filterChipActive]}>
                        <Text style={[styles.filterChipLabel, isActive && styles.filterChipLabelActive]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Categoria</Text>
                <View style={styles.filterOptionWrap}>
                  {PUNISHMENT_CATEGORY_OPTIONS.map((option) => {
                    const isActive = draftCategoryFilters.includes(option.value);

                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => toggleDraftCategory(option.value)}
                        style={[
                          styles.filterChip,
                          styles.filterColorChip,
                          { backgroundColor: isActive ? option.accent : option.tint, borderColor: option.accent },
                        ]}>
                        <Text style={[styles.filterChipLabel, { color: isActive ? palette.snow : option.accent }]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Dificultad</Text>
                <View style={styles.filterOptionWrap}>
                  {PUNISHMENT_DIFFICULTY_OPTIONS.map((option) => {
                    const isActive = draftDifficultyFilters.includes(option.value);

                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => toggleDraftDifficulty(option.value)}
                        style={[
                          styles.filterChip,
                          styles.filterColorChip,
                          { backgroundColor: isActive ? option.accent : option.tint, borderColor: option.accent },
                        ]}>
                        <Text style={[styles.filterChipLabel, { color: isActive ? palette.snow : option.accent }]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={styles.filterActions}>
              <Pressable
                onPress={() => {
                  setDraftOriginFilter('all');
                  setDraftCategoryFilters([]);
                  setDraftDifficultyFilters([]);
                }}
                style={styles.filterSecondaryButton}>
                <Text style={styles.filterSecondaryLabel}>Limpiar</Text>
              </Pressable>
              <Pressable onPress={applyFilters} style={styles.filterPrimaryButton}>
                <Text style={styles.filterPrimaryLabel}>Aplicar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ObjectiveActionsMenu
        goalTitle={activeMenuPunishment?.title ?? ''}
        onClose={() => setActiveMenuPunishmentId(null)}
        onFinalize={() => {}}
        onReactivate={() => {}}
        onEdit={() => {
          if (!activeMenuPunishment) {
            return;
          }

          const punishmentId = activeMenuPunishment.id;
          setActiveMenuPunishmentId(null);
          router.push(appRoutes.editPunishment(punishmentId));
        }}
        onDelete={() => {
          if (!activeMenuPunishment) {
            return;
          }

          setPendingDeletePunishmentId(activeMenuPunishment.id);
          setActiveMenuPunishmentId(null);
        }}
        showEdit
        visible={Boolean(activeMenuPunishment)}
      />

      {pendingDeletePunishment ? (
        <GoalActionConfirmationModal
          confirmLabel={saving ? 'Borrando...' : 'Borrar'}
          description="El servidor bloqueara el borrado si este castigo ya fue asignado para conservar el historial."
          eyebrow="Eliminar castigo"
          onCancel={() => {
            if (!saving) {
              setPendingDeletePunishmentId(null);
            }
          }}
          onConfirm={() => {
            if (!pendingDeletePunishment || saving) {
              return;
            }

            void (async () => {
              setSaving(true);

              try {
                await deleteCustomPunishment(pendingDeletePunishment.id);
                setPendingDeletePunishmentId(null);
              } catch {
                return;
              } finally {
                setSaving(false);
              }
            })();
          }}
          title="Borrar castigo"
          tone="danger"
          visible
        />
      ) : null}

      <FlingGestureHandler direction={Directions.LEFT} onActivated={() => handlePrimaryTabSwipe('left')}>
        <FlingGestureHandler direction={Directions.RIGHT} onActivated={() => handlePrimaryTabSwipe('right')}>
          <View style={styles.layout}>
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={[
                styles.contentScroll,
                { paddingBottom: tabBarHeight + insets.bottom + Math.max(secondaryNavHeight, 58) + spacing.md },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {activePrimaryTab === 'mine' ? renderMineView() : renderLibraryView()}
            </ScrollView>
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
  filterOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
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
  filterSheet: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: palette.snow,
    gap: spacing.md,
    ...shadows.card,
  },
  filterHandle: {
    width: 42,
    height: 5,
    borderRadius: radius.pill,
    alignSelf: 'center',
    backgroundColor: '#D7DFEB',
  },
  filterSheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  filterEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: palette.primaryDeep,
  },
  filterTitle: {
    marginTop: 2,
    fontSize: 22,
    fontWeight: '900',
    color: palette.ink,
  },
  filterCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F6FA',
  },
  filterSections: {
    gap: spacing.md,
    paddingBottom: spacing.xs,
  },
  filterSection: {
    gap: spacing.sm,
  },
  filterSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.ink,
  },
  filterOptionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#D7E0EB',
    backgroundColor: '#F8FAFD',
  },
  filterColorChip: {
    borderWidth: 0,
  },
  filterChipActive: {
    backgroundColor: palette.primaryDeep,
    borderColor: palette.primaryDeep,
  },
  filterChipLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: palette.slate,
  },
  filterChipLabelActive: {
    color: palette.snow,
  },
  filterActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterSecondaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D7E0EB',
    backgroundColor: palette.snow,
  },
  filterSecondaryLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.ink,
  },
  filterPrimaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: palette.primaryDeep,
  },
  filterPrimaryLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.snow,
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
    padding: spacing.md,
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    gap: spacing.xs,
  },
  librarySummaryCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#F7FAFF',
    borderColor: '#DCE8F8',
    shadowColor: '#AFC4E5',
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  summaryStatDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#D7E1EF',
  },
  summaryStatValue: {
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '900',
    color: '#6A7D98',
  },
  summaryStatLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C2C45',
    textAlign: 'center',
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
  summaryPendingList: {
    gap: 2,
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
  pendingCountBadge: {
    backgroundColor: '#FDE68A',
  },
  pendingCountBadgeLabel: {
    color: '#92400E',
  },
  libraryToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchShell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8E1ED',
    backgroundColor: '#F8FAFD',
  },
  searchInput: {
    flex: 1,
    height: 20,
    fontSize: 15,
    color: palette.ink,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CFE0FF',
    backgroundColor: '#EEF4FF',
  },
  filterButtonLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: palette.primaryDeep,
  },
  activeFiltersBlock: {
    gap: spacing.sm,
  },
  activeFiltersRow: {
    gap: spacing.xs,
    paddingRight: spacing.xs,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: '#EEF4FF',
    borderWidth: 1,
    borderColor: '#CFE0FF',
  },
  activeFilterChipLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.primaryDeep,
  },
  clearFiltersChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: '#F3F6FA',
    borderWidth: 1,
    borderColor: '#D7E0EB',
  },
  clearFiltersChipLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.slate,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 108,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CFE0FF',
    backgroundColor: '#EEF4FF',
  },
  paginationButtonLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: palette.primaryDeep,
  },
  paginationLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: palette.slate,
  },
  collapsibleSectionHeader: {
    alignItems: 'center',
  },
  historyHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  historyChevron: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF3FB',
  },
  inlineEmpty: {
    paddingTop: spacing.xs,
  },
  pendingItem: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    gap: spacing.xs,
  },
  pendingCopy: {
    gap: 4,
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
  pendingAlertLabel: {
    color: '#92400E',
    fontWeight: '700',
  },
  pendingActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  pendingInfoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDE68A',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  pendingButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: '#CA8A04',
  },
  pendingCompleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: '#CA8A04',
  },
  pendingButtonLabel: {
    color: palette.snow,
    fontWeight: '800',
  },
  infoModalMessage: {
    fontSize: 16,
    lineHeight: 24,
    color: palette.ink,
    textAlign: 'center',
  },
  infoDetailGroup: {
    gap: 4,
  },
  infoDetailLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: palette.primaryDeep,
  },
  infoDetailValue: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.ink,
  },
  disabled: {
    opacity: 0.6,
  },
  card: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: palette.line,
    gap: spacing.sm,
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
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardFooterActions: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
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
  previewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  previewTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  previewTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  moreButton: {
    width: 38,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D7DEE9',
    backgroundColor: '#F8FAFC',
  },
  historyCard: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: '#F9FBFF',
    borderWidth: 1,
    borderColor: '#E1EAF5',
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  historyCardCopy: {
    flex: 1,
    gap: 2,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
  },
  historyMeta: {
    color: palette.slate,
    fontSize: 13,
  },
  historyInfoButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F0FF',
    borderWidth: 1,
    borderColor: '#C8DAFF',
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
  secondaryNavShell: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
