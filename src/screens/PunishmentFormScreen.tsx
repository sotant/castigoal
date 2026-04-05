import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import {
  DEFAULT_CATEGORY_ID,
  PUNISHMENT_CATEGORY_OPTIONS,
  PUNISHMENT_DIFFICULTY_OPTIONS,
  getPunishmentCategoryOption,
} from '@/src/constants/punishments';
import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import { usePunishmentCatalog } from '@/src/features/punishments/selectors';
import { getErrorMessage } from '@/src/lib/app-error';
import { appRoutes } from '@/src/navigation/app-routes';
import { ScreenContainer } from '@/src/components/ScreenContainer';

const DEFAULT_DIFFICULTY = PUNISHMENT_DIFFICULTY_OPTIONS[0].value;

export function PunishmentFormScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { addCustomPunishment, personalPunishments, punishmentsLoaded, refreshPunishmentCatalog, updateCustomPunishment } =
    usePunishmentCatalog();
  const punishmentId = typeof params.id === 'string' ? params.id : undefined;
  const isEditing = Boolean(punishmentId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryName, setCategoryName] = useState(DEFAULT_CATEGORY_ID);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(DEFAULT_DIFFICULTY);
  const [difficultyInfoValue, setDifficultyInfoValue] = useState<1 | 2 | 3 | null>(null);
  const [categoryInfoValue, setCategoryInfoValue] = useState<string | null>(null);
  const [hasTouchedTitle, setHasTouchedTitle] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  const editingPunishment = useMemo(
    () => (punishmentId ? personalPunishments.find((item) => item.id === punishmentId) ?? null : null),
    [personalPunishments, punishmentId],
  );
  const normalizedTitle = title.trim();
  const normalizedDescription = description.trim();
  const titleError = normalizedTitle.length >= 3 ? '' : 'Escribe un titulo de al menos 3 caracteres.';
  const showTitleError = hasTouchedTitle && Boolean(titleError);
  const isEditingLoading = isEditing && !punishmentsLoaded;
  const isDirty = useMemo(() => {
    if (!isEditing) {
      return Boolean(normalizedTitle || normalizedDescription || categoryName !== DEFAULT_CATEGORY_ID || difficulty !== DEFAULT_DIFFICULTY);
    }

    if (!editingPunishment) {
      return false;
    }

    return (
      normalizedTitle !== editingPunishment.title.trim() ||
      normalizedDescription !== editingPunishment.description.trim() ||
      categoryName !== editingPunishment.categoryName ||
      difficulty !== editingPunishment.difficulty
    );
  }, [categoryName, difficulty, editingPunishment, isEditing, normalizedDescription, normalizedTitle]);
  const selectedCategory = getPunishmentCategoryOption(undefined, categoryName);
  const selectedDifficulty =
    PUNISHMENT_DIFFICULTY_OPTIONS.find((option) => option.value === difficulty) ?? PUNISHMENT_DIFFICULTY_OPTIONS[0];

  useFocusEffect(
    useCallback(() => {
      return () => {
        Keyboard.dismiss();
      };
    }, []),
  );

  useEffect(() => {
    if (!punishmentsLoaded) {
      void refreshPunishmentCatalog().catch(() => {
        return;
      });
    }
  }, [punishmentsLoaded, refreshPunishmentCatalog]);

  useEffect(() => {
    if (!isEditing || !editingPunishment) {
      return;
    }

    setTitle(editingPunishment.title);
    setDescription(editingPunishment.description);
    setCategoryName(editingPunishment.categoryName);
    setDifficulty(editingPunishment.difficulty);
  }, [editingPunishment, isEditing]);

  useEffect(() => {
    if (!submitError) {
      return;
    }

    setSubmitError('');
  }, [categoryName, description, difficulty, submitError, title]);

  const handleSubmit = async () => {
    if (saving) {
      return;
    }

    if (!hasTouchedTitle) {
      setHasTouchedTitle(true);
    }

    if (titleError || (isEditing && !editingPunishment)) {
      return;
    }

    setSaving(true);
    setSubmitError('');

    try {
      if (isEditing && punishmentId) {
        await updateCustomPunishment(punishmentId, {
          title: normalizedTitle,
          description: normalizedDescription,
          categoryName,
          difficulty,
        });
      } else {
        await addCustomPunishment({
          title: normalizedTitle,
          description: normalizedDescription,
          categoryName,
          difficulty,
        });
      }
      Keyboard.dismiss();
      router.replace({ pathname: appRoutes.punishments, params: { tab: 'library' } });
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'No se pudo guardar el castigo.'));
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (saving) {
      return;
    }

    if (isDirty) {
      Alert.alert(
        isEditing ? 'Descartar cambios' : 'Descartar borrador',
        isEditing
          ? 'Se perderan los cambios que has hecho en este castigo.'
          : 'Se perdera la informacion que has escrito para este castigo.',
        [
          { text: 'Seguir editando', style: 'cancel' },
          {
            text: 'Descartar',
            style: 'destructive',
            onPress: () => {
              Keyboard.dismiss();
              router.back();
            },
          },
        ],
      );
      return;
    }

    Keyboard.dismiss();
    router.back();
  };

  const handleSelectDifficulty = (value: 1 | 2 | 3) => {
    setDifficulty(value);
    setDifficultyInfoValue(null);
  };

  const handleSelectCategory = (value: string) => {
    setCategoryName(value);
    setCategoryInfoValue(null);
  };

  if (isEditingLoading) {
    return (
      <ScreenContainer title="Editar castigo" scroll={false}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={palette.primaryDeep} size="large" />
          <Text style={styles.loadingTitle}>Preparando el formulario</Text>
          <Text style={styles.loadingDescription}>Estoy recuperando el castigo para que puedas editarlo sin sobrescribir datos.</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (isEditing && punishmentsLoaded && !editingPunishment) {
    return (
      <ScreenContainer title="Editar castigo" scroll={false}>
        <View style={styles.missingState}>
          <Text style={styles.missingTitle}>Castigo no disponible</Text>
          <Text style={styles.missingDescription}>No he encontrado ese castigo personalizado para editarlo.</Text>
          <Pressable onPress={handleBack} style={styles.secondaryButton}>
            <Text style={styles.secondaryLabel}>Volver</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title={isEditing ? 'Editar castigo' : 'Crear castigo'} scroll={false}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.formSectionCard}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Identidad del castigo</Text>
            </View>

            <View style={styles.field}>
              <View style={styles.inlineHeader}>
                <Text style={styles.label}>Titulo del castigo</Text>
                <Text style={styles.requiredTag}>Obligatorio</Text>
              </View>
              <TextInput
                editable={!saving}
                nativeID="punishment-title"
                onBlur={() => {
                  if (!hasTouchedTitle) {
                    setHasTouchedTitle(true);
                  }
                }}
                onChangeText={setTitle}
                onSubmitEditing={() => {
                  void handleSubmit();
                }}
                placeholder="Ordenar la habitación"
                returnKeyType="done"
                style={[styles.input, styles.compactInput, showTitleError ? styles.inputError : null]}
                value={title}
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
                nativeID="punishment-description"
                multiline
                numberOfLines={4}
                onChangeText={setDescription}
                placeholder="Recoger y ordenar toda la habitación"
                style={[styles.input, styles.multiline]}
                textAlignVertical="top"
                value={description}
              />
            </View>
          </View>
        </View>

        <View style={styles.formSectionCard}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Selecciona la dificultad</Text>
            </View>

            <View style={styles.difficultyGrid}>
              {PUNISHMENT_DIFFICULTY_OPTIONS.map((option) => {
                const isSelected = option.value === difficulty;

                return (
                  <View
                    key={option.value}
                    style={[
                      styles.difficultyItem,
                      { backgroundColor: option.tint, borderColor: isSelected ? option.accent : 'transparent' },
                      isSelected && styles.selectedDifficultyCard,
                    ]}>
                    <View style={styles.cardActionRow}>
                      <Pressable
                        accessibilityRole="button"
                        disabled={saving}
                        onPress={() => handleSelectDifficulty(option.value)}
                        style={styles.optionMainButton}>
                        <View style={styles.difficultyMainAction}>
                          <View
                            style={[
                              styles.difficultyBadge,
                              { backgroundColor: isSelected ? option.accent : palette.snow, borderColor: option.accent },
                            ]}>
                            <Text style={[styles.difficultyBadgeLabel, { color: isSelected ? palette.snow : option.accent }]}>
                              {option.value}
                            </Text>
                          </View>
                          <Text style={[styles.optionTitle, isSelected && { color: option.accent }]}>{option.label}</Text>
                        </View>
                      </Pressable>
                      <Pressable
                        accessibilityLabel={`Ver informacion sobre dificultad ${option.label}`}
                        accessibilityRole="button"
                        disabled={saving}
                        hitSlop={8}
                        onPress={() => {
                          setDifficultyInfoValue((current) => (current === option.value ? null : option.value));
                        }}
                        style={[styles.difficultyInfoButton, { borderColor: option.accent }]}>
                        <Ionicons color={option.accent} name="information-circle-outline" size={18} />
                      </Pressable>
                    </View>
                    {difficultyInfoValue === option.value ? (
                      <Text style={styles.inlineDifficultyInfoText}>{option.description}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.formSectionCard}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Elige una categoría</Text>
            </View>

            <View style={styles.categoryList}>
              {PUNISHMENT_CATEGORY_OPTIONS.map((option) => {
                const isSelected = option.name === categoryName;

                return (
                  <View
                    key={option.value}
                    style={[
                      styles.categoryItem,
                      { backgroundColor: option.tint, borderColor: isSelected ? option.accent : 'transparent' },
                      isSelected && styles.selectedDifficultyCard,
                    ]}>
                    <View style={styles.cardActionRow}>
                      <Pressable
                        accessibilityRole="button"
                        disabled={saving}
                        onPress={() => handleSelectCategory(option.name)}
                        style={styles.optionMainButton}>
                        <View style={styles.categoryMainAction}>
                          <View
                            style={[
                              styles.categoryIconWrap,
                              { backgroundColor: isSelected ? option.accent : palette.snow, borderColor: option.accent },
                            ]}>
                            <Ionicons color={isSelected ? palette.snow : option.accent} name={option.icon} size={18} />
                          </View>

                          <Text
                            style={[
                              styles.optionTitle,
                              styles.categoryTitle,
                              isSelected && { color: option.accent },
                            ]}>
                            {option.label}
                          </Text>
                        </View>
                      </Pressable>
                      <Pressable
                        accessibilityLabel={`Ver información sobre la categoría ${option.label}`}
                        accessibilityRole="button"
                        disabled={saving}
                        hitSlop={8}
                        onPress={() => {
                          setCategoryInfoValue((current) => (current === option.name ? null : option.name));
                        }}
                        style={[styles.categoryInfoButton, { borderColor: option.accent }]}>
                        <Ionicons color={option.accent} name="information-circle-outline" size={18} />
                      </Pressable>
                    </View>
                    {categoryInfoValue === option.name ? (
                      <Text style={styles.inlineCategoryInfoText}>{option.description}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View>
              <Text style={styles.previewEyebrow}>Vista previa</Text>
              <Text style={styles.previewTitle}>{title.trim() || 'Tu castigo aun no tiene titulo'}</Text>
            </View>
          </View>

          <View style={styles.previewTags}>
            <View style={[styles.previewTag, { backgroundColor: selectedCategory.tint }]}>
              <Text style={[styles.previewTagText, { color: selectedCategory.accent }]}>{selectedCategory.label}</Text>
            </View>
            <View style={[styles.previewTag, { backgroundColor: selectedDifficulty.tint }]}>
              <Text style={[styles.previewTagText, { color: selectedDifficulty.accent }]}>{selectedDifficulty.label}</Text>
            </View>
          </View>

          <Text style={styles.previewDescriptionText}>
            {description.trim() || 'Sin descripción. Puedes dejarlo así o dar más detalle para hacerlo más claro al cumplirlo.'}
          </Text>
        </View>

        {submitError ? (
          <View style={styles.submitErrorCard}>
            <Ionicons color={palette.danger} name="alert-circle-outline" size={18} />
            <Text style={styles.submitErrorText}>{submitError}</Text>
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          <Pressable
            disabled={saving}
            onPress={handleBack}
            style={[styles.secondaryButton, saving && styles.disabled]}>
            <Text style={styles.secondaryLabel}>Cancelar</Text>
          </Pressable>

          <Pressable
            disabled={saving || Boolean(titleError)}
            onPress={() => {
              void handleSubmit();
            }}
            style={[styles.primaryButton, (saving || Boolean(titleError)) && styles.disabled]}>
            <Text style={styles.primaryLabel}>
              {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear castigo'}
            </Text>
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
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: palette.ink,
    textAlign: 'center',
  },
  loadingDescription: {
    maxWidth: 360,
    fontSize: 15,
    lineHeight: 22,
    color: palette.slate,
    textAlign: 'center',
  },
  missingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  missingTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: palette.ink,
    textAlign: 'center',
  },
  missingDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.slate,
    textAlign: 'center',
  },
  formSectionCard: {
    padding: spacing.md,
    borderRadius: 30,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: '#E4EAF3',
    gap: spacing.lg,
    ...shadows.card,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '900',
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
    fontWeight: '800',
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
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#FAFBFE',
    fontSize: 16,
    color: palette.ink,
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
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: palette.danger,
    fontWeight: '700',
  },
  difficultyGrid: {
    gap: 4,
  },
  difficultyItem: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.lg,
    borderWidth: 2,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionMainButton: {
    flex: 1,
  },
  difficultyMainAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  difficultyBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  difficultyBadgeLabel: {
    fontSize: 13,
    fontWeight: '900',
  },
  difficultyInfoButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.snow,
  },
  inlineDifficultyInfoText: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.slate,
  },
  categoryList: {
    gap: 4,
  },
  categoryItem: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.lg,
    borderWidth: 2,
  },
  categoryMainAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#475467',
  },
  categoryTitle: {
    flex: 1,
  },
  inlineCategoryInfoText: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.slate,
  },
  selectedDifficultyCard: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  categoryInfoButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.snow,
  },
  previewCard: {
    padding: spacing.md,
    borderRadius: 28,
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: '#F7D7A8',
    gap: spacing.md,
    ...shadows.card,
  },
  previewHeader: {
    gap: spacing.xs,
  },
  previewEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#B45309',
  },
  previewTitle: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '900',
    color: palette.ink,
  },
  previewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  previewTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  previewTagText: {
    fontSize: 12,
    fontWeight: '800',
  },
  previewDescriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#7C5B2F',
  },
  submitErrorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F5C2C7',
    backgroundColor: '#FDECEC',
  },
  submitErrorText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#B42318',
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: palette.primaryDeep,
    ...shadows.card,
  },
  primaryLabel: {
    color: palette.snow,
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D7E0EB',
    backgroundColor: palette.snow,
  },
  secondaryLabel: {
    color: palette.ink,
    fontWeight: '800',
    fontSize: 15,
  },
  disabled: {
    opacity: 0.55,
  },
});
