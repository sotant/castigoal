import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, radius, shadows, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/use-auth';
import { buildPasswordRecoveryRedirectUrl } from '@/src/lib/auth-deep-links';
import { appRoutes } from '@/src/navigation/app-routes';
import {
  requestPasswordReset,
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
  return `No se pudo continuar: ${message}`;
}

type AuthMode = 'signin' | 'signup' | 'recovery';

const ACCESS_CONTROL_HEIGHT = 40;

function getAuthModeFromParam(mode: string | string[] | undefined): AuthMode {
  if (mode === 'signup') {
    return 'signup';
  }

  if (mode === 'recovery') {
    return 'recovery';
  }

  return 'signin';
}

function HeroArtwork() {
  return (
    <View pointerEvents="none" style={styles.heroArtwork}>
      <View style={styles.heroCloudLarge} />
      <View style={styles.heroCloudSmall} />
      <View style={styles.heroSparkLeft} />
      <View style={styles.heroSparkRight} />

      <View style={styles.clipboardShadow} />
      <View style={styles.clipboardCard}>
        <View style={styles.clipboardClip} />
        <MaterialCommunityIcons color="#6A7FFF" name="clipboard-text-outline" size={58} />
        <View style={styles.checkBadge}>
          <Feather color={palette.snow} name="check" size={18} />
        </View>
      </View>
    </View>
  );
}

