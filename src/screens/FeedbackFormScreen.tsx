import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import {
  canSubmitFeedback,
  createInitialFeedbackValues,
  feedbackCategories,
  feedbackCopy,
  FeedbackFormValues,
  FeedbackType,
  getFeedbackMetadata,
  validateFeedbackForm,
} from '@/src/features/feedback/form';
import { getErrorMessage } from '@/src/lib/app-error';
import { appRoutes } from '@/src/navigation/app-routes';
import { submitUserFeedback } from '@/src/repositories/feedback-repository';

type Props = {
  type: FeedbackType;
};

type TouchedState = Partial<Record<keyof FeedbackFormValues, boolean>>;

function FieldLabel({
  label,
  tone,
}: {
  label: string;
  tone: 'optional' | 'required';
}) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.labelBadge, tone === 'required' ? styles.requiredBadge : styles.optionalBadge]}>
        <Text style={[styles.labelBadgeText, tone === 'required' ? styles.requiredBadgeText : styles.optionalBadgeText]}>
          {tone === 'required' ? 'Obligatorio' : 'Opcional'}
        </Text>
      </View>
    </View>
  );
}

export function FeedbackFormScreen({ type }: Props) {
  const copy = feedbackCopy[type];
  const [values, setValues] = useState<FeedbackFormValues>(() => createInitialFeedbackValues());
  const [touched, setTouched] = useState<TouchedState>({});
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const errors = useMemo(() => validateFeedbackForm(type, values), [type, values]);
  const isFormReady = canSubmitFeedback(type, values);

  const visibleErrors = {
    contactEmail: (hasTriedSubmit || touched.contactEmail) && errors.contactEmail ? errors.contactEmail : undefined,
    message: (hasTriedSubmit || touched.message) && errors.message ? errors.message : undefined,
    subject: (hasTriedSubmit || touched.subject) && errors.subject ? errors.subject : undefined,
  };

  const resetForm = useCallback(() => {
    setValues(createInitialFeedbackValues());
    setTouched({});
    setHasTriedSubmit(false);
    setIsSubmitting(false);
    setSubmitError(null);
    setIsSuccess(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      Keyboard.dismiss();
      resetForm();

      return () => {
        Keyboard.dismiss();
        resetForm();
      };
    }, [resetForm]),
  );

  const updateField = <Key extends keyof FeedbackFormValues>(field: Key, value: FeedbackFormValues[Key]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setSubmitError(null);
  };

  const markTouched = (field: keyof FeedbackFormValues) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    setHasTriedSubmit(true);
    setTouched({
      affectedSection: true,
      category: true,
      contactEmail: true,
      message: true,
      reproductionSteps: true,
      subject: true,
    });

    if (!isFormReady) {
      return;
    }

    Keyboard.dismiss();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const metadata = getFeedbackMetadata();

      await submitUserFeedback({
        affectedSection: type === 'bug_report' ? values.affectedSection : null,
        appVersion: metadata.appVersion,
        category: type === 'suggestion' ? values.category : null,
        deviceModel: metadata.deviceModel,
        locale: metadata.locale,
        message: values.message,
        platform: metadata.platform,
        reproductionSteps: type === 'bug_report' ? values.reproductionSteps : null,
        sourceScreen: metadata.sourceScreen,
        subject: values.subject,
        type,
        userEmail: values.contactEmail,
      });

      setValues(createInitialFeedbackValues());
      setTouched({});
      setHasTriedSubmit(false);
      setIsSuccess(true);
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'No hemos podido enviar tu mensaje. Intentalo de nuevo.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <ScreenContainer fixedHeader resetScrollOnFocus subtitle={copy.screenDescription} title={copy.screenTitle}>
        <View style={styles.successCard}>
          <View style={styles.successIconWrap}>
            <MaterialCommunityIcons
              color={palette.primaryDeep}
              name={type === 'suggestion' ? 'lightbulb-on-outline' : 'check-decagram-outline'}
              size={34}
            />
          </View>
          <Text style={styles.successTitle}>{copy.successTitle}</Text>
          <Text style={styles.successText}>{copy.successMessage}</Text>
          <Pressable onPress={() => router.replace(appRoutes.settings)} style={styles.submitButton}>
            <Text style={styles.submitButtonLabel}>Volver a ajustes</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer fixedHeader resetScrollOnFocus subtitle={copy.screenDescription} title={copy.screenTitle}>
      <View style={styles.panel}>
        <View style={styles.field}>
          <FieldLabel label={copy.subjectLabel} tone="required" />
          <TextInput
            accessibilityLabel={copy.subjectLabel}
            autoCapitalize="sentences"
            editable={!isSubmitting}
            onBlur={() => markTouched('subject')}
            onChangeText={(value) => updateField('subject', value)}
            placeholder={copy.subjectPlaceholder}
            placeholderTextColor="#93A1B5"
            style={[styles.input, visibleErrors.subject ? styles.inputError : null]}
            value={values.subject}
          />
          {visibleErrors.subject ? <Text style={styles.errorText}>{visibleErrors.subject}</Text> : null}
        </View>

        <View style={styles.field}>
          <FieldLabel label={copy.messageLabel} tone="required" />
          <TextInput
            accessibilityLabel={copy.messageLabel}
            autoCapitalize="sentences"
            editable={!isSubmitting}
            multiline
            onBlur={() => markTouched('message')}
            onChangeText={(value) => updateField('message', value)}
            placeholder={copy.messagePlaceholder}
            placeholderTextColor="#93A1B5"
            style={[styles.input, styles.textarea, visibleErrors.message ? styles.inputError : null]}
            textAlignVertical="top"
            value={values.message}
          />
          {visibleErrors.message ? <Text style={styles.errorText}>{visibleErrors.message}</Text> : null}
        </View>

        {type === 'suggestion' ? (
          <View style={styles.field}>
            <FieldLabel label="Categoria" tone="optional" />
            <View style={styles.chips}>
              {feedbackCategories.map((category) => {
                const isSelected = values.category === category;

                return (
                  <Pressable
                    key={category}
                    disabled={isSubmitting}
                    onPress={() => updateField('category', isSelected ? '' : category)}
                    style={[styles.chip, isSelected ? styles.chipSelected : null]}>
                    <Text style={[styles.chipLabel, isSelected ? styles.chipLabelSelected : null]}>{category}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {type === 'bug_report' ? (
          <>
            <View style={styles.field}>
              <FieldLabel label="Pantalla o seccion afectada" tone="optional" />
              <TextInput
                accessibilityLabel={copy.affectedSectionLabel}
                autoCapitalize="sentences"
                editable={!isSubmitting}
                onBlur={() => markTouched('affectedSection')}
                onChangeText={(value) => updateField('affectedSection', value)}
                placeholder={copy.affectedSectionPlaceholder}
                placeholderTextColor="#93A1B5"
                style={styles.input}
                value={values.affectedSection}
              />
            </View>

            <View style={styles.field}>
              <FieldLabel label="Pasos para reproducirlo" tone="optional" />
              <TextInput
                accessibilityLabel="Pasos para reproducirlo"
                autoCapitalize="sentences"
                editable={!isSubmitting}
                multiline
                onBlur={() => markTouched('reproductionSteps')}
                onChangeText={(value) => updateField('reproductionSteps', value)}
                placeholder={'1. Entro en...\n2. Pulso en...\n3. Ocurre...'}
                placeholderTextColor="#93A1B5"
                style={[styles.input, styles.textarea, styles.reproductionTextarea]}
                textAlignVertical="top"
                value={values.reproductionSteps}
              />
            </View>
          </>
        ) : null}

        <View style={styles.field}>
          <FieldLabel label={copy.contactEmailLabel} tone="optional" />
          <TextInput
            accessibilityLabel={copy.contactEmailLabel}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting}
            keyboardType="email-address"
            onBlur={() => markTouched('contactEmail')}
            onChangeText={(value) => updateField('contactEmail', value)}
            placeholder={copy.contactEmailPlaceholder}
            placeholderTextColor="#93A1B5"
            style={[styles.input, visibleErrors.contactEmail ? styles.inputError : null]}
            value={values.contactEmail}
          />
          <Text style={styles.helperText}>{copy.contactEmailHelper}</Text>
          {visibleErrors.contactEmail ? <Text style={styles.errorText}>{visibleErrors.contactEmail}</Text> : null}
        </View>

        {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={!isFormReady || isSubmitting}
          onPress={() => {
            void handleSubmit();
          }}
          style={[styles.submitButton, !isFormReady || isSubmitting ? styles.submitButtonDisabled : null]}>
          <Text style={styles.submitButtonLabel}>{isSubmitting ? 'Enviando...' : copy.submitLabel}</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
  },
  chipLabel: {
    color: palette.ink,
    fontWeight: '700',
  },
  chipLabelSelected: {
    color: palette.primaryDeep,
  },
  chipSelected: {
    borderColor: '#C9D9F8',
    backgroundColor: '#EAF1FF',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  errorText: {
    color: palette.danger,
    fontWeight: '600',
    lineHeight: 20,
  },
  field: {
    gap: spacing.xs,
  },
  helperText: {
    color: palette.slate,
    lineHeight: 21,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#FAFBFE',
    color: palette.ink,
    fontSize: 16,
  },
  inputError: {
    borderColor: palette.danger,
  },
  label: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  labelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  labelBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
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
  optionalBadge: {
    backgroundColor: '#E8F0FF',
  },
  optionalBadgeText: {
    color: palette.primaryDeep,
  },
  reproductionTextarea: {
    minHeight: 132,
  },
  requiredBadge: {
    backgroundColor: '#FCE7E3',
  },
  requiredBadgeText: {
    color: '#C2410C',
  },
  submitButton: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitButtonLabel: {
    color: palette.snow,
    fontSize: 16,
    fontWeight: '800',
  },
  submitError: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    fontWeight: '700',
    lineHeight: 20,
  },
  successCard: {
    padding: spacing.lg,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.card,
  },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF4FF',
  },
  successText: {
    color: palette.slate,
    lineHeight: 22,
    textAlign: 'center',
  },
  successTitle: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  textarea: {
    minHeight: 150,
  },
});
