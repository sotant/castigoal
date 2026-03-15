import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, radius, spacing } from '@/src/constants/theme';
import { appRoutes } from '@/src/navigation/app-routes';
import { Goal } from '@/src/models/types';
import {
  buildMonthCalendar,
  clamp,
  DurationMode,
  formatMonthLabel,
  getMonthAnchor,
  getRateForRequiredDays,
  getRequiredDays,
  getRuleSummary,
  minimumRatePresets,
  MinimumMode,
  parsePositiveNumber,
  sliderSteps,
  targetDayPresets,
  weekdayLabels,
} from '@/src/features/goals/goal-form';
import { useAppStore } from '@/src/store/app-store';
import { addDays, diffInDays, formatLongDate, startOfToday } from '@/src/utils/date';

type Props = {
  mode: 'create' | 'edit';
  goal?: Goal;
};

export function GoalFormScreen({ mode, goal }: Props) {
  const createGoal = useAppStore((state) => state.createGoal);
  const updateGoal = useAppStore((state) => state.updateGoal);
  const [title, setTitle] = useState(goal?.title ?? '');
  const [description, setDescription] = useState(goal?.description ?? '');
  const [startDate, setStartDate] = useState(goal?.startDate ?? startOfToday());
  const [targetDays, setTargetDays] = useState(String(goal?.targetDays ?? 5));
  const [durationMode, setDurationMode] = useState<DurationMode>('days');
  const [minimumMode, setMinimumMode] = useState<MinimumMode>('percentage');
  const [minimumSuccessRate, setMinimumSuccessRate] = useState(String(goal?.minimumSuccessRate ?? 80));
  const [requiredDaysInput, setRequiredDaysInput] = useState(String(goal ? getRequiredDays(goal.targetDays, goal.minimumSuccessRate) : 4));
  const [active, setActive] = useState(goal?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [showDateSelector, setShowDateSelector] = useState(false);
  const initialEndDate = goal ? addDays(goal.startDate, Math.max(goal.targetDays, 1) - 1) : addDays(startDate, 4);
  const [customEndDate, setCustomEndDate] = useState(initialEndDate);
  const [showCustomEndSelector, setShowCustomEndSelector] = useState(false);
  const [customEndMonth, setCustomEndMonth] = useState(() => getMonthAnchor(initialEndDate));
  const [sliderTrackWidth, setSliderTrackWidth] = useState(0);

  const targetDaysValue = parsePositiveNumber(targetDays);
  const minimumSuccessRateValue = parsePositiveNumber(minimumSuccessRate);
  const requiredDaysValue = parsePositiveNumber(requiredDaysInput);
  const today = startOfToday();
  const effectiveTargetDays =
    durationMode === 'custom' ? Math.max(diffInDays(startDate, customEndDate) + 1, 1) : targetDaysValue;
  const customCalendarDays = useMemo(() => buildMonthCalendar(customEndMonth), [customEndMonth]);
  const sliderPercentage = clamp(Math.round(minimumSuccessRateValue / 5) * 5, 0, 100);
  const effectiveRequiredDays = minimumMode === 'days' ? clamp(requiredDaysValue, 0, effectiveTargetDays) : getRequiredDays(effectiveTargetDays, sliderPercentage);
  const effectiveMinimumSuccessRate = minimumMode === 'days' ? getRateForRequiredDays(effectiveTargetDays, effectiveRequiredDays) : sliderPercentage;

  useEffect(() => {
    if (customEndDate < startDate) {
      setCustomEndDate(startDate);
      setCustomEndMonth(getMonthAnchor(startDate));
    }
  }, [customEndDate, startDate]);

  useEffect(() => {
    setRequiredDaysInput((current) => {
      const parsed = parsePositiveNumber(current);
      return String(clamp(parsed, 0, effectiveTargetDays));
    });
  }, [effectiveTargetDays]);

  useEffect(() => {
    setMinimumSuccessRate(String(sliderPercentage));
  }, [sliderPercentage]);

  const errors = useMemo(() => {
    return {
      title: title.trim().length >= 3 ? '' : 'Escribe un titulo de al menos 3 caracteres.',
      targetDays: effectiveTargetDays >= 1 ? '' : 'La ventana de seguimiento debe tener al menos 1 dia.',
      minimumSuccessRate:
        minimumMode === 'percentage'
          ? sliderPercentage >= 0 && sliderPercentage <= 100
            ? ''
            : 'El minimo para aprobar debe estar entre 0% y 100%.'
          : requiredDaysValue <= effectiveTargetDays
            ? ''
            : 'No puedes pedir mas dias de los que dura el reto.',
      customEndDate: durationMode === 'custom' && customEndDate < startDate ? 'La fecha fin no puede ser anterior al inicio.' : '',
    };
  }, [customEndDate, durationMode, effectiveTargetDays, minimumMode, requiredDaysValue, sliderPercentage, startDate, title]);

  const canSubmit = useMemo(() => {
    return !errors.title && !errors.targetDays && !errors.minimumSuccessRate && !errors.customEndDate;
  }, [errors]);

  const preview = useMemo(() => {
    const safeTargetDays = Math.max(effectiveTargetDays, 1);
    const requiredDays = effectiveRequiredDays;
    const rollingStart = addDays(today, -(safeTargetDays - 1));
    const windowStart = startDate > rollingStart ? startDate : rollingStart;
    const plannedDays = Math.max(diffInDays(windowStart, today) + 1, 1);

    return {
      requiredDays,
      plannedDays,
      summary: getRuleSummary(safeTargetDays, requiredDays),
      isTrimmed: plannedDays < safeTargetDays,
      windowStart,
    };
  }, [effectiveRequiredDays, effectiveTargetDays, startDate, today]);

  const changeStartDate = (amount: number) => {
    setStartDate((current) => addDays(current, amount));
  };

  const changeTargetDays = (amount: number) => {
    setTargetDays(String(Math.max(1, targetDaysValue + amount)));
  };

  const setSliderFromLocation = (locationX: number) => {
    if (sliderTrackWidth <= 0) {
      return;
    }

    const ratio = clamp(locationX / sliderTrackWidth, 0, 1);
    const steppedValue = Math.round((ratio * 100) / 5) * 5;
    setMinimumSuccessRate(String(clamp(steppedValue, 0, 100)));
  };

  return (
    <ScreenContainer
      title={mode === 'create' ? 'Crear objetivo' : 'Editar objetivo'}
      subtitle="Define cuando consideras que este objetivo va bien.">
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>Que quieres conseguir</Text>
          <Text style={styles.sectionTitle}>Define el objetivo con una frase clara.</Text>
        </View>

        <View style={styles.group}>
          <Text style={styles.label}>Titulo</Text>
          <Text style={styles.helper}>Usa una accion concreta. Ejemplo: Hacer ejercicio.</Text>
          <TextInput
            editable={!saving}
            value={title}
            onChangeText={setTitle}
            style={[styles.input, errors.title ? styles.inputError : null]}
            placeholder="Hacer ejercicio"
          />
          {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}
        </View>

        <View style={styles.group}>
          <Text style={styles.label}>Descripcion opcional</Text>
          <Text style={styles.helper}>Anade contexto si te ayuda, pero la regla principal va abajo.</Text>
          <TextInput
            editable={!saving}
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.multiline]}
            multiline
            placeholder="Ejemplo: 30 minutos de fuerza o cardio."
          />
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>Como se mide</Text>
          <Text style={styles.sectionTitle}>{preview.summary}</Text>
        </View>

        <View style={styles.group}>
          <Text style={styles.label}>Ventana de seguimiento</Text>
          <Text style={styles.helper}>Cuantos dias miramos para decidir si vas bien.</Text>

          <View style={styles.chips}>
            <Pressable
              disabled={saving}
              onPress={() => {
                setDurationMode('days');
                setShowCustomEndSelector(false);
              }}
              style={[styles.chip, durationMode === 'days' ? styles.chipActive : null, saving ? styles.disabled : null]}>
              <Text style={[styles.chipLabel, durationMode === 'days' ? styles.chipLabelActive : null]}>Dias</Text>
            </Pressable>
            <Pressable
              disabled={saving}
              onPress={() => {
                const nextEndDate = customEndDate < startDate ? startDate : customEndDate;
                setDurationMode('custom');
                setCustomEndDate(nextEndDate);
                setCustomEndMonth(getMonthAnchor(nextEndDate));
              }}
              style={[styles.chip, durationMode === 'custom' ? styles.chipActive : null, saving ? styles.disabled : null]}>
              <Text style={[styles.chipLabel, durationMode === 'custom' ? styles.chipLabelActive : null]}>Personalizado</Text>
            </Pressable>
          </View>

          {durationMode === 'days' ? (
            <>
              <View style={styles.controlRow}>
                <Pressable disabled={saving} onPress={() => changeTargetDays(-1)} style={styles.stepButton}>
                  <Text style={styles.stepButtonLabel}>-</Text>
                </Pressable>
                <View style={[styles.metricCard, errors.targetDays ? styles.metricCardError : null]}>
                  <Text style={styles.metricValue}>{targetDaysValue}</Text>
                  <Text style={styles.metricLabel}>{targetDaysValue === 1 ? 'dia' : 'dias'}</Text>
                </View>
                <Pressable disabled={saving} onPress={() => changeTargetDays(1)} style={styles.stepButton}>
                  <Text style={styles.stepButtonLabel}>+</Text>
                </Pressable>
              </View>
              <View style={styles.chips}>
                {targetDayPresets.map((value) => (
                  <Pressable
                    key={value}
                    disabled={saving}
                    onPress={() => setTargetDays(String(value))}
                    style={[styles.chip, targetDaysValue === value ? styles.chipActive : null, saving ? styles.disabled : null]}>
                    <Text style={[styles.chipLabel, targetDaysValue === value ? styles.chipLabelActive : null]}>{value} d</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.group}>
              <Pressable
                disabled={saving}
                onPress={() => setShowCustomEndSelector((current) => !current)}
                style={[styles.input, styles.dateButton, showCustomEndSelector ? styles.dateButtonActive : null]}>
                <View style={styles.customDateCopy}>
                  <Text style={styles.dateButtonText}>{formatLongDate(customEndDate)}</Text>
                  <Text style={styles.helper}>El objetivo terminara ese dia y la duracion se ajusta sola.</Text>
                </View>
                <Text style={styles.dateButtonHint}>{showCustomEndSelector ? 'Ocultar calendario' : 'Elegir fecha'}</Text>
              </Pressable>

              {showCustomEndSelector ? (
                <View style={styles.calendarCard}>
                  <View style={styles.calendarHeader}>
                    <Pressable
                      disabled={saving}
                      onPress={() => setCustomEndMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                      style={styles.calendarMonthButton}>
                      <Feather color={palette.primaryDeep} name="chevron-left" size={18} />
                    </Pressable>
                    <Text style={styles.calendarMonthLabel}>{formatMonthLabel(customEndMonth)}</Text>
                    <Pressable
                      disabled={saving}
                      onPress={() => setCustomEndMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
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
                    {customCalendarDays.map((day) => {
                      const disabledDay = day.date < startDate;
                      const selectedDay = day.date === customEndDate;

                      return (
                        <View key={day.date} style={styles.calendarDayCell}>
                          <Pressable
                            disabled={saving || disabledDay}
                            onPress={() => setCustomEndDate(day.date)}
                            style={[
                              styles.calendarDayButton,
                              selectedDay ? styles.calendarDayButtonSelected : null,
                              !day.inMonth ? styles.calendarDayButtonOutsideMonth : null,
                              disabledDay ? styles.calendarDayButtonDisabled : null,
                            ]}>
                            <Text
                              style={[
                                styles.calendarDayLabel,
                                selectedDay ? styles.calendarDayLabelSelected : null,
                                !day.inMonth || disabledDay ? styles.calendarDayLabelMuted : null,
                              ]}>
                              {day.dayNumber}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <View style={styles.previewInlineCard}>
                <Text style={styles.previewInlineLabel}>Duracion calculada</Text>
                <Text style={styles.previewInlineValue}>
                  {effectiveTargetDays} {effectiveTargetDays === 1 ? 'dia' : 'dias'}
                </Text>
              </View>
            </View>
          )}

          {errors.targetDays ? <Text style={styles.errorText}>{errors.targetDays}</Text> : null}
          {errors.customEndDate ? <Text style={styles.errorText}>{errors.customEndDate}</Text> : null}
        </View>

        <View style={styles.group}>
          <Text style={styles.label}>Minimo para aprobar</Text>
          <Text style={styles.helper}>Puedes elegir un porcentaje o fijar directamente cuantos dias debes cumplir.</Text>

          <View style={styles.chips}>
            <Pressable
              disabled={saving}
              onPress={() => setMinimumMode('percentage')}
              style={[styles.chip, minimumMode === 'percentage' ? styles.chipActive : null, saving ? styles.disabled : null]}>
              <Text style={[styles.chipLabel, minimumMode === 'percentage' ? styles.chipLabelActive : null]}>Porcentaje</Text>
            </Pressable>
            <Pressable
              disabled={saving}
              onPress={() => setMinimumMode('days')}
              style={[styles.chip, minimumMode === 'days' ? styles.chipActive : null, saving ? styles.disabled : null]}>
              <Text style={[styles.chipLabel, minimumMode === 'days' ? styles.chipLabelActive : null]}>Dias</Text>
            </Pressable>
          </View>

          {minimumMode === 'percentage' ? (
            <View style={styles.group}>
              <View style={styles.sliderValueCard}>
                <Text style={styles.previewInlineLabel}>Objetivo actual</Text>
                <Text style={styles.sliderValueText}>{sliderPercentage}%</Text>
              </View>
              <View
                style={styles.sliderTrack}
                onLayout={(event) => setSliderTrackWidth(event.nativeEvent.layout.width)}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={(event) => setSliderFromLocation(event.nativeEvent.locationX)}
                onResponderMove={(event) => setSliderFromLocation(event.nativeEvent.locationX)}>
                <View style={[styles.sliderFill, { width: `${sliderPercentage}%` }]} />
                <View style={[styles.sliderThumb, { left: `${sliderPercentage}%` }]} />
                <View style={styles.sliderStepsRow} pointerEvents="none">
                  {sliderSteps.map((step) => (
                    <View key={step} style={[styles.sliderStepDot, step <= sliderPercentage ? styles.sliderStepDotActive : null]} />
                  ))}
                </View>
              </View>
              <View style={styles.chips}>
                {minimumRatePresets.map((value) => (
                  <Pressable
                    key={value}
                    disabled={saving}
                    onPress={() => setMinimumSuccessRate(String(value))}
                    style={[styles.chip, sliderPercentage === value ? styles.chipActive : null, saving ? styles.disabled : null]}>
                    <Text style={[styles.chipLabel, sliderPercentage === value ? styles.chipLabelActive : null]}>{value}%</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.group}>
              <TextInput
                editable={!saving}
                keyboardType="number-pad"
                value={requiredDaysInput}
                onChangeText={(value) => setRequiredDaysInput(String(clamp(parsePositiveNumber(value), 0, effectiveTargetDays)))}
                style={[styles.input, errors.minimumSuccessRate ? styles.inputError : null]}
                placeholder="0"
              />
              <Text style={styles.helper}>
                Maximo: {effectiveTargetDays} {effectiveTargetDays === 1 ? 'dia' : 'dias'}.
              </Text>
            </View>
          )}

          {errors.minimumSuccessRate ? <Text style={styles.errorText}>{errors.minimumSuccessRate}</Text> : null}
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.previewEyebrow}>Vista previa</Text>
          <Text style={styles.previewTitle}>
            Si hoy termina la ventana, necesitas {preview.requiredDays} dias cumplidos de {preview.plannedDays}.
          </Text>
          <Text style={styles.previewText}>La evaluacion cuenta desde {formatLongDate(preview.windowStart)} hasta hoy.</Text>
          {preview.isTrimmed ? (
            <Text style={styles.previewHint}>
              Como el objetivo empieza el {formatLongDate(startDate)}, ahora la ventana real es mas corta que la configurada.
            </Text>
          ) : (
            <Text style={styles.previewHint}>Ahora mismo se aplica la ventana completa que has configurado.</Text>
          )}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>Estado y ajustes avanzados</Text>
          <Text style={styles.sectionTitle}>Ajustes secundarios que no cambian la regla principal.</Text>
        </View>

        <View style={styles.group}>
          <Text style={styles.label}>Fecha de inicio</Text>
          <Text style={styles.helper}>Se usa para decidir desde cuando empieza a contar la ventana.</Text>
          <Pressable
            disabled={saving}
            onPress={() => setShowDateSelector((current) => !current)}
            style={[styles.input, styles.dateButton, showDateSelector ? styles.dateButtonActive : null]}>
            <Text style={styles.dateButtonText}>{formatLongDate(startDate)}</Text>
            <Text style={styles.dateButtonHint}>{showDateSelector ? 'Ocultar selector' : 'Cambiar fecha'}</Text>
          </Pressable>

          {showDateSelector ? (
            <View style={styles.dateSelector}>
              <View style={styles.controlRow}>
                <Pressable disabled={saving} onPress={() => changeStartDate(-1)} style={styles.stepButton}>
                  <Text style={styles.stepButtonLabel}>-1 dia</Text>
                </Pressable>
                <Pressable disabled={saving} onPress={() => setStartDate(today)} style={styles.secondaryChip}>
                  <Text style={styles.secondaryChipLabel}>Hoy</Text>
                </Pressable>
                <Pressable disabled={saving} onPress={() => changeStartDate(1)} style={styles.stepButton}>
                  <Text style={styles.stepButtonLabel}>+1 dia</Text>
                </Pressable>
              </View>
              <View style={styles.chips}>
                <Pressable disabled={saving} onPress={() => setStartDate(addDays(today, -1))} style={styles.secondaryChip}>
                  <Text style={styles.secondaryChipLabel}>Ayer</Text>
                </Pressable>
                <Pressable disabled={saving} onPress={() => setStartDate(addDays(today, -7))} style={styles.secondaryChip}>
                  <Text style={styles.secondaryChipLabel}>Hace 7 dias</Text>
                </Pressable>
                <Pressable disabled={saving} onPress={() => setStartDate(addDays(today, -30))} style={styles.secondaryChip}>
                  <Text style={styles.secondaryChipLabel}>Hace 30 dias</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.infoCallout}>
          <Text style={styles.infoCalloutText}>
            La app evalua todos los objetivos con una cadencia diaria explicita para evitar un dato que hoy seria enganoso.
          </Text>
        </View>

        {mode === 'edit' ? (
          <View style={styles.toggleCard}>
            <View style={styles.toggleCopy}>
              <Text style={styles.label}>Objetivo activo</Text>
              <Text style={styles.helper}>Si lo finalizas, deja de admitir check-ins y pasa a considerarse cerrado hasta que lo reactives.</Text>
            </View>
            <Switch disabled={saving} value={active} onValueChange={setActive} />
          </View>
        ) : (
          <View style={styles.infoCallout}>
            <Text style={styles.infoCalloutText}>Los objetivos nuevos se crean activos por defecto para que puedas empezar al momento.</Text>
          </View>
        )}
      </View>

      <Pressable
        disabled={!canSubmit || saving}
        onPress={async () => {
          const payload = {
            title: title.trim(),
            description: description.trim(),
            startDate,
            targetDays: effectiveTargetDays,
            minimumSuccessRate: effectiveMinimumSuccessRate,
            active: mode === 'create' ? true : active,
          };

          setSaving(true);

          try {
            if (mode === 'create') {
              const createdId = await createGoal(payload);
              router.replace(appRoutes.goalDetail(createdId));
              return;
            }

            if (goal) {
              await updateGoal(goal.id, payload);
              router.replace(appRoutes.goalDetail(goal.id));
            }
          } finally {
            setSaving(false);
          }
        }}
        style={[styles.submit, !canSubmit || saving ? styles.submitDisabled : null]}>
        <Text style={styles.submitLabel}>
          {saving ? 'Guardando...' : mode === 'create' ? 'Guardar objetivo' : 'Guardar cambios'}
        </Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
    gap: spacing.md,
  },
  sectionHeader: {
    gap: spacing.xs,
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: palette.primaryDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '800',
    color: palette.ink,
  },
  group: {
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
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
    fontSize: 16,
  },
  inputError: {
    borderColor: palette.danger,
  },
  multiline: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  stepButton: {
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.cloud,
  },
  stepButtonLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.ink,
  },
  metricCard: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#F4F8FB',
    alignItems: 'center',
    gap: 2,
  },
  metricCardError: {
    borderWidth: 1,
    borderColor: palette.danger,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    color: palette.ink,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.slate,
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
    fontWeight: '600',
  },
  chipLabelActive: {
    color: palette.snow,
  },
  secondaryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: palette.cloud,
    borderWidth: 1,
    borderColor: palette.line,
  },
  secondaryChipLabel: {
    color: palette.ink,
    fontWeight: '700',
  },
  previewCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#EEF8F6',
    gap: spacing.xs,
  },
  previewEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: palette.primaryDeep,
    textTransform: 'uppercase',
  },
  previewTitle: {
    fontSize: 19,
    lineHeight: 27,
    fontWeight: '800',
    color: palette.ink,
  },
  previewText: {
    color: palette.slate,
    lineHeight: 21,
  },
  previewHint: {
    color: palette.primaryDeep,
    lineHeight: 21,
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  dateButtonActive: {
    borderColor: palette.primary,
    backgroundColor: '#F0FDFA',
  },
  customDateCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: palette.ink,
  },
  dateButtonHint: {
    color: palette.primaryDeep,
    fontWeight: '700',
  },
  dateSelector: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: palette.cloud,
    gap: spacing.sm,
  },
  calendarCard: {
    padding: spacing.md,
    borderRadius: radius.md,
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
    backgroundColor: palette.cloud,
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
  previewInlineCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#F4F8FB',
    gap: spacing.xs,
  },
  previewInlineLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: palette.primaryDeep,
    textTransform: 'uppercase',
  },
  previewInlineValue: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.ink,
  },
  sliderValueCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#F4F8FB',
    gap: spacing.xs,
    alignItems: 'center',
  },
  sliderValueText: {
    fontSize: 28,
    fontWeight: '800',
    color: palette.ink,
  },
  sliderTrack: {
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: '#DCE8E5',
    position: 'relative',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: palette.primary,
  },
  sliderThumb: {
    position: 'absolute',
    top: 4,
    marginLeft: -12,
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: palette.snow,
    borderWidth: 2,
    borderColor: palette.primaryDeep,
  },
  sliderStepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  sliderStepDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: '#98B3AD',
  },
  sliderStepDotActive: {
    backgroundColor: palette.snow,
  },
  infoCallout: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#FFF7ED',
  },
  infoCalloutText: {
    color: palette.warning,
    lineHeight: 21,
    fontWeight: '600',
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
  submit: {
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: palette.primaryDeep,
  },
  submitDisabled: {
    opacity: 0.45,
  },
  disabled: {
    opacity: 0.6,
  },
  submitLabel: {
    color: palette.snow,
    fontSize: 16,
    fontWeight: '800',
  },
});





