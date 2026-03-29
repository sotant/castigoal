import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { getErrorMessage } from '@/src/lib/app-error';
import { appRoutes } from '@/src/navigation/app-routes';
import { useAuth } from '@/src/hooks/use-auth';
import { authCopy } from '@/src/i18n/auth';
import { commonCopy } from '@/src/i18n/common';
import { signOutLocal, updatePassword } from '@/src/repositories/auth-repository';
import { palette, radius, shadows, spacing } from '@/src/constants/theme';

export function ResetPasswordScreen() {
  useTranslation();
  const { clearPasswordRecovery, passwordRecovery, session } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [focusedField, setFocusedField] = useState<'password' | 'confirmPassword' | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [redirectingToLogin, setRedirectingToLogin] = useState(false);
  const [hasCompletedRecovery, setHasCompletedRecovery] = useState(false);
  const [completedRecoveryEmail, setCompletedRecoveryEmail] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => password.trim().length >= 6 && confirmPassword.trim().length >= 6 && password === confirmPassword,
    [confirmPassword, password],
  );
  const validationMessage = useMemo(() => {
    if (!password && !confirmPassword) {
      return null;
    }

    if (password.trim().length > 0 && password.trim().length < 6) {
      return authCopy.resetPassword.validationPasswordTooShort;
    }

    if (confirmPassword.trim().length > 0 && confirmPassword.trim().length < 6) {
      return authCopy.resetPassword.validationConfirmTooShort;
    }

    if (confirmPassword.trim().length > 0 && password !== confirmPassword) {
      return authCopy.resetPassword.mismatch;
    }

    return null;
  }, [confirmPassword, password]);
  const screenState = useMemo<'loading' | 'ready' | 'error' | 'success'>(() => {
    if (hasCompletedRecovery) {
      return 'success';
    }

    if (!passwordRecovery.hasCheckedInitialUrl || passwordRecovery.status === 'checking') {
      return 'loading';
    }

    if (passwordRecovery.status === 'ready') {
      return 'ready';
    }

    return 'error';
  }, [hasCompletedRecovery, passwordRecovery.hasCheckedInitialUrl, passwordRecovery.status]);
  const recoveryEmail = completedRecoveryEmail ?? session?.user.email ?? null;
  const visibleFeedback =
    feedback ??
    (screenState === 'ready' && validationMessage
      ? {
          kind: 'error' as const,
          message: validationMessage,
        }
      : null);

  const handleSubmit = async () => {
    if (!canSubmit || saving) {
      return;
    }

    if (password !== confirmPassword) {
      setFeedback({
        kind: 'error',
        message: authCopy.resetPassword.mismatch,
      });
      return;
    }

    setSaving(true);
    setFeedback(null);
    Keyboard.dismiss();

    try {
      await updatePassword(password.trim());
      clearPasswordRecovery();
      setHasCompletedRecovery(true);
      setCompletedRecoveryEmail(session?.user.email ?? null);
      setFeedback({
        kind: 'success',
        message: authCopy.resetPassword.submitSuccess,
      });
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: getErrorMessage(error, authCopy.repository.passwordUpdateFailed),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReturnToLogin = async () => {
    if (redirectingToLogin) {
      return;
    }

    setRedirectingToLogin(true);

    try {
      await signOutLocal();
      router.replace({
        pathname: appRoutes.auth,
        params: recoveryEmail ? { email: recoveryEmail } : {},
      });
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: getErrorMessage(error, authCopy.resetPassword.updateFailedAndSignOutFailed),
      });
    } finally {
      setRedirectingToLogin(false);
    }
  };

  return (
    <ScreenContainer
      title={authCopy.resetPassword.screenTitle}
      subtitle={authCopy.resetPassword.screenSubtitle}
      scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        style={styles.keyboardArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable onPress={Keyboard.dismiss} style={styles.shell}>
            <View style={styles.backdrop} pointerEvents="none">
              <View style={styles.glowPrimary} />
              <View style={styles.glowSecondary} />
            </View>

            <View style={styles.formCard}>
              {screenState === 'loading' ? (
                <View style={styles.stateBlock}>
                  <Text style={styles.cardTitle}>{authCopy.resetPassword.loadingTitle}</Text>
                  <Text style={styles.cardSubtitle}>{authCopy.resetPassword.loadingDescription}</Text>
                </View>
              ) : null}

              {screenState === 'error' ? (
                <View style={styles.stateBlock}>
                  <Text style={styles.cardTitle}>{authCopy.resetPassword.invalidLinkTitle}</Text>
                  <Text style={styles.cardSubtitle}>
                    {passwordRecovery.error ?? authCopy.resetPassword.unknownRecoveryError}
                  </Text>
                  <Pressable
                    onPress={() =>
                      router.replace({
                        pathname: appRoutes.auth,
                        params: { mode: 'recovery' },
                      })
                    }
                    style={styles.submitPrimary}>
                    <Text style={styles.submitPrimaryLabel}>{authCopy.resetPassword.requestAnotherEmail}</Text>
                  </Pressable>
                </View>
              ) : null}

              {(screenState === 'ready' || screenState === 'success') ? (
                <>
                  <View style={styles.formHeader}>
                    <Text style={styles.eyebrow}>{authCopy.resetPassword.cardEyebrow}</Text>
                    <Text style={styles.cardTitle}>
                      {screenState === 'success' ? authCopy.resetPassword.successTitle : authCopy.resetPassword.readyTitle}
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      {screenState === 'success'
                        ? authCopy.resetPassword.successDescription
                        : authCopy.resetPassword.readyDescription}
                    </Text>
                  </View>

                  {screenState === 'ready' ? (
                    <>
                      <View style={styles.group}>
                        <Text style={styles.label}>{authCopy.resetPassword.newPasswordLabel}</Text>
                        <TextInput
                          autoCapitalize="none"
                          autoCorrect={false}
                          editable={!saving}
                          onBlur={() => setFocusedField((current) => (current === 'password' ? null : current))}
                          onChangeText={setPassword}
                          onFocus={() => setFocusedField('password')}
                          placeholder={authCopy.resetPassword.newPasswordPlaceholder}
                          placeholderTextColor="#8A94A6"
                          returnKeyType="next"
                          secureTextEntry
                          style={[styles.input, focusedField === 'password' && styles.inputFocused]}
                          value={password}
                        />
                      </View>

                      <View style={styles.group}>
                        <Text style={styles.label}>{authCopy.resetPassword.confirmPasswordLabel}</Text>
                        <TextInput
                          autoCapitalize="none"
                          autoCorrect={false}
                          editable={!saving}
                          onBlur={() => setFocusedField((current) => (current === 'confirmPassword' ? null : current))}
                          onChangeText={setConfirmPassword}
                          onFocus={() => setFocusedField('confirmPassword')}
                          onSubmitEditing={() => {
                            if (canSubmit) {
                              void handleSubmit();
                            }
                          }}
                          placeholder={authCopy.resetPassword.confirmPasswordPlaceholder}
                          placeholderTextColor="#8A94A6"
                          returnKeyType="go"
                          secureTextEntry
                          style={[styles.input, focusedField === 'confirmPassword' && styles.inputFocused]}
                          value={confirmPassword}
                        />
                      </View>
                    </>
                  ) : null}

                  {visibleFeedback ? (
                    <View
                      style={[
                        styles.feedback,
                        visibleFeedback.kind === 'success' ? styles.feedbackSuccess : styles.feedbackError,
                      ]}>
                      <Text style={visibleFeedback.kind === 'success' ? styles.feedbackSuccessText : styles.feedbackErrorText}>
                        {visibleFeedback.message}
                      </Text>
                    </View>
                  ) : null}

                  {screenState === 'success' ? (
                    <Pressable
                      disabled={redirectingToLogin}
                      onPress={() => void handleReturnToLogin()}
                      style={[styles.submitPrimary, redirectingToLogin && styles.buttonDisabled]}>
                      <Text style={styles.submitPrimaryLabel}>
                        {redirectingToLogin ? authCopy.resetPassword.returningToLogin : authCopy.resetPassword.returnToLogin}
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      disabled={!canSubmit || saving || screenState !== 'ready'}
                      onPress={() => void handleSubmit()}
                      style={[styles.submitPrimary, (!canSubmit || saving || screenState !== 'ready') && styles.buttonDisabled]}>
                      <Text style={styles.submitPrimaryLabel}>{saving ? commonCopy.actions.saving : authCopy.resetPassword.submit}</Text>
                    </Pressable>
                  )}
                </>
              ) : null}
            </View>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboardArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  shell: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 560,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glowPrimary: {
    position: 'absolute',
    top: 20,
    right: -20,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#D7FAF4',
    opacity: 0.9,
  },
  glowSecondary: {
    position: 'absolute',
    bottom: 40,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFE2CF',
    opacity: 0.75,
  },
  formCard: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E6ECF2',
    backgroundColor: 'rgba(255,255,255,0.96)',
    ...shadows.card,
  },
  formHeader: {
    gap: spacing.xs,
  },
  stateBlock: {
    gap: spacing.md,
  },
  eyebrow: {
    color: palette.primaryDeep,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: '#0F172A',
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '900',
  },
  cardSubtitle: {
    color: '#5B6577',
    fontSize: 15,
    lineHeight: 22,
  },
  group: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 0.2,
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#D5DEE8',
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    fontSize: 16,
    color: '#0F172A',
  },
  inputFocused: {
    borderColor: '#0F766E',
    backgroundColor: palette.snow,
    shadowColor: '#0F766E',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  feedback: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  feedbackError: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  feedbackSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  feedbackErrorText: {
    color: '#9F1239',
    lineHeight: 20,
  },
  feedbackSuccessText: {
    color: '#065F46',
    lineHeight: 20,
  },
  submitPrimary: {
    paddingVertical: 16,
    borderRadius: radius.pill,
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  submitPrimaryLabel: {
    color: palette.snow,
    fontSize: 16,
    fontWeight: '800',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
});
