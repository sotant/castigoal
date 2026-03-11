import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, radius, spacing } from '@/src/constants/theme';
import { signInWithEmail, signUpWithEmail } from '@/src/repositories/auth-repository';

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

export function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const inFlightRef = useRef(false);

  const submit = async () => {
    if (inFlightRef.current || loading) {
      return;
    }

    if (!email.trim() || password.trim().length < 6) {
      setFeedback({
        kind: 'error',
        message: 'Introduce un email valido y una contrasena de al menos 6 caracteres.',
      });
      return;
    }

    inFlightRef.current = true;
    setFeedback(null);
    setLoading(true);

    try {
      const response =
        mode === 'signin'
          ? await signInWithEmail(email, password)
          : await signUpWithEmail(email, password, displayName);

      if (response.error) {
        setFeedback({
          kind: 'error',
          message: getFriendlyAuthMessage(response.error.message),
        });
        return;
      }

      if (mode === 'signup' && !response.data.session) {
        setFeedback({
          kind: 'success',
          message: 'Cuenta creada. Revisa tu email y confirma el registro para poder entrar.',
        });
        return;
      }

      if (mode === 'signin') {
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
      setLoading(false);
    }
  };

  return (
    <ScreenContainer
      title="Acceso"
      subtitle="Entra con tu cuenta para guardar progreso, objetivos y castigos en Supabase."
      scroll={false}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Castigoal + Supabase</Text>
        <Text style={styles.heroText}>Autenticacion por email y base remota listas para esta app Expo.</Text>
      </View>

      <View style={styles.switchRow}>
        <Pressable
          disabled={loading}
          onPress={() => setMode('signin')}
          style={[styles.switchButton, mode === 'signin' && styles.active, loading && styles.disabled]}>
          <Text style={[styles.switchLabel, mode === 'signin' && styles.activeLabel]}>Entrar</Text>
        </Pressable>
        <Pressable
          disabled={loading}
          onPress={() => setMode('signup')}
          style={[styles.switchButton, mode === 'signup' && styles.active, loading && styles.disabled]}>
          <Text style={[styles.switchLabel, mode === 'signup' && styles.activeLabel]}>Crear cuenta</Text>
        </Pressable>
      </View>

      {mode === 'signup' ? (
        <View style={styles.group}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            autoCapitalize="words"
            editable={!loading}
            onChangeText={setDisplayName}
            placeholder="Como quieres aparecer"
            style={styles.input}
            value={displayName}
          />
        </View>
      ) : null}

      <View style={styles.group}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          editable={!loading}
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="tu@email.com"
          style={styles.input}
          value={email}
        />
      </View>

      <View style={styles.group}>
        <Text style={styles.label}>Contrasena</Text>
        <TextInput
          autoCapitalize="none"
          editable={!loading}
          onChangeText={setPassword}
          placeholder="Minimo 6 caracteres"
          secureTextEntry
          style={styles.input}
          value={password}
        />
      </View>

      {feedback ? (
        <View style={[styles.feedback, feedback.kind === 'error' ? styles.feedbackError : styles.feedbackSuccess]}>
          <Text style={feedback.kind === 'error' ? styles.feedbackErrorText : styles.feedbackSuccessText}>
            {feedback.message}
          </Text>
        </View>
      ) : null}

      <Pressable disabled={loading} onPress={() => void submit()} style={[styles.submit, loading && styles.disabled]}>
        <Text style={styles.submitLabel}>
          {loading ? 'Procesando...' : mode === 'signin' ? 'Entrar con email' : 'Crear cuenta'}
        </Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.night,
    gap: spacing.xs,
  },
  heroTitle: {
    color: palette.snow,
    fontSize: 24,
    fontWeight: '900',
  },
  heroText: {
    color: '#BFEDE7',
    lineHeight: 22,
  },
  switchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  switchButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
    backgroundColor: palette.snow,
  },
  active: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  switchLabel: {
    color: palette.ink,
    fontWeight: '700',
  },
  activeLabel: {
    color: palette.snow,
  },
  group: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.ink,
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.md,
    backgroundColor: palette.snow,
    fontSize: 16,
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
  submit: {
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: palette.accent,
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
