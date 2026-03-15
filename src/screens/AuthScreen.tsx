import * as Linking from 'expo-linking';
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
import { router, useLocalSearchParams } from 'expo-router';

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/use-auth';
import { appRoutes } from '@/src/navigation/app-routes';
import {
  requestValidatedPasswordReset,
  signInWithEmail,
  signUpWithEmail,
} from '@/src/repositories/auth-repository';

function getFriendlyAuthMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('email rate limit exceeded')) {
    return 'Has hecho demasiados intentos seguidos. Espera un poco antes de volver a intentarlo.';
  }

  if (normalized.includes('email address') && normalized.includes('invalid')) {
    return 'El correo que has escrito no es valido. Usa una direccion de email real.';
  }

  if (normalized.includes('invalid login credentials')) {
    return 'El email o la contrasena no son correctos.';
  }

  if (normalized.includes('user already registered')) {
    return 'Ya existe una cuenta con ese correo. Prueba a iniciar sesion.';
  }

  if (normalized.includes('signup is disabled')) {
    return 'El registro esta desactivado en este momento.';
  }

  if (normalized.includes('password should be at least')) {
    return 'La contrasena es demasiado corta. Usa al menos 6 caracteres.';
  }

  if (normalized.includes('no existe ninguna cuenta con ese email')) {
    return 'No existe ninguna cuenta con ese email.';
  }

  return `No se pudo continuar: ${message}`;
}

type AuthMode = 'access' | 'recovery';

