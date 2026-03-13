import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { setRecoverySession, updatePassword } from '@/src/repositories/auth-repository';
import { palette, radius, shadows, spacing } from '@/src/constants/theme';

function parseRecoveryTokens(url: string | null) {
  if (!url) {
    return null;
  }

  const fragment = url.split('#')[1];
  const query = url.includes('?') ? url.split('?')[1]?.split('#')[0] : null;
  const params = new URLSearchParams(fragment || query || '');
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const type = params.get('type');

  if (!accessToken || !refreshToken || type !== 'recovery') {
    return null;
  }

  return { accessToken, refreshToken };
}

export function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [focusedField, setFocusedField] = useState<'password' | 'confirmPassword' | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'success'>('loading');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const processedUrlRef = useRef<string | null>(null);

  const canSubmit = useMemo(
    () => password.trim().length >= 6 && confirmPassword.trim().length >= 6 && password === confirmPassword,
    [confirmPassword, password],
  );

  useEffect(() => {
    let isMounted = true;

    const handleUrl = async (url: string | null) => {
      if (!url || processedUrlRef.current === url) {
        return;
      }

      processedUrlRef.current = url;
      const tokens = parseRecoveryTokens(url);

      if (!tokens) {
        if (isMounted) {
          setStatus('error');
          setFeedback('El enlace de recuperacion no es valido o ha caducado. Solicita uno nuevo.');
        }
        return;
      }

      try {
        await setRecoverySession(tokens.accessToken, tokens.refreshToken);

        if (isMounted) {
          setStatus('ready');
          setFeedback(null);
        }
      } catch (error) {
        if (isMounted) {
          setStatus('error');
          setFeedback(getErrorMessage(error, 'No se pudo validar el enlace de recuperacion.'));
        }
      }
    };

    void Linking.getInitialURL().then(handleUrl);

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const handleSubmit = async () => {
    if (!canSubmit || saving) {
      return;
    }

    if (password !== confirmPassword) {
      setFeedback('Las contrasenas no coinciden.');
      return;
    }

    setSaving(true);
    setFeedback(null);
    Keyboard.dismiss();

    try {
      await updatePassword(password.trim());
      setStatus('success');
      setFeedback('Tu contrasena se ha actualizado. Ya puedes continuar con tu cuenta.');
    } catch (error) {
      setStatus('ready');
      setFeedback(getErrorMessage(error, 'No se pudo actualizar la contrasena.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer
      title="Nueva contrasena"
      subtitle="Define una nueva contrasena para volver a entrar en tu cuenta."
      scroll={false}
      showBackButton
      backFallbackHref={appRoutes.auth}>
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
              {status === 'loading' ? (
                <View style={styles.stateBlock}>
                  <Text style={styles.cardTitle}>Validando enlace...</Text>
                  <Text style={styles.cardSubtitle}>Estamos preparando un acceso seguro para que puedas cambiar tu contrasena.</Text>
                </View>
              ) : null}

              {status === 'error' ? (
                <View style={styles.stateBlock}>
                  <Text style={styles.cardTitle}>No se pudo abrir el enlace</Text>
                  <Text style={styles.cardSubtitle}>{feedback ?? 'Solicita un nuevo email de recuperacion desde la pantalla de acceso.'}</Text>
                  <Pressable onPress={() => router.replace(appRoutes.auth)} style={styles.submitPrimary}>
                    <Text style={styles.submitPrimaryLabel}>Volver a acceso</Text>
                  </Pressable>
                </View>
              ) : null}

              {(status === 'ready' || status === 'success') ? (
                <>
                  <View style={styles.formHeader}>
                    <Text style={styles.eyebrow}>Recuperacion</Text>
                    <Text style={styles.cardTitle}>Crea una contrasena nueva.</Text>
                    <Text style={styles.cardSubtitle}>Usa al menos 6 caracteres y guarda un cambio que recuerdes facilmente.</Text>
                  </View>

                  <View style={styles.group}>
                    <Text style={styles.label}>Nueva contrasena</Text>
                    <TextInput
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!saving && status !== 'success'}
                      onBlur={() => setFocusedField((current) => (current === 'password' ? null : current))}
                      onChangeText={setPassword}
                      onFocus={() => setFocusedField('password')}
                      placeholder="Minimo 6 caracteres"
                      placeholderTextColor="#8A94A6"
                      returnKeyType="next"
                      secureTextEntry
                      style={[styles.input, focusedField === 'password' && styles.inputFocused]}
                      value={password}
                    />
                  </View>

                  <View style={styles.group}>
                    <Text style={styles.label}>Confirmar contrasena</Text>
                    <TextInput
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!saving && status !== 'success'}
                      onBlur={() => setFocusedField((current) => (current === 'confirmPassword' ? null : current))}
                      onChangeText={setConfirmPassword}
                      onFocus={() => setFocusedField('confirmPassword')}
                      onSubmitEditing={() => {
                        if (canSubmit && status === 'ready') {
                          void handleSubmit();
                        }
                      }}
                      placeholder="Repite tu contrasena"
                      placeholderTextColor="#8A94A6"
                      returnKeyType="go"
                      secureTextEntry
                      style={[styles.input, focusedField === 'confirmPassword' && styles.inputFocused]}
                      value={confirmPassword}
                    />
                  </View>

                  {feedback ? (
                    <View style={[styles.feedback, status === 'success' ? styles.feedbackSuccess : styles.feedbackError]}>
                      <Text style={status === 'success' ? styles.feedbackSuccessText : styles.feedbackErrorText}>{feedback}</Text>
                    </View>
                  ) : null}

                  {status === 'success' ? (
                    <Pressable onPress={() => router.replace('/')} style={styles.submitPrimary}>
                      <Text style={styles.submitPrimaryLabel}>Continuar</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      disabled={!canSubmit || saving}
                      onPress={() => void handleSubmit()}
                      style={[styles.submitPrimary, (!canSubmit || saving) && styles.buttonDisabled]}>
                      <Text style={styles.submitPrimaryLabel}>{saving ? 'Guardando...' : 'Guardar nueva contrasena'}</Text>
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
