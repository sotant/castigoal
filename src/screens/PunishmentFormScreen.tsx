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
      <View style={styles.heroCard}>
        <View style={styles.heroGlowPrimary} />
        <View style={styles.heroGlowSecondary} />

        <View style={styles.heroBadge}>
          <Ionicons color={palette.primaryDeep} name="sparkles-outline" size={16} />
          <Text style={styles.heroBadgeText}>Nuevo castigo personal</Text>
        </View>

        <Text style={styles.heroTitle}>Haz que el castigo se sienta intencional</Text>
        <Text style={styles.heroDescription}>
          Un buen castigo no solo penaliza: tambien refuerza el habito que quieres construir.
        </Text>

        <View style={styles.heroStats}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Dificultad</Text>
            <Text style={styles.heroStatValue}>{selectedDifficulty.label}</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Categoria</Text>
            <Text style={styles.heroStatValue}>{selectedCategory.label}</Text>
          </View>
        </View>
      </View>

      <View style={styles.formCard}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>Obligatorio</Text>
            <Text style={styles.sectionTitle}>Identidad del castigo</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Titulo del castigo</Text>
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

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>Obligatorio</Text>
            <Text style={styles.sectionTitle}>Selecciona la dificultad</Text>
          </View>

          <View style={styles.difficultyGrid}>
            {PUNISHMENT_DIFFICULTY_OPTIONS.map((option) => {
              const isSelected = option.value === difficulty;

              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  disabled={saving}
                  onPress={() => setDifficulty(option.value)}
                  style={[
                    styles.difficultyCard,
                    { backgroundColor: option.tint, borderColor: isSelected ? option.accent : 'transparent' },
                    isSelected && styles.selectedCard,
                  ]}>
                  <View style={[styles.difficultyBadge, { backgroundColor: option.accent }]}>
                    <Text style={styles.difficultyBadgeLabel}>{option.value}</Text>
                  </View>
                  <Text style={styles.optionTitle}>{option.label}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>Obligatorio</Text>
            <Text style={styles.sectionTitle}>Elige una categoria</Text>
          </View>

          <View style={styles.categoryList}>
            {PUNISHMENT_CATEGORY_OPTIONS.map((option) => {
              const isSelected = option.value === category;

              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  disabled={saving}
                  onPress={() => setCategory(option.value)}
                  style={[
                    styles.categoryCard,
                    { backgroundColor: option.tint, borderColor: isSelected ? option.accent : 'transparent' },
                    isSelected && styles.selectedCard,
                  ]}>
                  <View style={[styles.categoryIconWrap, { backgroundColor: option.accent }]}>
                    <Ionicons color={palette.snow} name={option.icon} size={18} />
                  </View>

                  <View style={styles.categoryCopy}>
                    <Text style={styles.optionTitle}>{option.label}</Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>

                  <View
                    style={[
                      styles.selectionDot,
                      isSelected && { backgroundColor: option.accent, borderColor: option.accent },
                    ]}>
                    {isSelected ? <Ionicons color={palette.snow} name="checkmark" size={14} /> : null}
                  </View>
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
          <View style={[styles.previewDifficultyChip, { backgroundColor: selectedDifficulty.accent }]}>
            <Text style={styles.previewDifficultyChipText}>Nivel {difficulty}</Text>
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
  heroCard: {
    overflow: 'hidden',
    padding: spacing.lg,
    borderRadius: 30,
    backgroundColor: '#132238',
    gap: spacing.md,
    ...shadows.card,
  },
  heroGlowPrimary: {
    position: 'absolute',
    top: -30,
    right: -10,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(74, 134, 247, 0.28)',
  },
  heroGlowSecondary: {
    position: 'absolute',
    bottom: -45,
    left: -20,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255, 159, 67, 0.20)',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: palette.primaryDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    color: palette.snow,
  },
  heroDescription: {
    maxWidth: '88%',
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.76)',
  },
  heroStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroStatCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 4,
  },
  heroStatLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.62)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  heroStatValue: {
    fontSize: 17,
    fontWeight: '800',
    color: palette.snow,
  },
  formCard: {
    padding: spacing.lg,
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
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: palette.primaryDeep,
    textTransform: 'uppercase',
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
  titleInput: {
    paddingHorizontal: spacing.md,
    paddingVertical: 15,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D9E2EE',
    backgroundColor: '#F8FAFD',
    fontSize: 16,
    color: palette.ink,
  },
  descriptionInput: {
    minHeight: 112,
  },
  difficultyGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  difficultyCard: {
    flex: 1,
    minHeight: 150,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    gap: spacing.sm,
  },
  difficultyBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  difficultyBadgeLabel: {
    color: palette.snow,
    fontSize: 16,
    fontWeight: '900',
  },
  categoryList: {
    gap: spacing.sm,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
  },
  categoryIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCopy: {
    flex: 1,
    gap: 3,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.ink,
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
  selectionDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#CAD5E3',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.snow,
  },
  previewCard: {
    padding: spacing.lg,
    borderRadius: 28,
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: '#F7D7A8',
    gap: spacing.md,
    ...shadows.card,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
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
  previewDifficultyChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  previewDifficultyChipText: {
    color: palette.snow,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