export function AuthScreen() {
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const { session } = useAuth();
  const [mode, setMode] = useState<AuthMode>('access');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; message: string } | null>(null);
  const [loadingAction, setLoadingAction] = useState<'signin' | 'signup' | 'reset' | null>(null);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const inFlightRef = useRef(false);
  const canSubmit = email.trim().length > 0 && password.trim().length >= 6;
  const canRecover = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);
  const passwordResetRedirectTo =
    Platform.OS === 'web' ? Linking.createURL(appRoutes.resetPassword) : 'castigoal://reset-password';
  const returnTo = typeof params.returnTo === 'string' ? params.returnTo : appRoutes.settings;

  useEffect(() => {
    if (session) {
      router.replace(returnTo);
    }
  }, [returnTo, session]);

  if (session) {
    return null;
  }

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setFeedback(null);
    setFocusedField(null);
  };

  const submit = async (action: 'signin' | 'signup') => {
    if (inFlightRef.current || loadingAction) {
      return;
    }

    const trimmedEmail = email.trim();

    if (!trimmedEmail || password.trim().length < 6) {
      setFeedback({
        kind: 'error',
        message: 'Introduce un email valido y una contrasena de al menos 6 caracteres.',
      });
      return;
    }

    inFlightRef.current = true;
    setFeedback(null);
    setLoadingAction(action);
    Keyboard.dismiss();

    try {
      const response =
        action === 'signin'
          ? await signInWithEmail(trimmedEmail, password)
          : await signUpWithEmail(trimmedEmail, password);

      if (action === 'signup' && !response.data.session) {
        setFeedback({
          kind: 'success',
          message: 'Cuenta creada. Revisa tu email y confirma el registro para poder entrar.',
        });
        return;
      }

      if (action === 'signin') {
        setFeedback({
          kind: 'success',
          message: 'Inicio de sesion correcto.',
        });
      }
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? getFriendlyAuthMessage(error.message) : 'Ha ocurrido un error inesperado.',
      });
    } finally {
      inFlightRef.current = false;
      setLoadingAction(null);
    }
  };

  const handlePasswordReset = async () => {
    if (inFlightRef.current || loadingAction) {
      return;
    }

    const trimmedEmail = email.trim();

    if (!canRecover) {
      setFeedback({
        kind: 'error',
        message: 'Escribe un email valido para recuperar tu contrasena.',
      });
      return;
    }

    inFlightRef.current = true;
    setFeedback(null);
    setLoadingAction('reset');
    Keyboard.dismiss();

    try {
      await requestValidatedPasswordReset(trimmedEmail, passwordResetRedirectTo);
      setFeedback({
        kind: 'success',
        message: 'Te hemos enviado un correo para recuperar tu contrasena.',
      });
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? getFriendlyAuthMessage(error.message) : 'Ha ocurrido un error inesperado.',
      });
    } finally {
      inFlightRef.current = false;
      setLoadingAction(null);
    }
  };

  return (
    <ScreenContainer
      title="Guardar tu progreso"
      subtitle="Crea una cuenta o inicia sesion para vincular este dispositivo y recuperar tu progreso en el futuro."
      scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        style={styles.keyboardArea}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Pressable onPress={Keyboard.dismiss} style={styles.shell}>
            <View style={styles.backdrop} pointerEvents="none">
              <View style={styles.glowPrimary} />
              <View style={styles.glowSecondary} />
            </View>

            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <Text style={styles.cardTitle}>
                  {mode === 'access' ? 'Tu espacio, sin distracciones.' : 'Recupera tu acceso.'}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {mode === 'access'
                    ? 'Entra o crea tu cuenta con email y contrasena para seguir donde lo dejaste.'
                    : 'Escribe tu email y te enviaremos un enlace para crear una contrasena nueva.'}
                </Text>
              </View>

              <View style={styles.group}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loadingAction}
                  keyboardType="email-address"
                  onBlur={() => setFocusedField((current) => (current === 'email' ? null : current))}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  placeholder="tu@email.com"
                  placeholderTextColor="#8A94A6"
                  returnKeyType={mode === 'access' ? 'next' : 'go'}
                  style={[styles.input, focusedField === 'email' && styles.inputFocused]}
                  value={email}
                />
              </View>

              {mode === 'access' ? (
                <>
                  <View style={styles.group}>
                    <Text style={styles.label}>Contrasena</Text>
                    <TextInput
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loadingAction}
                      onBlur={() => setFocusedField((current) => (current === 'password' ? null : current))}
                      onChangeText={setPassword}
                      onFocus={() => setFocusedField('password')}
                      onSubmitEditing={() => {
                        if (canSubmit) {
                          void submit('signin');
                        }
                      }}
                      placeholder="Minimo 6 caracteres"
                      placeholderTextColor="#8A94A6"
                      returnKeyType="go"
                      secureTextEntry
                      style={[styles.input, focusedField === 'password' && styles.inputFocused]}
                      value={password}
                    />
                  </View>

                  <Pressable disabled={!!loadingAction} hitSlop={8} onPress={() => switchMode('recovery')}>
                    <Text style={[styles.linkLabel, !!loadingAction && styles.linkDisabled]}>
                      {loadingAction === 'reset' ? 'Enviando enlace...' : 'Olvidaste tu contrasena?'}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    disabled={!canRecover || !!loadingAction}
                    onPress={() => void handlePasswordReset()}
                    style={[styles.submitPrimary, (!canRecover || !!loadingAction) && styles.buttonDisabled]}>
                    <Text style={styles.submitPrimaryLabel}>
                      {loadingAction === 'reset' ? 'Recuperando...' : 'Recuperar'}
                    </Text>
                  </Pressable>

                  <Pressable disabled={!!loadingAction} onPress={() => switchMode('access')} style={styles.secondaryLink}>
                    <Text style={[styles.secondaryLinkLabel, !!loadingAction && styles.linkDisabled]}>
                      Ir a acceso
                    </Text>
                  </Pressable>
                </>
              )}

              {feedback ? (
                <View style={[styles.feedback, feedback.kind === 'error' ? styles.feedbackError : styles.feedbackSuccess]}>
                  <Text style={feedback.kind === 'error' ? styles.feedbackErrorText : styles.feedbackSuccessText}>
                    {feedback.message}
                  </Text>
                </View>
              ) : null}

              {mode === 'access' ? (
                <View style={styles.actions}>
                  <Pressable
                    disabled={!canSubmit || !!loadingAction}
                    onPress={() => void submit('signin')}
                    style={[styles.submitPrimary, (!canSubmit || !!loadingAction) && styles.buttonDisabled]}>
                    <Text style={styles.submitPrimaryLabel}>
                      {loadingAction === 'signin' ? 'Cargando...' : 'Iniciar sesion'}
                    </Text>
                  </Pressable>

                  <Pressable
                    disabled={!canSubmit || !!loadingAction}
                    onPress={() => void submit('signup')}
                    style={[styles.submitSecondary, (!canSubmit || !!loadingAction) && styles.buttonDisabledSecondary]}>
                    <Text style={styles.submitSecondaryLabel}>
                      {loadingAction === 'signup' ? 'Cargando...' : 'Crear cuenta'}
                    </Text>
                  </Pressable>
                </View>
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
    backgroundColor: '#DDE9FF',
    opacity: 0.9,
  },
  glowSecondary: {
    position: 'absolute',
    bottom: 40,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFEBD8',
    opacity: 0.75,
  },
  formCard: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E6ECF2',
    backgroundColor: 'rgba(255,255,255,0.96)',
    ...shadows.card,
  },
  formHeader: {
    gap: spacing.xs,
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
    borderColor: palette.primary,
    backgroundColor: palette.snow,
    shadowColor: palette.primary,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  linkLabel: {
    color: palette.primaryDeep,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryLink: {
    alignItems: 'center',
  },
  secondaryLinkLabel: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  linkDisabled: {
    opacity: 0.45,
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
  actions: {
    gap: spacing.sm,
  },
  submitPrimary: {
    paddingVertical: 16,
    borderRadius: radius.pill,
    alignItems: 'center',
    backgroundColor: palette.primary,
  },
  submitPrimaryLabel: {
    color: palette.snow,
    fontSize: 16,
    fontWeight: '800',
  },
  submitSecondary: {
    paddingVertical: 16,
    borderRadius: radius.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D5DEE8',
    backgroundColor: '#F8FAFC',
  },
  submitSecondaryLabel: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonDisabledSecondary: {
    opacity: 0.5,
  },
});
