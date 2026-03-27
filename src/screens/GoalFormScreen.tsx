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
import { addDays, diffInDays, formatLongDate, formatShortDate, startOfToday } from '@/src/utils/date';

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
  { label: 'Castigos estandar', value: 'base', description: 'Solo se podran asignar castigos base de la app.' },
  { label: 'Castigos personales', value: 'personal', description: 'Solo se podran asignar castigos creados por el usuario.' },
  { label: 'Ambos', value: 'both', description: 'Podran entrar castigos base y personales.' },
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
    <View style={styles.calendarCard}>
      <View style={styles.calendarHeader}>
        <Pressable
          disabled={disabled}
          onPress={() => onMonthChange((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
          style={styles.calendarMonthButton}>
          <Feather color={palette.primaryDeep} name="chevron-left" size={18} />
        </Pressable>
        <Text style={styles.calendarMonthLabel}>{formatMonthLabel(month)}</Text>
        <Pressable
          disabled={disabled}
          onPress={() => onMonthChange((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
          style={styles.calendarMonthButton}>
          <Feather color={palette.primaryDeep} name="chevron-right" size={18} />
        </Pressable>
      </View>

      <View style={styles.calendarWeekRow}>
        {weekdayLabels.map((label) => (
          <Text key={label} style={styles.calendarWeekday}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {calendarDays.map((day) => {
          const isDisabled = day.date < minDate;
          const isSelected = day.date === selectedDate;

          return (
            <View key={day.date} style={styles.calendarDayCell}>
              <Pressable
                disabled={disabled || isDisabled}
                onPress={() => onSelect(day.date)}
                style={[
                  styles.calendarDayButton,
                  isSelected ? styles.calendarDayButtonSelected : null,
                  !day.inMonth ? styles.calendarDayButtonOutsideMonth : null,
                  isDisabled ? styles.calendarDayButtonDisabled : null,
                ]}>
                <Text
                  style={[
                    styles.calendarDayLabel,
                    isSelected ? styles.calendarDayLabelSelected : null,
                    !day.inMonth || isDisabled ? styles.calendarDayLabelMuted : null,
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
  const scopeLabel = SCOPE_OPTIONS.find((option) => option.value === config.scope)?.label ?? 'Castigos estandar';

  if (config.categoryMode === 'all') {
    return `${scopeLabel} + todas las categorias`;
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
  const [showEndCalendar, setShowEndCalendar] = useState(true);
  const [hasTouchedTitle, setHasTouchedTitle] = useState(false);
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
  const durationError = draft.endDate < draft.startDate ? 'La fecha de finalizacion no puede ser anterior al inicio.' : '';
  const minimumError = requiredDays >= 1 && requiredDays <= durationDays ? '' : 'Debes elegir entre 1 y la duracion total.';
  const punishmentCategoryError =
    draft.punishmentCategoryMode === 'selected' && draft.selectedCategories.length === 0
      ? 'Selecciona al menos una categoria o usa todas.'
      : '';
  const punishmentPoolError =
    punishmentsLoaded && eligiblePunishments.length === 0
      ? 'No hay castigos elegibles con esta configuracion. Ajusta el origen o las categorias.'
      : '';

  const canContinueStep1 = !titleError;
  const canContinueStep2 = !startDateError && !durationError;
  const canContinueStep3 = !minimumError;
  const canSubmit = canContinueStep1 && canContinueStep2 && canContinueStep3 && !punishmentCategoryError && !punishmentPoolError;

  const progressWidth = `${(step / 4) * 100}%` as DimensionValue;
  const durationSummary = useMemo(() => `Del ${formatShortDate(draft.startDate)} al ${formatShortDate(draft.endDate)}`, [draft.endDate, draft.startDate]);
  const minimumSummary = useMemo(
    () => `Debes cumplir ${requiredDays} de ${durationDays} ${durationDays === 1 ? 'dia' : 'dias'}`,
    [durationDays, requiredDays],
  );
  const punishmentSummary = useMemo(() => getPunishmentSummary(punishmentConfig), [punishmentConfig]);

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
          <Text style={styles.lockedDescription}>Los objetivos cerrados ya no se pueden editar para mantener su resultado historico.</Text>
          <Pressable onPress={() => router.replace(appRoutes.goals)} style={styles.submit}>
            <Text style={styles.submitLabel}>Volver a objetivos</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer fixedHeader title={mode === 'create' ? 'Crear objetivo' : 'Editar objetivo'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressStep}>Paso {step} de 4</Text>
            <Text style={styles.progressCaption}>
              {step === 1 ? 'Objetivo' : step === 2 ? 'Duracion' : step === 3 ? 'Cumplimiento' : 'Castigos'}
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
                <Text style={styles.label}>Descripcion</Text>
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
            <Text style={styles.panelTitle}>Duracion</Text>

            <View style={styles.field}>
              <View style={styles.inlineHeader}>
                <Text style={styles.label}>Fecha de inicio</Text>
                <Text style={styles.requiredTag}>Obligatorio</Text>
              </View>
              <Pressable
                disabled={saving}
                onPress={() => setShowStartCalendar((current) => !current)}
                style={[styles.selectorCard, showStartCalendar ? styles.selectorCardActive : null]}>
                <View style={styles.selectorCopy}>
                  <Text style={styles.selectorText}>El objetivo empieza el</Text>
                  <Text style={styles.selectorTitle}>{formatLongDate(draft.startDate)}</Text>
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

            <View style={styles.field}>
              <View style={styles.inlineHeader}>
                <Text style={styles.label}>Fecha de finalizacion</Text>
                <Text style={styles.requiredTag}>Obligatorio</Text>
              </View>
              <Pressable
                disabled={saving}
                onPress={() => setShowEndCalendar((current) => !current)}
                style={[styles.selectorCard, showEndCalendar ? styles.selectorCardActive : null]}>
                <View style={styles.selectorCopy}>
                  <Text style={styles.selectorText}>El objetivo acaba el</Text>
                  <Text style={styles.selectorTitle}>{formatLongDate(draft.endDate)}</Text>
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
              <Text style={styles.summaryText}>{`Duracion total: ${durationDays} ${durationDays === 1 ? 'dia' : 'dias'}`}</Text>
            </View>
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Cuantos dias debes cumplir?</Text>

            <View style={styles.contextCard}>
              <Text style={styles.contextLabel}>Duracion del objetivo</Text>
              <Text style={styles.contextValue}>
                {durationDays} {durationDays === 1 ? 'dia' : 'dias'}
              </Text>
            </View>

            <View style={styles.optionsList}>
              {Array.from(new Set([Math.max(Math.round(durationDays * 0.25), 1), Math.max(Math.round(durationDays * 0.5), 1), Math.max(Math.round(durationDays * 0.75), 1), durationDays]))
                .filter((value) => value >= 1 && value <= durationDays)
                .sort((left, right) => left - right)
                .map((value) => {
                  const selected = value === requiredDays;

                  return (
                    <Pressable
                      key={value}
                      disabled={saving}
                      onPress={() => updateDraft({ minimumDays: value })}
                      style={[styles.optionCard, selected ? styles.optionCardSelected : null]}>
                      <Text style={[styles.optionTitle, selected ? styles.optionTitleSelected : null]}>
                        {value} {value === 1 ? 'dia' : 'dias'}
                      </Text>
                    </Pressable>
                  );
                })}
            </View>

            <View style={styles.stepperCard}>
              <Text style={styles.stepperLabel}>Personalizado</Text>
              <View style={styles.stepperControls}>
                <Pressable disabled={saving} onPress={() => updateDraft({ minimumDays: Math.max(requiredDays - 1, 1) })} style={styles.stepperButton}>
                  <Text style={styles.stepperButtonText}>-</Text>
                </Pressable>
                <View style={styles.stepperValueWrap}>
                  <Text style={styles.stepperValue}>{requiredDays}</Text>
                  <Text style={styles.stepperUnit}>
                    de {durationDays} {durationDays === 1 ? 'dia' : 'dias'}
                  </Text>
                </View>
                <Pressable disabled={saving} onPress={() => updateDraft({ minimumDays: Math.min(requiredDays + 1, durationDays) })} style={styles.stepperButton}>
                  <Text style={styles.stepperButtonText}>+</Text>
                </Pressable>
              </View>
              <Text style={styles.helperCentered}>Equivale al {minimumPercentage}%</Text>
            </View>

            {minimumError ? <Text style={styles.errorText}>{minimumError}</Text> : null}

            <View style={styles.summaryCard}>
              <Text style={styles.summaryEyebrow}>Resumen</Text>
              <Text style={styles.summaryTitle}>{minimumSummary}</Text>
              <Text style={styles.summaryText}>
                {durationDays - requiredDays <= 0
                  ? 'No podras fallar ningun dia.'
                  : durationDays - requiredDays === 1
                    ? 'Podras fallar 1 dia.'
                    : `Podras fallar hasta ${durationDays - requiredDays} dias.`}
              </Text>
            </View>
          </View>
        ) : null}

        {step === 4 ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Pool de castigos</Text>
            <Text style={styles.helper}>El castigo se elegira solo entre este origen y estas categorias si el objetivo falla.</Text>

            <View style={styles.scopeGrid}>
              {SCOPE_OPTIONS.map((option) => {
                const selected = option.value === draft.punishmentScope;

                return (
                  <Pressable
                    key={option.value}
                    disabled={saving}
                    onPress={() => updateDraft({ punishmentScope: option.value })}
                    style={[styles.scopeCard, selected ? styles.scopeCardSelected : null]}>
                    <Text style={[styles.scopeTitle, selected ? styles.scopeTitleSelected : null]}>{option.label}</Text>
                    <Text style={styles.scopeDescription}>{option.description}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.field}>
              <View style={styles.inlineHeader}>
                <Text style={styles.label}>Categorias</Text>
                <Text style={styles.requiredTag}>Obligatorio</Text>
              </View>
              <View style={styles.categoryModeRow}>
                <Pressable
                  disabled={saving}
                  onPress={() => updateDraft({ punishmentCategoryMode: 'all', selectedCategories: [] })}
                  style={[styles.categoryModeButton, draft.punishmentCategoryMode === 'all' ? styles.categoryModeButtonSelected : null]}>
                  <Text style={[styles.categoryModeText, draft.punishmentCategoryMode === 'all' ? styles.categoryModeTextSelected : null]}>
                    Todas
                  </Text>
                </Pressable>
                <Pressable
                  disabled={saving}
                  onPress={() => updateDraft({ punishmentCategoryMode: 'selected' })}
                  style={[styles.categoryModeButton, draft.punishmentCategoryMode === 'selected' ? styles.categoryModeButtonSelected : null]}>
                  <Text style={[styles.categoryModeText, draft.punishmentCategoryMode === 'selected' ? styles.categoryModeTextSelected : null]}>
                    Seleccion multiple
                  </Text>
                </Pressable>
              </View>
            </View>

            {draft.punishmentCategoryMode === 'selected' ? (
              <View style={styles.categoryGrid}>
                {PUNISHMENT_CATEGORY_OPTIONS.map((option) => {
                  const selected = draft.selectedCategories.includes(option.name);

                  return (
                    <Pressable
                      key={option.name}
                      disabled={saving}
                      onPress={() => toggleCategory(option.name)}
                      style={[styles.categoryCard, { backgroundColor: option.tint }, selected ? styles.categoryCardSelected : null]}>
                      <View style={[styles.categoryIconWrap, { backgroundColor: selected ? option.accent : palette.snow }]}>
                        <Ionicons color={selected ? palette.snow : option.accent} name={option.icon} size={18} />
                      </View>
                      <Text style={[styles.categoryTitle, selected ? { color: option.accent } : null]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {punishmentCategoryError ? <Text style={styles.errorText}>{punishmentCategoryError}</Text> : null}

            <View style={styles.summaryCard}>
              <Text style={styles.summaryEyebrow}>Seleccion actual</Text>
              <Text style={styles.summaryTitle}>{punishmentSummary}</Text>
              <Text style={styles.summaryText}>
                {punishmentsLoaded
                  ? `${eligiblePunishments.length} ${eligiblePunishments.length === 1 ? 'castigo elegible ahora mismo' : 'castigos elegibles ahora mismo'}`
                  : 'Cargando catalogo de castigos...'}
              </Text>
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
              <Text style={styles.secondaryButtonLabel}>Atras</Text>
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
  calendarCard: {
    padding: spacing.md,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#F9FBFF',
    gap: spacing.sm,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarMonthButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: palette.line,
  },
  calendarMonthLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: palette.ink,
  },
  calendarWeekRow: {
    flexDirection: 'row',
  },
  calendarWeekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: palette.slate,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.xs,
  },
  calendarDayCell: {
    width: '14.2857%',
    alignItems: 'center',
  },
  calendarDayButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  calendarDayButtonSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  calendarDayButtonOutsideMonth: {
    opacity: 0.45,
  },
  calendarDayButtonDisabled: {
    opacity: 0.35,
  },
  calendarDayLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.ink,
  },
  calendarDayLabelSelected: {
    color: palette.snow,
  },
  calendarDayLabelMuted: {
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
  optionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionCard: {
    minWidth: '47%',
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#FAFBFE',
    alignItems: 'center',
  },
  optionCardSelected: {
    borderColor: palette.primary,
    backgroundColor: '#EDF5FF',
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.ink,
  },
  optionTitleSelected: {
    color: palette.primaryDeep,
  },
  stepperCard: {
    padding: spacing.md,
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
    textAlign: 'center',
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
  stepperValueWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  stepperValue: {
    fontSize: 30,
    fontWeight: '800',
    color: palette.ink,
  },
  stepperUnit: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.slate,
  },
  scopeGrid: {
    gap: spacing.sm,
  },
  scopeCard: {
    padding: spacing.md,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#FAFBFE',
    gap: 6,
  },
  scopeCardSelected: {
    borderColor: palette.primary,
    backgroundColor: '#EEF5FF',
  },
  scopeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.ink,
  },
  scopeTitleSelected: {
    color: palette.primaryDeep,
  },
  scopeDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.slate,
  },
  categoryModeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  categoryModeButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#FAFBFE',
  },
  categoryModeButtonSelected: {
    borderColor: palette.primary,
    backgroundColor: '#EEF5FF',
  },
  categoryModeText: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.slate,
  },
  categoryModeTextSelected: {
    color: palette.primaryDeep,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryCard: {
    width: '47%',
    minHeight: 92,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: spacing.sm,
  },
  categoryCardSelected: {
    borderColor: palette.ink,
  },
  categoryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.ink,
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
    minHeight: 40,
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
    minHeight: 40,
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
