import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type DimensionValue } from 'react-native';

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { PUNISHMENT_CATEGORY_OPTIONS } from '@/src/constants/punishments';
import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import {
  buildMonthCalendar,
  clamp,
  formatMonthLabel,
  getMonthAnchor,
  getRateForRequiredDays,
  getRequiredDays,
  weekdayLabels,
} from '@/src/features/goals/goal-form';
import { usePunishmentCatalog } from '@/src/features/punishments/selectors';
import { Goal, GoalPunishmentCategoryMode, GoalPunishmentConfig, GoalPunishmentScope, PunishmentCategoryName } from '@/src/models/types';
import { appRoutes } from '@/src/navigation/app-routes';
import { useAppStore } from '@/src/store/app-store';
import { addDays, diffInDays, formatCompactDate, formatShortDate, formatShortDateWithPreposition, startOfToday } from '@/src/utils/date';

type Props = {
  mode: 'create' | 'edit';
  goal?: Goal;
};

type WizardStep = 1 | 2 | 3 | 4;

type GoalDraft = {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  minimumDays: number;
  punishmentScope: GoalPunishmentScope;
  punishmentCategoryMode: GoalPunishmentCategoryMode;
  selectedCategories: PunishmentCategoryName[];
};

type CalendarSelectorProps = {
  disabled?: boolean;
  minDate: string;
  month: Date;
  selectedDate: string;
  onMonthChange: (updater: (current: Date) => Date) => void;
  onSelect: (date: string) => void;
};

const SCOPE_OPTIONS: { description: string; label: string; value: GoalPunishmentScope }[] = [
  { label: 'Estándar', value: 'base', description: 'Solo se podrán asignar castigos base de la app.' },
  { label: 'Personales', value: 'personal', description: 'Solo se podrán asignar castigos creados por el usuario.' },
  { label: 'Ambos', value: 'both', description: 'Podrán entrar castigos base y personales.' },
];

function buildInitialDraft(goal?: Goal): GoalDraft {
  const startDate = goal?.startDate ?? startOfToday();
  const durationDays = Math.max(goal?.targetDays ?? 7, 1);
  const minimumDays = Math.max(getRequiredDays(durationDays, goal?.minimumSuccessRate ?? 80), 1);
  const punishmentConfig = goal?.punishmentConfig;

  return {
    title: goal?.title ?? '',
    description: goal?.description ?? '',
    startDate,
    endDate: addDays(startDate, durationDays - 1),
    minimumDays,
    punishmentScope: punishmentConfig?.scope ?? 'base',
    punishmentCategoryMode: punishmentConfig?.categoryMode ?? 'all',
    selectedCategories: punishmentConfig?.categoryNames ?? [],
  };
}