export function AuthScreen() {
  const params = useLocalSearchParams<{ email?: string; returnTo?: string; mode?: string }>();
  const { session } = useAuth();
  const initialMode = getAuthModeFromParam(params.mode);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; message: string } | null>(null);
  const [loadingAction, setLoadingAction] = useState<'signin' | 'signup' | 'reset' | null>(null);
  const inFlightRef = useRef(false);
  const canSubmit = email.trim().length > 0 && password.trim().length >= 6;
  const canRecover = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);
  const passwordResetRedirectTo = buildPasswordRecoveryRedirectUrl();
  const returnTo = typeof params.returnTo === 'string' ? params.returnTo : appRoutes.settings;

  useEffect(() => {
    setMode(getAuthModeFromParam(params.mode));
    setFeedback(null);
  }, [params.mode]);

  useEffect(() => {
    if (typeof params.email === 'string') {
      setEmail(params.email);
    }
  }, [params.email]);

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
      await requestPasswordReset(trimmedEmail, passwordResetRedirectTo);
      setFeedback({
        kind: 'success',
        message: 'Si existe una cuenta asociada a este correo, te hemos enviado instrucciones para restablecer tu contrasena.',
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
      bodyStyle={styles.screenBody}
      scroll={false}
      title="Accede a tu progreso">
      <View style={styles.keyboardArea}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.shell}>
            <View pointerEvents="none" style={styles.pageGlow}>
              <View style={styles.pageGlowTop} />
              <View style={styles.pageGlowBottom} />
            </View>

            <View style={styles.cardWrap}>
              <View style={styles.formCard}>
                <HeroArtwork />

                {mode !== 'recovery' ? (
                  <View style={styles.modeSwitch}>
                    <Pressable
                      disabled={!!loadingAction}
                      onPress={() => switchMode('signin')}
                      style={[styles.modeChip, mode === 'signin' && styles.modeChipActive]}>
                      <Text style={[styles.modeChipLabel, mode === 'signin' && styles.modeChipLabelActive]}>
                        Iniciar sesion
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={!!loadingAction}
                      onPress={() => switchMode('signup')}
                      style={[styles.modeChip, mode === 'signup' && styles.modeChipActive]}>
                      <Text style={[styles.modeChipLabel, mode === 'signup' && styles.modeChipLabelActive]}>
                        Crear cuenta
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                <View style={styles.group}>
                  <Text style={styles.label}>Email</Text>
                  <View style={styles.inputField}>
                    <Feather color="#97A3BC" name="mail" size={18} style={styles.inputIcon} />
                    <TextInput
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loadingAction}
                      keyboardType="email-address"
                      placeholder="tu@email.com"
                      placeholderTextColor="#98A2B3"
                      returnKeyType={mode === 'recovery' ? 'go' : 'next'}
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      onSubmitEditing={() => {
                        if (mode === 'recovery' && canRecover) {
                          void handlePasswordReset();
                        }
                      }}
                    />
                  </View>
                </View>

                {mode !== 'recovery' ? (
                  <>
                    <View style={styles.group}>
                      <Text style={styles.label}>Contrasena</Text>
                      <View style={styles.inputField}>
                        <Feather color="#97A3BC" name="lock" size={18} style={styles.inputIcon} />
                        <TextInput
                          autoCapitalize="none"
                          autoCorrect={false}
                          editable={!loadingAction}
                          placeholder="Minimo 6 caracteres"
                          placeholderTextColor="#98A2B3"
                          returnKeyType="go"
                          secureTextEntry={!isPasswordVisible}
                          style={styles.passwordInput}
                          value={password}
                          onChangeText={setPassword}
                          onSubmitEditing={() => {
                            if (mode === 'signin' && canSubmit) {
                              void submit('signin');
                            }
                          }}
                        />
                        <Pressable
                          disabled={!!loadingAction}
                          hitSlop={8}
                          onPress={() => setIsPasswordVisible((current) => !current)}
                          style={styles.passwordToggle}>
                          <Feather
                            color={loadingAction ? '#C0C8D8' : '#7C8798'}
                            name={isPasswordVisible ? 'eye-off' : 'eye'}
                            size={18}
                          />
                        </Pressable>
                      </View>
                    </View>

                    {mode === 'signin' ? (
                      <Pressable
                        disabled={!!loadingAction}
                        hitSlop={8}
                        onPress={() => switchMode('recovery')}
                        style={styles.compactLinkWrap}>
                        <Text style={[styles.linkLabel, !!loadingAction && styles.linkDisabled]}>
                          {loadingAction === 'reset' ? 'Enviando enlace...' : 'Olvidaste tu contrasena?'}
                        </Text>
                      </Pressable>
                    ) : null}
                  </>
                ) : (
                  <Pressable disabled={!!loadingAction} hitSlop={8} onPress={() => switchMode('signin')}>
                    <Text style={[styles.linkLabel, !!loadingAction && styles.linkDisabled]}>Volver al login</Text>
                  </Pressable>
                )}

                {feedback ? (
                  <View style={[styles.feedback, feedback.kind === 'error' ? styles.feedbackError : styles.feedbackSuccess]}>
                    <Text style={feedback.kind === 'error' ? styles.feedbackErrorText : styles.feedbackSuccessText}>
                      {feedback.message}
                    </Text>
                  </View>
                ) : null}

                {mode === 'signin' ? (
                  <Pressable
                    disabled={!canSubmit || !!loadingAction}
                    onPress={() => void submit('signin')}
                    style={[styles.submitPrimary, (!canSubmit || !!loadingAction) && styles.buttonDisabled]}>
                    <Text style={styles.submitPrimaryLabel}>
                      {loadingAction === 'signin' ? 'Cargando...' : 'Iniciar sesion'}
                    </Text>
                  </Pressable>
                ) : mode === 'signup' ? (
                  <Pressable
                    disabled={!canSubmit || !!loadingAction}
                    onPress={() => void submit('signup')}
                    style={[styles.submitPrimary, (!canSubmit || !!loadingAction) && styles.buttonDisabled]}>
                    <Text style={styles.submitPrimaryLabel}>
                      {loadingAction === 'signup' ? 'Cargando...' : 'Crear cuenta'}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    disabled={!canRecover || !!loadingAction}
                    onPress={() => void handlePasswordReset()}
                    style={[styles.submitPrimary, (!canRecover || !!loadingAction) && styles.buttonDisabled]}>
                    <Text style={styles.submitPrimaryLabel}>
                      {loadingAction === 'reset' ? 'Enviando...' : 'Enviar enlace'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenBody: {
    paddingTop: spacing.xl,
    backgroundColor: '#F8F7FF',
  },
  keyboardArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  shell: {
    flex: 1,
    minHeight: 620,
  },
  pageGlow: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  pageGlowTop: {
    position: 'absolute',
    top: 70,
    right: -60,
    width: 260,
    height: 180,
    borderRadius: 999,
    backgroundColor: '#D9E4FF',
    opacity: 0.9,
    transform: [{ rotate: '-18deg' }],
  },
  pageGlowBottom: {
    position: 'absolute',
    top: 240,
    left: -110,
    width: 250,
    height: 250,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    opacity: 0.85,
  },
  cardWrap: {
    marginTop: 32,
  },
  heroArtwork: {
    alignItems: 'center',
    marginTop: -10,
    marginBottom: 12,
  },
  heroCloudLarge: {
    position: 'absolute',
    top: 20,
    width: 210,
    height: 92,
    borderRadius: 999,
    backgroundColor: '#DDE5FF',
    opacity: 0.7,
    transform: [{ rotate: '-9deg' }],
  },
  heroCloudSmall: {
    position: 'absolute',
    top: 34,
    left: '50%',
    marginLeft: -44,
    width: 88,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#EDF1FF',
    opacity: 0.95,
  },
  heroSparkLeft: {
    position: 'absolute',
    top: 48,
    left: '50%',
    marginLeft: -88,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#B7C5FF',
  },
  heroSparkRight: {
    position: 'absolute',
    top: 64,
    right: '50%',
    marginRight: -96,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D4DCFF',
  },
  clipboardShadow: {
    position: 'absolute',
    top: 44,
    width: 96,
    height: 20,
    borderRadius: 999,
    backgroundColor: 'rgba(92, 115, 214, 0.18)',
    transform: [{ scaleX: 1.08 }],
  },
  clipboardCard: {
    marginTop: 8,
    width: 98,
    height: 98,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#92A7FF',
    shadowColor: '#728BFF',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  clipboardClip: {
    position: 'absolute',
    top: -8,
    width: 24,
    height: 14,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    borderWidth: 3,
    borderColor: '#A5B4FF',
    backgroundColor: '#EFF2FF',
  },
  checkBadge: {
    position: 'absolute',
    right: -8,
    bottom: 6,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFC86C',
    borderWidth: 3,
    borderColor: '#FFF2D8',
  },
  formCard: {
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: '#EEF1FA',
    backgroundColor: 'rgba(255,255,255,0.96)',
    ...shadows.card,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 5,
  },
  modeSwitch: {
    flexDirection: 'row',
    minHeight: ACCESS_CONTROL_HEIGHT,
    padding: 2,
    borderRadius: radius.pill,
    backgroundColor: '#EEF3FF',
    gap: 4,
  },
  modeChip: {
    flex: 1,
    minHeight: ACCESS_CONTROL_HEIGHT - 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeChipActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#A6BAFF',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  modeChipLabel: {
    color: '#6F7D95',
    fontSize: 14,
    fontWeight: '800',
  },
  modeChipLabelActive: {
    color: palette.primaryDeep,
  },
  group: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#24314F',
  },
  inputField: {
    minHeight: ACCESS_CONTROL_HEIGHT,
    justifyContent: 'center',
    paddingLeft: 42,
    paddingRight: spacing.md,
    borderWidth: 1,
    borderColor: '#D8DFED',
    borderRadius: radius.pill,
    backgroundColor: '#F8FAFF',
  },
  inputIcon: {
    position: 'absolute',
    left: spacing.md,
    top: 11,
  },
  input: {
    minHeight: ACCESS_CONTROL_HEIGHT,
    fontSize: 15,
    color: '#334155',
    paddingVertical: 0,
  },
  passwordInput: {
    minHeight: ACCESS_CONTROL_HEIGHT,
    paddingRight: 36,
    fontSize: 15,
    color: '#334155',
    paddingVertical: 0,
  },
  passwordToggle: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  linkLabel: {
    color: palette.primaryDeep,
    fontSize: 14,
    fontWeight: '700',
  },
  linkDisabled: {
    opacity: 0.45,
  },
  compactLinkWrap: {
    marginTop: -4,
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
    textAlign: 'center',
  },
  feedbackSuccessText: {
    color: '#065F46',
    lineHeight: 20,
    textAlign: 'center',
  },
  submitPrimary: {
    minHeight: ACCESS_CONTROL_HEIGHT,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4B7CFF',
    shadowColor: '#4B7CFF',
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  submitPrimaryLabel: {
    color: palette.snow,
    fontSize: 15,
    fontWeight: '800',
  },
  buttonDisabled: {
    backgroundColor: '#A8B4CF',
    shadowOpacity: 0,
    elevation: 0,
  },
});
