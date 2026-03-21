import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View, type DimensionValue } from 'react-native';

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import {
  buildMonthCalendar,
  clamp,
  formatMonthLabel,
  getMonthAnchor,
  getRateForRequiredDays,
  getRequiredDays,
  targetDayPresets,
  weekdayLabels,
} from '@/src/features/goals/goal-form';
import { Goal } from '@/src/models/types';
import { appRoutes } from '@/src/navigation/app-routes';
import { useAppStore } from '@/src/store/app-store';
import { addDays, diffInDays, formatLongDate, formatShortDate, startOfToday } from '@/src/utils/date';

type Props = {
  mode: 'create' | 'edit';
  goal?: Goal;
};

type WizardStep = 1 | 2 | 3;
type DurationMode = 'days' | 'endDate';

type GoalDraft = {
  title: string;
  description: string;
  startDate: string;
  durationMode: DurationMode;
  durationDays: number;
  endDate: string;
  minimumDays: number;
  active: boolean;
};

type CalendarSelectorProps = {
  disabled?: boolean;
  minDate: string;
  month: Date;
  selectedDate: string;
  onMonthChange: (updater: (current: Date) => Date) => void;
  onSelect: (date: string) => void;
};

function buildInitialDraft(goal?: Goal): GoalDraft {
  const startDate = goal?.startDate ?? startOfToday();
  const durationDays = Math.max(goal?.targetDays ?? 7, 1);
  const minimumDays = Math.max(getRequiredDays(durationDays, goal?.minimumSuccessRate ?? 80), 1);

  return {
    title: goal?.title ?? '',
    description: goal?.description ?? '',
    startDate,
    durationMode: 'endDate',
    durationDays,
    endDate: addDays(startDate, durationDays - 1),
    minimumDays,
    active: goal?.active ?? true,
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

export function GoalFormScreen({ mode, goal }: Props) {
  const createGoal = useAppStore((state) => state.createGoal);
  const updateGoal = useAppStore((state) => state.updateGoal);
  const today = startOfToday();

  const [step, setStep] = useState<WizardStep>(1);
  const [draft, setDraft] = useState<GoalDraft>(() => buildInitialDraft(goal));
  const [saving, setSaving] = useState(false);
  const [pendingExitHref, setPendingExitHref] = useState<string | null>(null);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(true);
  const [startMonth, setStartMonth] = useState(() => getMonthAnchor(goal?.startDate ?? today));
  const [endMonth, setEndMonth] = useState(() => getMonthAnchor(addDays(goal?.startDate ?? today, Math.max((goal?.targetDays ?? 7) - 1, 0))));
  const isSubmittingRef = useRef(false);

  const minimumStartDate = mode === 'create' ? today : draft.startDate < today ? draft.startDate : today;

  const durationDays = useMemo(() => {
    if (draft.durationMode === 'endDate') {
      return Math.max(diffInDays(draft.startDate, draft.endDate) + 1, 1);
    }

    return Math.max(draft.durationDays, 1);
  }, [draft.durationDays, draft.durationMode, draft.endDate, draft.startDate]);

  const requiredDays = useMemo(() => clamp(draft.minimumDays, 1, durationDays), [draft.minimumDays, durationDays]);
  const minimumPercentage = useMemo(() => clamp(getRateForRequiredDays(durationDays, requiredDays), 1, 100), [durationDays, requiredDays]);

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
    setDraft((current) => ({
      ...current,
      durationDays: clamp(current.durationDays, 1, 365),
      minimumDays: clamp(current.minimumDays, 1, durationDays),
    }));
  }, [durationDays]);

  useEffect(() => {
    if (!pendingExitHref) {
      return;
    }

    router.replace(pendingExitHref);
  }, [pendingExitHref]);

  const titleError = draft.title.trim().length >= 3 ? '' : 'Escribe un nombre de al menos 3 caracteres.';
  const startDateError = draft.startDate >= minimumStartDate ? '' : 'La fecha de inicio no puede estar en el pasado.';
  const durationError =
    draft.durationMode === 'endDate' && draft.endDate < draft.startDate
      ? 'La fecha de finalización no puede ser anterior al inicio.'
      : durationDays >= 1
        ? ''
        : 'El objetivo debe durar al menos 1 día.';
  const minimumError = requiredDays >= 1 && requiredDays <= durationDays ? '' : 'Debes elegir entre 1 y la duración total.';

  const canContinueStep1 = !titleError;
  const canContinueStep2 = !startDateError && !durationError;
  const canSubmit = canContinueStep1 && canContinueStep2 && !minimumError;

  const screenTitle = mode === 'create' ? 'Crear objetivo' : 'Editar objetivo';
  const progressWidth = `${(step / 3) * 100}%` as DimensionValue;

  const durationSummary = useMemo(() => {
    if (draft.durationMode === 'days') {
      const startLabel = draft.startDate === today ? 'Empieza hoy' : `Empieza el ${formatShortDate(draft.startDate)}`;
      return `${startLabel} y dura ${durationDays} ${durationDays === 1 ? 'día' : 'días'}`;
    }

    return `Del ${formatShortDate(draft.startDate)} al ${formatShortDate(draft.endDate)}`;
  }, [draft.durationMode, draft.endDate, draft.startDate, durationDays, today]);

  const minimumSummary = useMemo(
    () => `Debes cumplir ${requiredDays} de ${durationDays} ${durationDays === 1 ? 'día' : 'días'}`,
    [durationDays, requiredDays],
  );

  const missesAllowed = durationDays - requiredDays;
  const missesSummary =
    missesAllowed <= 0
      ? 'No podrás fallar ningún día.'
      : missesAllowed === 1
        ? 'Podrás fallar 1 día.'
        : `Podrás fallar hasta ${missesAllowed} días.`;

  const minimumDayOptions = useMemo(() => {
    const rawOptions = [
      Math.max(Math.round(durationDays * 0.25), 1),
      Math.max(Math.round(durationDays * 0.5), 1),
      Math.max(Math.round(durationDays * 0.75), 1),
      durationDays,
    ];

    return Array.from(new Set(rawOptions))
      .filter((value) => value >= 1 && value <= durationDays)
      .sort((left, right) => left - right);
  }, [durationDays]);

  const updateDraft = (partial: Partial<GoalDraft>) => {
    setDraft((current) => ({ ...current, ...partial }));
  };

  const handleNext = () => {
    if (step === 1 && canContinueStep1) {
      setStep(2);
      return;
    }

    if (step === 2 && canContinueStep2) {
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      startDate: draft.startDate,
      targetDays: durationDays,
      minimumSuccessRate: minimumPercentage,
      active: mode === 'create' ? true : draft.active,
    };

    isSubmittingRef.current = true;
    setSaving(true);

    try {
      if (mode === 'create') {
        await createGoal(payload);
        setPendingExitHref(appRoutes.goals);
        return;
      }

      if (goal) {
        await updateGoal(goal.id, payload);
        setPendingExitHref(appRoutes.goals);
        return;
      }
    } catch (error) {
      isSubmittingRef.current = false;
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer title={screenTitle}>
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressStep}>Paso {step} de 3</Text>
          <Text style={styles.progressCaption}>{step === 1 ? 'Objetivo' : step === 2 ? 'Duración' : 'Cumplimiento'}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </View>

      {step === 1 ? (
        <>
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Define tu objetivo</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Nombre del objetivo</Text>
              <TextInput
                editable={!saving}
                placeholder="Hacer ejercicio"
                value={draft.title}
                onChangeText={(value) => updateDraft({ title: value })}
                style={[styles.input, titleError ? styles.inputError : null]}
              />
              <Text style={styles.helper}>Ejemplo: Hacer ejercicio</Text>
              {titleError ? <Text style={styles.errorText}>{titleError}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Descripción (opcional)</Text>
              <TextInput
                editable={!saving}
                multiline
                placeholder="30 minutos de fuerza o cardio"
                value={draft.description}
                onChangeText={(value) => updateDraft({ description: value })}
                style={[styles.input, styles.multiline]}
              />
              <Text style={styles.helper}>Ejemplo: 30 minutos de fuerza o cardio</Text>
            </View>
          </View>

          <View style={styles.footerActionsSingle}>
            <Pressable
              disabled={!canContinueStep1 || saving}
              onPress={handleNext}
              style={[styles.submit, styles.submitFullWidth, !canContinueStep1 || saving ? styles.submitDisabled : null]}>
              <Text style={styles.submitLabel}>Continuar</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Duración</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Fecha de inicio</Text>
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
                    updateDraft({ startDate: date, endDate: nextEndDate });
                    setShowStartCalendar(false);
                    setEndMonth(getMonthAnchor(nextEndDate));
                  }}
                />
              ) : null}

              {startDateError ? <Text style={styles.errorText}>{startDateError}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Fecha de finalización</Text>

              <View style={styles.segment}>
                <Pressable
                  disabled={saving}
                  onPress={() => updateDraft({ durationMode: 'endDate' })}
                  style={[styles.segmentButton, draft.durationMode === 'endDate' ? styles.segmentButtonActive : null]}>
                  <Text style={[styles.segmentLabel, draft.durationMode === 'endDate' ? styles.segmentLabelActive : null]}>Fecha</Text>
                </Pressable>
                <Pressable
                  disabled={saving}
                  onPress={() => updateDraft({ durationMode: 'days' })}
                  style={[styles.segmentButton, draft.durationMode === 'days' ? styles.segmentButtonActive : null]}>
                  <Text style={[styles.segmentLabel, draft.durationMode === 'days' ? styles.segmentLabelActive : null]}>Días</Text>
                </Pressable>
              </View>

              {draft.durationMode === 'endDate' ? (
                <View style={styles.stack}>
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
                </View>
              ) : (
                <View style={styles.stack}>
                  <Text style={styles.helper}>Días de duración</Text>

                  <View style={styles.chips}>
                    {targetDayPresets.map((value) => (
                      <Pressable
                        key={value}
                        disabled={saving}
                        onPress={() => updateDraft({ durationDays: value })}
                        style={[styles.chip, durationDays === value ? styles.chipActive : null]}>
                        <Text style={[styles.chipLabel, durationDays === value ? styles.chipLabelActive : null]}>{value} días</Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={styles.stepperCard}>
                    <Text style={[styles.stepperLabel, styles.stepperLabelCentered]}>PERSONALIZADO</Text>
                    <View style={styles.stepperControls}>
                      <Pressable disabled={saving} onPress={() => updateDraft({ durationDays: Math.max(durationDays - 1, 1) })} style={styles.stepperButton}>
                        <Text style={styles.stepperButtonText}>-</Text>
                      </Pressable>
                      <View style={styles.stepperValueWrap}>
                        <Text style={styles.stepperValue}>{durationDays}</Text>
                        <Text style={styles.stepperUnit}>{durationDays === 1 ? 'día' : 'días'}</Text>
                      </View>
                      <Pressable disabled={saving} onPress={() => updateDraft({ durationDays: Math.min(durationDays + 1, 365) })} style={styles.stepperButton}>
                        <Text style={styles.stepperButtonText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}

              {durationError ? <Text style={styles.errorText}>{durationError}</Text> : null}
            </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryEyebrow}>Resumen</Text>
            <Text style={styles.summaryTitle}>{durationSummary}</Text>
            <Text style={styles.summaryText}>
              {draft.durationMode === 'days'
                ? `Fecha de finalización: ${formatShortDate(addDays(draft.startDate, durationDays - 1))}`
                : `Duración total: ${durationDays} ${durationDays === 1 ? 'día' : 'días'}`}
            </Text>
          </View>

          </View>

          <View style={styles.footerActionsStacked}>
            <Pressable
              disabled={!canContinueStep2 || saving}
              onPress={handleNext}
              style={[styles.submit, styles.submitFullWidth, !canContinueStep2 || saving ? styles.submitDisabled : null]}>
              <Text style={styles.submitLabel}>Continuar</Text>
            </Pressable>
            <Pressable
              disabled={saving}
              onPress={() => {
                if (isSubmittingRef.current) {
                  return;
                }

                setStep(1);
              }}
              style={[styles.secondaryButton, styles.secondaryButtonFullWidth]}>
              <Text style={styles.secondaryButtonLabel}>Atrás</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>¿Cuántos días debes cumplir?</Text>
            </View>

            <View style={styles.contextCard}>
              <Text style={styles.contextLabel}>Duración del objetivo</Text>
              <Text style={styles.contextValue}>
                {durationDays} {durationDays === 1 ? 'día' : 'días'}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Debes completar al menos</Text>
              <View style={styles.optionsList}>
                {minimumDayOptions.map((value) => {
                  const selected = value === requiredDays;

                  return (
                    <Pressable
                      key={value}
                      disabled={saving}
                      onPress={() => updateDraft({ minimumDays: value })}
                      style={[styles.optionCard, selected ? styles.optionCardSelected : null]}>
                      <Text style={[styles.optionTitle, selected ? styles.optionTitleSelected : null]}>
                        {value} {value === 1 ? 'día' : 'días'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.stepperCard}>
              <Text style={[styles.stepperLabel, styles.stepperLabelCentered]}>PERSONALIZADO</Text>
              <View style={styles.stepperControls}>
                <Pressable disabled={saving} onPress={() => updateDraft({ minimumDays: Math.max(requiredDays - 1, 1) })} style={styles.stepperButton}>
                  <Text style={styles.stepperButtonText}>-</Text>
                </Pressable>
                <View style={styles.stepperValueWrap}>
                  <Text style={styles.stepperValue}>{requiredDays}</Text>
                  <Text style={styles.stepperUnit}>
                    de {durationDays} {durationDays === 1 ? 'día' : 'días'}
                  </Text>
                </View>
                <Pressable disabled={saving} onPress={() => updateDraft({ minimumDays: Math.min(requiredDays + 1, durationDays) })} style={styles.stepperButton}>
                  <Text style={styles.stepperButtonText}>+</Text>
                </Pressable>
              </View>
              <Text style={[styles.helper, styles.centeredHelper]}>Equivale al {minimumPercentage}%</Text>
            </View>

            {minimumError ? <Text style={styles.errorText}>{minimumError}</Text> : null}

          <View style={styles.summaryCard}>
            <Text style={styles.summaryEyebrow}>Resumen</Text>
            <Text style={styles.summaryTitle}>{minimumSummary}</Text>
            <Text style={styles.summaryText}>{missesSummary}</Text>
            <Text style={styles.summaryHint}>({minimumPercentage}%)</Text>
          </View>

          </View>

          <View style={styles.footerActionsStacked}>
            <Pressable
              disabled={!canSubmit || saving}
              onPress={() => void handleSubmit()}
              style={[styles.submit, styles.submitFullWidth, !canSubmit || saving ? styles.submitDisabled : null]}>
              <Text style={styles.submitLabel}>{saving ? 'Guardando...' : mode === 'create' ? 'Crear objetivo' : 'Guardar cambios'}</Text>
            </Pressable>
            <Pressable
              disabled={saving}
              onPress={() => {
                if (isSubmittingRef.current) {
                  return;
                }

                setStep(2);
              }}
              style={[styles.secondaryButton, styles.secondaryButtonFullWidth]}>
              <Text style={styles.secondaryButtonLabel}>Atrás</Text>
            </Pressable>
          </View>

          {mode === 'edit' ? (
            <View style={styles.toggleCard}>
              <View style={styles.toggleCopy}>
                <Text style={styles.label}>Objetivo activo</Text>
                <Text style={styles.helper}>Si lo pausas, deja de admitir check-ins hasta que vuelvas a activarlo.</Text>
              </View>
              <Switch disabled={saving} value={draft.active} onValueChange={(value) => updateDraft({ active: value })} />
            </View>
          ) : null}
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  progressCard: {
    padding: spacing.md,
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
    gap: spacing.sm,
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
  panelHeader: {
    gap: spacing.xs,
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
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.ink,
  },
  helper: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.slate,
  },
  centeredHelper: {
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
  inputError: {
    borderColor: palette.danger,
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  stack: {
    gap: spacing.sm,
  },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 20,
    backgroundColor: palette.cloud,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
  },
  segmentButtonActive: {
    backgroundColor: palette.snow,
    ...shadows.card,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.slate,
  },
  segmentLabelActive: {
    color: palette.ink,
  },
  selectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#FAFBFE',
  },
  selectorCardActive: {
    borderColor: '#CFE0FF',
    backgroundColor: '#EEF4FF',
  },
  selectorCopy: {
    flex: 1,
    gap: 4,
  },
  selectorText: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.slate,
  },
  selectorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: palette.ink,
  },
  selectorAction: {
    fontSize: 14,
    fontWeight: '800',
    color: palette.primaryDeep,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
  },
  chipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  chipLabel: {
    color: palette.ink,
    fontWeight: '700',
  },
  chipLabelActive: {
    color: palette.snow,
  },
  summaryCard: {
    padding: spacing.md,
    borderRadius: 22,
    backgroundColor: '#EEF4FF',
    gap: spacing.xs,
  },
  summaryEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: palette.primaryDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  summaryTitle: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
    color: palette.ink,
  },
  summaryText: {
    color: palette.slate,
    lineHeight: 21,
  },
  summaryHint: {
    color: palette.primaryDeep,
    fontWeight: '700',
  },
  contextCard: {
    padding: spacing.md,
    borderRadius: 20,
    backgroundColor: '#F4F7FD',
    gap: 4,
  },
  contextLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: palette.primaryDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  contextValue: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.ink,
  },
  optionsList: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'nowrap',
  },
  optionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
  },
  optionCardSelected: {
    borderColor: palette.primary,
    backgroundColor: '#EEF4FF',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.ink,
    textAlign: 'center',
  },
  optionTitleSelected: {
    color: palette.primaryDeep,
  },
  calendarCard: {
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
    gap: spacing.sm,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  calendarMonthButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#F7F9FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: palette.ink,
    textTransform: 'capitalize',
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
    rowGap: spacing.sm,
  },
  calendarDayCell: {
    width: '14.2857%',
    alignItems: 'center',
  },
  calendarDayButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayButtonSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  calendarDayButtonOutsideMonth: {
    opacity: 0.45,
  },
  calendarDayButtonDisabled: {
    backgroundColor: palette.cloud,
    borderColor: palette.line,
    opacity: 0.45,
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
  stepperCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 24,
    backgroundColor: '#E9EEF8',
    gap: spacing.sm,
  },
  stepperLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: palette.primaryDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  stepperLabelCentered: {
    textAlign: 'center',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: palette.line,
  },
  stepperButtonText: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.ink,
  },
  stepperValueWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  stepperValue: {
    fontSize: 34,
    fontWeight: '800',
    color: palette.ink,
  },
  stepperUnit: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.slate,
    textAlign: 'center',
  },
  toggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  toggleCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  errorText: {
    color: palette.danger,
    fontWeight: '600',
    lineHeight: 20,
  },
  footerActionsSingle: {
    justifyContent: 'center',
  },
  footerActionsStacked: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: radius.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
  },
  secondaryButtonLabel: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButtonFullWidth: {
    width: '100%',
  },
  submit: {
    paddingVertical: 16,
    borderRadius: radius.pill,
    alignItems: 'center',
    backgroundColor: palette.primary,
  },
  submitFullWidth: {
    width: '100%',
  },
  submitDisabled: {
    opacity: 0.45,
  },
  submitLabel: {
    color: palette.snow,
    fontSize: 16,
    fontWeight: '800',
  },
});