function CalendarSelector({ disabled, minDate, month, selectedDate, onMonthChange, onSelect }: CalendarSelectorProps) {
  const calendarDays = useMemo(() => buildMonthCalendar(month), [month]);

  return (
    <View style={styles.calendarSection}>
      <View style={styles.calendarHeader}>
        <View style={styles.monthSwitcher}>
          <Pressable
            disabled={disabled}
            onPress={() => onMonthChange((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
            style={styles.monthButton}>
            <Feather color={palette.primaryDeep} name="chevron-left" size={18} />
          </Pressable>
          <Text style={styles.monthLabel}>{formatMonthLabel(month)}</Text>
          <Pressable
            disabled={disabled}
            onPress={() => onMonthChange((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
            style={styles.monthButton}>
            <Feather color={palette.primaryDeep} name="chevron-right" size={18} />
          </Pressable>
        </View>
      </View>

      <View style={styles.weekRow}>
        {weekdayLabels.map((label) => (
          <Text key={label} style={styles.weekday}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.statsCalendarGrid}>
        {calendarDays.map((day) => {
          const isDisabled = day.date < minDate;
          const isSelected = day.date === selectedDate;

          return (
            <View key={day.date} style={styles.dayCell}>
              <Pressable
                disabled={disabled || isDisabled}
                onPress={() => onSelect(day.date)}
                style={[
                  styles.dayBubble,
                  isSelected ? styles.calendarDayButtonSelected : styles.calendarDayButtonDefault,
                  !day.inMonth ? styles.dayOutsideMonth : null,
                  isDisabled ? styles.calendarDayButtonDisabled : null,
                ]}>
                <Text
                  style={[
                    styles.dayLabel,
                    isSelected ? styles.calendarDayLabelSelected : null,
                    (!day.inMonth || isDisabled) && !isSelected ? styles.dayLabelOutsideMonth : null,
                  ]}>
                  {day.dayNumber}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function getPunishmentSummary(config: GoalPunishmentConfig) {
  const scopeLabel = SCOPE_OPTIONS.find((option) => option.value === config.scope)?.label ?? 'Castigos estándar';

  if (config.categoryMode === 'all') {
    return `${scopeLabel} + todas las categorías`;
  }

  const labels = PUNISHMENT_CATEGORY_OPTIONS.filter((option) => config.categoryNames.includes(option.name)).map((option) => option.label);
  return `${scopeLabel} + ${labels.join(', ')}`;
}

export function GoalFormScreen({ mode, goal }: Props) {
  const createGoal = useAppStore((state) => state.createGoal);
  const updateGoal = useAppStore((state) => state.updateGoal);
  const { punishmentsLoaded, refreshPunishmentCatalog, basePunishments, personalPunishments } = usePunishmentCatalog();
  const today = startOfToday();

  const [step, setStep] = useState<WizardStep>(1);
  const [draft, setDraft] = useState<GoalDraft>(() => buildInitialDraft(goal));
  const [saving, setSaving] = useState(false);
  const [pendingExitHref, setPendingExitHref] = useState<string | null>(null);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [hasTouchedTitle, setHasTouchedTitle] = useState(false);
  const [showEligiblePunishments, setShowEligiblePunishments] = useState(false);
  const [minimumDaysInput, setMinimumDaysInput] = useState(() => String(buildInitialDraft(goal).minimumDays));
  const [startMonth, setStartMonth] = useState(() => getMonthAnchor(goal?.startDate ?? today));
  const [endMonth, setEndMonth] = useState(() => getMonthAnchor(addDays(goal?.startDate ?? today, Math.max((goal?.targetDays ?? 7) - 1, 0))));
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (!punishmentsLoaded) {
      void refreshPunishmentCatalog().catch(() => undefined);
    }
  }, [punishmentsLoaded, refreshPunishmentCatalog]);

  useEffect(() => {
    if (draft.endDate < draft.startDate) {
      setDraft((current) => ({
        ...current,
        endDate: current.startDate,
      }));
      setEndMonth(getMonthAnchor(draft.startDate));
    }
  }, [draft.endDate, draft.startDate]);

  useEffect(() => {
    if (!pendingExitHref) {
      return;
    }

    router.replace(pendingExitHref);
  }, [pendingExitHref]);

  const minimumStartDate = mode === 'create' ? today : draft.startDate < today ? draft.startDate : today;
  const durationDays = useMemo(() => Math.max(diffInDays(draft.startDate, draft.endDate) + 1, 1), [draft.endDate, draft.startDate]);
  const requiredDays = useMemo(() => clamp(draft.minimumDays, 1, durationDays), [draft.minimumDays, durationDays]);
  const minimumPercentage = useMemo(() => clamp(getRateForRequiredDays(durationDays, requiredDays), 1, 100), [durationDays, requiredDays]);
  const punishmentConfig = useMemo<GoalPunishmentConfig>(
    () => ({
      categoryMode: draft.punishmentCategoryMode,
      categoryNames: draft.punishmentCategoryMode === 'all' ? [] : draft.selectedCategories,
      scope: draft.punishmentScope,
    }),
    [draft.punishmentCategoryMode, draft.punishmentScope, draft.selectedCategories],
  );
  const eligiblePunishments = useMemo(() => {
    const sourcePunishments =
      punishmentConfig.scope === 'base'
        ? basePunishments
        : punishmentConfig.scope === 'personal'
          ? personalPunishments
          : [...basePunishments, ...personalPunishments];

    return sourcePunishments.filter((punishment) => {
      if (punishmentConfig.categoryMode === 'all') {
        return true;
      }

      return punishmentConfig.categoryNames.includes(punishment.categoryName);
    });
  }, [basePunishments, personalPunishments, punishmentConfig]);

  const titleError = draft.title.trim().length >= 3 ? '' : 'Escribe un nombre de al menos 3 caracteres.';
  const showTitleError = hasTouchedTitle && Boolean(titleError);
  const startDateError = draft.startDate >= minimumStartDate ? '' : 'La fecha de inicio no puede estar en el pasado.';
  const durationError = draft.endDate < draft.startDate ? 'La fecha de finalización no puede ser anterior al inicio.' : '';
  const minimumError = requiredDays >= 1 && requiredDays <= durationDays ? '' : 'Debes elegir entre 1 y la duración total.';
  const punishmentCategoryError =
    draft.punishmentCategoryMode === 'selected' && draft.selectedCategories.length === 0
      ? 'Selecciona al menos una categoría o usa todas.'
      : '';
  const punishmentPoolError =
    punishmentsLoaded && eligiblePunishments.length === 0
      ? 'No hay castigos elegibles con esta configuración. Ajusta el origen o las categorías.'
      : '';

  const canContinueStep1 = !titleError;
  const canContinueStep2 = !startDateError && !durationError;
  const canContinueStep3 = !minimumError;
  const canSubmit = canContinueStep1 && canContinueStep2 && canContinueStep3 && !punishmentCategoryError && !punishmentPoolError;
  const hasGoalStarted = mode === 'edit' && draft.startDate <= today;
  const canEditStartDate = mode === 'create' || !hasGoalStarted;

  const progressWidth = `${(step / 4) * 100}%` as DimensionValue;
  const durationSummary = useMemo(
    () => `Del ${formatShortDateWithPreposition(draft.startDate)} al ${formatShortDate(draft.endDate)}`,
    [draft.endDate, draft.startDate],
  );
  const minimumSummary = useMemo(
    () => `Debes cumplir ${requiredDays} de ${durationDays} ${durationDays === 1 ? 'día' : 'días'}`,
    [durationDays, requiredDays],
  );
  const punishmentSummary = useMemo(() => getPunishmentSummary(punishmentConfig), [punishmentConfig]);
  const startDateDisplayLabel = draft.startDate === today ? 'Hoy' : formatCompactDate(draft.startDate);

  useEffect(() => {
    setMinimumDaysInput(String(requiredDays));
  }, [requiredDays]);

  const updateDraft = (partial: Partial<GoalDraft>) => {
    setDraft((current) => ({ ...current, ...partial }));
  };

  const toggleCategory = (categoryName: PunishmentCategoryName) => {
    setDraft((current) => ({
      ...current,
      selectedCategories: current.selectedCategories.includes(categoryName)
        ? current.selectedCategories.filter((item) => item !== categoryName)
        : [...current.selectedCategories, categoryName],
    }));
  };

  const handleNext = () => {
    if (step === 1 && canContinueStep1) {
      setStep(2);
      return;
    }

    if (step === 1) {
      setHasTouchedTitle(true);
    }

    if (step === 2 && canContinueStep2) {
      setStep(3);
      return;
    }

    if (step === 3 && canContinueStep3) {
      setStep(4);
    }
  };

  const handleCancel = () => {
    if (isSubmittingRef.current) {
      return;
    }

    setPendingExitHref(appRoutes.goals);
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      minimumSuccessRate: minimumPercentage,
      punishmentConfig,
      startDate: draft.startDate,
      targetDays: durationDays,
    };

    isSubmittingRef.current = true;
    setSaving(true);

    try {
      if (mode === 'create') {
        await createGoal(payload);
      } else if (goal) {
        await updateGoal(goal.id, payload);
      }

      setPendingExitHref(appRoutes.goals);
    } catch (error) {
      isSubmittingRef.current = false;
      throw error;
    } finally {
      setSaving(false);
    }
  };

  if (mode === 'edit' && goal?.lifecycleStatus === 'closed') {
    return (
      <ScreenContainer title="Editar objetivo" scroll={false}>
        <View style={styles.lockedState}>
          <Text style={styles.lockedTitle}>Objetivo cerrado</Text>
          <Text style={styles.lockedDescription}>Los objetivos cerrados ya no se pueden editar para mantener su resultado histórico.</Text>
          <Pressable onPress={() => router.replace(appRoutes.goals)} style={styles.submit}>
            <Text style={styles.submitLabel}>Volver a objetivos</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer fixedHeader title={mode === 'create' ? 'Crear objetivo' : 'Editar objetivo'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}>
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressStep}>Paso {step} de 4</Text>
            <Text style={styles.progressCaption}>
              {step === 1 ? 'Objetivo' : step === 2 ? 'Duración' : step === 3 ? 'Cumplimiento' : 'Castigos'}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
        </View>

        {step === 1 ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Define tu objetivo</Text>

            <View style={styles.field}>
              <View style={styles.inlineHeader}>
                <Text style={styles.label}>Nombre del objetivo</Text>
                <Text style={styles.requiredTag}>Obligatorio</Text>
              </View>
              <TextInput
                editable={!saving}
                onBlur={() => {
                  if (!hasTouchedTitle) {
                    setHasTouchedTitle(true);
                  }
                }}
                placeholder="Hacer ejercicio"
                value={draft.title}
                onChangeText={(value) => updateDraft({ title: value })}
                style={[styles.input, styles.compactInput, showTitleError ? styles.inputError : null]}
              />
              {showTitleError ? <Text style={styles.errorText}>{titleError}</Text> : null}
            </View>

            <View style={styles.field}>
              <View style={styles.inlineHeader}>
                <Text style={styles.label}>Descripción</Text>
                <Text style={styles.optionalTag}>Opcional</Text>
              </View>
              <TextInput
                editable={!saving}
                multiline
                placeholder="30 minutos de fuerza o cardio"
                value={draft.description}
                onChangeText={(value) => updateDraft({ description: value })}
                style={[styles.input, styles.multiline]}
              />
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Duración</Text>

            {canEditStartDate ? (
              <View style={styles.field}>
                <Text style={styles.label}>Fecha de inicio</Text>
                <Pressable
                  disabled={saving}
                  onPress={() => setShowStartCalendar((current) => !current)}
                  style={[styles.selectorCard, showStartCalendar ? styles.selectorCardActive : null]}>
                  <View style={styles.selectorCopy}>
                    <Text style={styles.selectorText}>El objetivo empieza el</Text>
                    <Text style={styles.selectorTitle}>{startDateDisplayLabel}</Text>
                  </View>
                  <Text style={styles.selectorAction}>{showStartCalendar ? 'Ocultar' : 'Cambiar'}</Text>
                </Pressable>

                {showStartCalendar ? (
                  <CalendarSelector
                    disabled={saving}
                    minDate={minimumStartDate}
                    month={startMonth}
                    selectedDate={draft.startDate}
                    onMonthChange={(updater) => setStartMonth((current) => updater(current))}
                    onSelect={(date) => {
                      const nextEndDate = draft.endDate < date ? date : draft.endDate;
                      updateDraft({ endDate: nextEndDate, startDate: date });
                      setShowStartCalendar(false);
                      setEndMonth(getMonthAnchor(nextEndDate));
                    }}
                  />
                ) : null}

                {startDateError ? <Text style={styles.errorText}>{startDateError}</Text> : null}
              </View>
            ) : mode === 'edit' ? (
              <View style={styles.field}>
                <Text style={styles.label}>Fecha de inicio</Text>
                <View style={styles.selectorCard}>
                  <View style={styles.selectorCopy}>
                    <Text style={styles.selectorText}>El objetivo empieza el</Text>
                    <Text style={styles.selectorTitle}>{startDateDisplayLabel}</Text>
                  </View>
                </View>
                <View style={styles.startDateNotice}>
                  <Text style={styles.startDateNoticeText}>No se puede modificar la fecha de inicio en objetivos empezados</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Fecha de finalización</Text>
              <Pressable
                disabled={saving}
                onPress={() => setShowEndCalendar((current) => !current)}
                style={[styles.selectorCard, showEndCalendar ? styles.selectorCardActive : null]}>
                <View style={styles.selectorCopy}>
                  <Text style={styles.selectorText}>El objetivo acaba el</Text>
                  <Text style={styles.selectorTitle}>{formatCompactDate(draft.endDate)}</Text>
                </View>
                <Text style={styles.selectorAction}>{showEndCalendar ? 'Ocultar' : 'Cambiar'}</Text>
              </Pressable>

              {showEndCalendar ? (
                <CalendarSelector
                  disabled={saving}
                  minDate={draft.startDate}
                  month={endMonth}
                  selectedDate={draft.endDate}
                  onMonthChange={(updater) => setEndMonth((current) => updater(current))}
                  onSelect={(date) => {
                    updateDraft({ endDate: date });
                    setShowEndCalendar(false);
                  }}
                />
              ) : null}

              {durationError ? <Text style={styles.errorText}>{durationError}</Text> : null}
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryEyebrow}>Resumen</Text>
              <Text style={styles.summaryTitle}>{durationSummary}</Text>
              <Text style={styles.summaryText}>{`Duración total: ${durationDays} ${durationDays === 1 ? 'día' : 'días'}`}</Text>
            </View>
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Días que debes cumplir</Text>
            <Text style={styles.helper}>Elige el mínimo de días que tienes que cumplir con el objetivo para aprobarlo</Text>

            <View style={styles.stepperCard}>
              <View style={styles.stepperHeader}>
                <Text style={styles.stepperLabel}>Mínimo</Text>
                <Text style={styles.stepperMeta}>({minimumPercentage}%)</Text>
              </View>
              <View style={styles.stepperControls}>
                <Pressable disabled={saving} onPress={() => updateDraft({ minimumDays: Math.max(requiredDays - 1, 1) })} style={styles.stepperButton}>
                  <Text style={styles.stepperButtonText}>-</Text>
                </Pressable>
                <View style={styles.stepperMainValueWrap}>
                  <TextInput
                    editable={!saving}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#8EA0B7"
                    onBlur={() => {
                      const parsedValue = Number.parseInt(minimumDaysInput, 10);
                      const nextValue = Number.isNaN(parsedValue) ? requiredDays : clamp(parsedValue, 1, durationDays);
                      updateDraft({ minimumDays: nextValue });
                      setMinimumDaysInput(String(nextValue));
                    }}
                    onChangeText={(value) => {
                      const sanitizedValue = value.replace(/[^0-9]/g, '');
                      setMinimumDaysInput(sanitizedValue);
                    }}
                    style={styles.stepperValueInput}
                    value={minimumDaysInput}
                  />
                </View>
                <Pressable disabled={saving} onPress={() => updateDraft({ minimumDays: Math.min(requiredDays + 1, durationDays) })} style={styles.stepperButton}>
                  <Text style={styles.stepperButtonText}>+</Text>
                </Pressable>
              </View>
              <Text style={styles.stepperUnit}>
                de {durationDays} {durationDays === 1 ? 'día' : 'días'}
              </Text>
            </View>

            {minimumError ? <Text style={styles.errorText}>{minimumError}</Text> : null}

            <View style={styles.summaryCard}>
              <Text style={styles.summaryEyebrow}>Resumen</Text>
              <Text style={styles.summaryTitle}>{minimumSummary}</Text>
              <Text style={styles.summaryText}>
                {durationDays - requiredDays <= 0
                  ? 'No podrás fallar ningún día.'
                  : durationDays - requiredDays === 1
                    ? 'Podrás fallar 1 día.'
                    : `Podrás fallar hasta ${durationDays - requiredDays} días.`}
              </Text>
            </View>
          </View>
        ) : null}

        {step === 4 ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Selección de castigos</Text>
            <Text style={styles.helper}>Si fallas el objetivo, se te asignará un castigo aleatorio entre los que selecciones.</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Tipo</Text>
            <View style={styles.filterChipWrap}>
              {SCOPE_OPTIONS.map((option) => {
                const selected = option.value === draft.punishmentScope;

                return (
                  <Pressable
                    key={option.value}
                    disabled={saving}
                    onPress={() => updateDraft({ punishmentScope: option.value })}
                    style={[styles.filterChipOption, selected ? styles.filterChipOptionActive : null]}>
                    <Text style={[styles.filterChipOptionLabel, selected ? styles.filterChipOptionLabelActive : null]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            </View>

            <View style={styles.field}>
              <View style={styles.inlineHeader}>
                <Text style={styles.label}>Categorías</Text>
                <Text style={styles.requiredTag}>Obligatorio</Text>
              </View>
              <View style={styles.filterChipWrap}>
                <Pressable
                  disabled={saving}
                  onPress={() => updateDraft({ punishmentCategoryMode: 'all', selectedCategories: [] })}
                  style={[styles.filterChipOption, draft.punishmentCategoryMode === 'all' ? styles.filterChipOptionActive : null]}>
                  <Text style={[styles.filterChipOptionLabel, draft.punishmentCategoryMode === 'all' ? styles.filterChipOptionLabelActive : null]}>
                    Todas
                  </Text>
                </Pressable>
                <Pressable
                  disabled={saving}
                  onPress={() =>
                    updateDraft(
                      draft.punishmentCategoryMode === 'selected'
                        ? { punishmentCategoryMode: 'all', selectedCategories: [] }
                        : { punishmentCategoryMode: 'selected' },
                    )
                  }
                  style={[styles.filterChipOption, draft.punishmentCategoryMode === 'selected' ? styles.filterChipOptionActive : null]}>
                  <View style={styles.categoryModeButtonContent}>
                    <Text
                      style={[
                        styles.filterChipOptionLabel,
                        draft.punishmentCategoryMode === 'selected' ? styles.filterChipOptionLabelActive : null,
                      ]}>
                      Seleccionar
                    </Text>
                    <Feather
                      color={draft.punishmentCategoryMode === 'selected' ? palette.snow : palette.primaryDeep}
                      name="chevron-down"
                      size={16}
                    />
                  </View>
                </Pressable>
              </View>
            </View>

            {draft.punishmentCategoryMode === 'selected' ? (
              <View style={styles.categoryChipWrap}>
                {PUNISHMENT_CATEGORY_OPTIONS.map((option) => {
                  const selected = draft.selectedCategories.includes(option.name);

                  return (
                    <Pressable
                      key={option.name}
                      disabled={saving}
                      onPress={() => toggleCategory(option.name)}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: selected ? option.accent : option.tint,
                          borderColor: option.accent,
                        },
                      ]}>
                      <View
                        style={[
                          styles.categoryChipIconWrap,
                          {
                            backgroundColor: selected ? `${palette.snow}22` : palette.snow,
                          },
                        ]}>
                        <Ionicons color={selected ? palette.snow : option.accent} name={option.icon} size={18} />
                      </View>
                      <Text style={[styles.categoryChipTitle, { color: selected ? palette.snow : option.accent }]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {punishmentCategoryError ? <Text style={styles.errorText}>{punishmentCategoryError}</Text> : null}

            <View style={styles.summaryCard}>
              <Text style={styles.summaryEyebrow}>Resumen</Text>
              <Text style={styles.summaryTitle}>{punishmentSummary}</Text>
              <Pressable
                disabled={!punishmentsLoaded}
                onPress={() => setShowEligiblePunishments((current) => !current)}
                style={styles.summaryDisclosure}>
                <Text style={[styles.summaryText, !punishmentsLoaded ? styles.submitDisabled : null]}>
                  {punishmentsLoaded
                    ? `${eligiblePunishments.length} ${eligiblePunishments.length === 1 ? 'castigo disponible' : 'castigos disponibles'}`
                    : 'Cargando catálogo de castigos...'}
                </Text>
                {punishmentsLoaded ? (
                  <Feather color={palette.primaryDeep} name={showEligiblePunishments ? 'chevron-up' : 'chevron-down'} size={16} />
                ) : null}
              </Pressable>

              {showEligiblePunishments && punishmentsLoaded ? (
                <View style={styles.availablePunishmentsCard}>
                  {eligiblePunishments.length > 0 ? (
                    <View style={styles.availablePunishmentsScrollWrap}>
                      <ScrollView
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.availablePunishmentsContent}
                        style={styles.availablePunishmentsScroll}>
                        {eligiblePunishments.map((punishment) => (
                          <View key={punishment.id} style={styles.availablePunishmentRow}>
                            <View
                              style={[
                                styles.availablePunishmentIconWrap,
                                {
                                  backgroundColor:
                                    PUNISHMENT_CATEGORY_OPTIONS.find((option) => option.name === punishment.categoryName)?.tint ?? '#EEF4FF',
                                },
                              ]}>
                              <Ionicons
                                color={
                                  PUNISHMENT_CATEGORY_OPTIONS.find((option) => option.name === punishment.categoryName)?.accent ?? palette.primaryDeep
                                }
                                name={PUNISHMENT_CATEGORY_OPTIONS.find((option) => option.name === punishment.categoryName)?.icon ?? 'sparkles-outline'}
                                size={14}
                              />
                            </View>
                            <Text style={styles.availablePunishmentTitle}>{punishment.title}</Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  ) : (
                    <Text style={styles.availablePunishmentEmpty}>No hay castigos disponibles con esta seleccion.</Text>
                  )}
                </View>
              ) : null}
            </View>

            {punishmentPoolError ? <Text style={styles.errorText}>{punishmentPoolError}</Text> : null}
          </View>
        ) : null}

        <View style={styles.footerActionsStacked}>
          {step < 4 ? (
            <Pressable
              disabled={(step === 1 && !canContinueStep1) || (step === 2 && !canContinueStep2) || (step === 3 && !canContinueStep3) || saving}
              onPress={handleNext}
              style={[
                styles.submit,
                ((step === 1 && !canContinueStep1) || (step === 2 && !canContinueStep2) || (step === 3 && !canContinueStep3) || saving)
                  ? styles.submitDisabled
                  : null,
              ]}>
              <Text style={styles.submitLabel}>Continuar</Text>
            </Pressable>
          ) : (
            <Pressable disabled={!canSubmit || saving} onPress={() => void handleSubmit()} style={[styles.submit, !canSubmit || saving ? styles.submitDisabled : null]}>
              <Text style={styles.submitLabel}>{saving ? 'Guardando...' : mode === 'create' ? 'Crear objetivo' : 'Guardar cambios'}</Text>
            </Pressable>
          )}

          {step > 1 ? (
            <Pressable
              disabled={saving}
              onPress={() => {
                if (isSubmittingRef.current) {
                  return;
                }

                setStep((current) => (current === 4 ? 3 : current === 3 ? 2 : 1));
              }}
              style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonLabel}>Atrás</Text>
            </Pressable>
          ) : null}

          <Pressable disabled={saving} onPress={handleCancel} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonLabel}>Cancelar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  progressCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: palette.line,
    gap: spacing.sm,
    ...shadows.card,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressStep: {
    fontSize: 13,
    fontWeight: '800',
    color: palette.primaryDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  progressCaption: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.slate,
  },
  progressTrack: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: palette.mist,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: palette.primary,
  },
  panel: {
    padding: spacing.md,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
    gap: spacing.md,
    ...shadows.card,
  },
  panelTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: palette.ink,
  },
  field: {
    gap: spacing.xs,
  },
  inlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.ink,
  },
  optionalTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: '#EDF3FF',
    fontSize: 12,
    fontWeight: '800',
    color: palette.primaryDeep,
  },
  requiredTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: '#FDECEC',
    fontSize: 12,
    fontWeight: '800',
    color: '#B42318',
  },
  helper: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.slate,
  },
  helperCentered: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.slate,
    textAlign: 'center',
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#FAFBFE',
    fontSize: 16,
  },
  compactInput: {
    paddingVertical: 10,
  },
  inputError: {
    borderColor: palette.danger,
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  selectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#F8FAFE',
  },
  selectorCardActive: {
    borderColor: palette.primary,
    backgroundColor: '#EEF5FF',
  },
  selectorCopy: {
    flex: 1,
    gap: 4,
  },
  selectorText: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.slate,
  },
  selectorTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: palette.ink,
  },
  selectorAction: {
    fontSize: 14,
    fontWeight: '800',
    color: palette.primaryDeep,
  },
  startDateNotice: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#FFF4E5',
    borderWidth: 1,
    borderColor: '#F3D2A2',
  },
  startDateNoticeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#8A5A10',
  },
  calendarSection: {
    padding: spacing.sm,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E8F5',
    gap: spacing.sm,
  },
  calendarCard: {
    padding: spacing.md,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#F9FBFF',
    gap: spacing.sm,
  },
  calendarHeader: {
    gap: spacing.sm,
  },
  monthSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: palette.slate,
  },
  statsCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.sm,
  },
  dayCell: {
    width: '14.2857%',
    alignItems: 'center',
  },
  dayBubble: {
    position: 'relative',
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayButtonDefault: {
    backgroundColor: palette.snow,
  },
  calendarDayButtonSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  dayOutsideMonth: {
    opacity: 0.45,
  },
  calendarDayButtonDisabled: {
    opacity: 0.35,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.ink,
  },
  calendarDayLabelSelected: {
    color: palette.snow,
  },
  dayLabelOutsideMonth: {
    color: palette.slate,
  },
  summaryCard: {
    padding: spacing.md,
    borderRadius: 22,
    backgroundColor: '#F3F7FD',
    borderWidth: 1,
    borderColor: '#D6E2F2',
    gap: 6,
  },
  summaryEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: palette.primaryDeep,
  },
  summaryTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: palette.ink,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.slate,
  },
  summaryDisclosure: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  availablePunishmentsCard: {
    padding: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DCE7F6',
    backgroundColor: '#F8FBFF',
    gap: spacing.xs,
  },
  availablePunishmentsScrollWrap: {
    maxHeight: 180,
  },
  availablePunishmentsScroll: {
    flexGrow: 0,
  },
  availablePunishmentsContent: {
    gap: spacing.xs,
  },
  availablePunishmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  availablePunishmentIconWrap: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availablePunishmentTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: palette.ink,
  },
  availablePunishmentEmpty: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.slate,
  },
  contextCard: {
    padding: spacing.md,
    borderRadius: 20,
    backgroundColor: '#F8FAFE',
    borderWidth: 1,
    borderColor: palette.line,
    gap: 6,
  },
  contextLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.slate,
  },
  contextValue: {
    fontSize: 26,
    fontWeight: '800',
    color: palette.ink,
  },
  stepperCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
    gap: spacing.sm,
  },
  stepperLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.ink,
  },
  stepperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  stepperMeta: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.primaryDeep,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  stepperButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF4FD',
    borderWidth: 1,
    borderColor: '#D6E2F2',
  },
  stepperButtonText: {
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '700',
    color: palette.primaryDeep,
  },
  stepperMainValueWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueInput: {
    minWidth: 72,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CFE0FF',
    backgroundColor: '#EEF4FF',
    fontSize: 30,
    fontWeight: '800',
    color: palette.ink,
    textAlign: 'center',
  },
  stepperUnit: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.slate,
    textAlign: 'center',
  },
  filterChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterChipOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#D6E1F1',
    backgroundColor: '#EEF4FF',
  },
  filterChipOptionActive: {
    backgroundColor: palette.primaryDeep,
    borderColor: palette.primaryDeep,
  },
  filterChipOptionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: palette.primaryDeep,
  },
  filterChipOptionLabelActive: {
    color: palette.snow,
  },
  categoryModeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  categoryChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 32,
  },
  categoryChipIconWrap: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: palette.danger,
    fontWeight: '700',
  },
  footerActionsStacked: {
    gap: 4,
  },
  submit: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: palette.primary,
    ...shadows.card,
  },
  submitDisabled: {
    opacity: 0.45,
  },
  submitLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.snow,
  },
  secondaryButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
  },
  secondaryButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.ink,
  },
  lockedState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  lockedTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.ink,
    textAlign: 'center',
  },
  lockedDescription: {
    maxWidth: 360,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: palette.slate,
  },
});
