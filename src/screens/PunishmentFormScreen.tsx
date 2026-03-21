import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import {
  PUNISHMENT_CATEGORY_OPTIONS,
  PUNISHMENT_DIFFICULTY_OPTIONS,
} from '@/src/constants/punishments';
import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import { usePunishmentCatalog } from '@/src/features/punishments/selectors';
import { appRoutes } from '@/src/navigation/app-routes';
import { ScreenContainer } from '@/src/components/ScreenContainer';

const DEFAULT_CATEGORY = PUNISHMENT_CATEGORY_OPTIONS[0].value;
const DEFAULT_DIFFICULTY = PUNISHMENT_DIFFICULTY_OPTIONS[0].value;

export function PunishmentFormScreen() {
  const { addCustomPunishment } = usePunishmentCatalog();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(DEFAULT_DIFFICULTY);
  const [difficultyInfoValue, setDifficultyInfoValue] = useState<1 | 2 | 3 | null>(null);
  const [categoryInfoValue, setCategoryInfoValue] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedCategory = PUNISHMENT_CATEGORY_OPTIONS.find((option) => option.value === category) ?? PUNISHMENT_CATEGORY_OPTIONS[0];
  const selectedDifficulty =
    PUNISHMENT_DIFFICULTY_OPTIONS.find((option) => option.value === difficulty) ?? PUNISHMENT_DIFFICULTY_OPTIONS[0];

  useFocusEffect(
    useCallback(() => {
      return () => {
        Keyboard.dismiss();
      };
    }, []),
  );

  const handleSubmit = async () => {
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();

    if (!normalizedTitle || saving) {
      return;
    }

    setSaving(true);

    try {
      await addCustomPunishment({
        title: normalizedTitle,
        description: normalizedDescription,
        category,
        difficulty,
      });
      Keyboard.dismiss();
      router.replace({ pathname: appRoutes.punishments, params: { tab: 'library' } });
    } catch {
      return;
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    Keyboard.dismiss();
    router.back();
  };

  return (
    <ScreenContainer title="Crear castigo" scroll={false}>
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
                onChangeText={setTitle}
                onSubmitEditing={() => {
                  void handleSubmit();
                }}
                placeholder="Ejemplo: ordenar toda la habitacion"
                placeholderTextColor="#8EA0B7"
                returnKeyType="done"
                style={styles.titleInput}
                value={title}
              />
            </View>

            <View style={styles.field}>
              <View style={styles.inlineHeader}>
                <Text style={styles.label}>Descripcion</Text>
                <Text style={styles.optionalTag}>Opcional</Text>
              </View>
              <TextInput
                editable={!saving}
                multiline
                numberOfLines={4}
                onChangeText={setDescription}
                placeholder="Anade contexto, limites o una instruccion concreta para cumplirlo mejor."
                placeholderTextColor="#8EA0B7"
                style={[styles.titleInput, styles.descriptionInput]}
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
                  <Pressable
                    accessibilityRole="button"
                    disabled={saving}
                    key={option.value}
                    onPress={() => setDifficulty(option.value)}
                    style={[
                      styles.difficultyItem,
                      { backgroundColor: option.tint, borderColor: isSelected ? option.accent : 'transparent' },
                      isSelected && styles.selectedDifficultyCard,
                    ]}>
                    <View style={styles.difficultyCard}>
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
                      <Pressable
                        accessibilityLabel={`Ver informacion sobre dificultad ${option.label}`}
                        accessibilityRole="button"
                        disabled={saving}
                        hitSlop={8}
                        onPress={(event) => {
                          event.stopPropagation();
                          setDifficultyInfoValue((current) => (current === option.value ? null : option.value));
                        }}
                        style={[styles.difficultyInfoButton, { borderColor: option.accent }]}>
                        <Ionicons color={option.accent} name="information-circle-outline" size={18} />
                      </Pressable>
                    </View>
                    {difficultyInfoValue === option.value ? (
                      <Text style={styles.inlineDifficultyInfoText}>{option.description}</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.formSectionCard}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Elige una categoria</Text>
            </View>

            <View style={styles.categoryList}>
              {PUNISHMENT_CATEGORY_OPTIONS.map((option) => {
                const isSelected = option.value === category;

                return (
                  <Pressable
                    accessibilityRole="button"
                    disabled={saving}
                    key={option.value}
                    onPress={() => setCategory(option.value)}
                    style={[
                      styles.categoryItem,
                      { backgroundColor: option.tint, borderColor: isSelected ? option.accent : 'transparent' },
                      isSelected && styles.selectedDifficultyCard,
                    ]}>
                    <View style={styles.categoryCard}>
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
                      <Pressable
                        accessibilityLabel={`Ver informacion sobre categoria ${option.label}`}
                        accessibilityRole="button"
                        disabled={saving}
                        hitSlop={8}
                        onPress={(event) => {
                          event.stopPropagation();
                          setCategoryInfoValue((current) => (current === option.value ? null : option.value));
                        }}
                        style={[styles.categoryInfoButton, { borderColor: option.accent }]}>
                        <Ionicons color={option.accent} name="information-circle-outline" size={18} />
                      </Pressable>
                    </View>
                    {categoryInfoValue === option.value ? (
                      <Text style={styles.inlineCategoryInfoText}>{option.description}</Text>
                    ) : null}
                  </Pressable>
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
            {description.trim() || 'Sin descripcion. Puedes dejarlo asi o dar mas detalle para hacerlo mas claro al cumplirlo.'}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            disabled={saving}
            onPress={handleBack}
            style={[styles.secondaryButton, saving && styles.disabled]}>
            <Text style={styles.secondaryLabel}>Cancelar</Text>
          </Pressable>

          <Pressable
            disabled={saving || !title.trim()}
            onPress={() => {
              void handleSubmit();
            }}
            style={[styles.primaryButton, (saving || !title.trim()) && styles.disabled]}>
            <Ionicons color={palette.snow} name="add-circle-outline" size={18} />
            <Text style={styles.primaryLabel}>{saving ? 'Guardando...' : 'Crear castigo'}</Text>
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
  titleInput: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D9E2EE',
    backgroundColor: '#F8FAFD',
    fontSize: 16,
    color: palette.ink,
  },
  descriptionInput: {
    minHeight: 96,
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
  difficultyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  difficultyMainAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  difficultyBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  difficultyBadgeLabel: {
    fontSize: 16,
    fontWeight: '900',
  },
  difficultyInfoButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryMainAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  categoryCopy: {
    flex: 1,
    gap: 3,
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
  optionDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: palette.slate,
  },
  selectedCard: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  selectedDifficultyCard: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  categoryInfoButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    paddingVertical: 15,
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
    paddingVertical: 15,
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
