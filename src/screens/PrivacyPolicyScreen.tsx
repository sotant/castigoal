import { StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, radius, spacing } from '@/src/constants/theme';
import { appRoutes } from '@/src/navigation/app-routes';

const sections = [
  {
    title: 'Datos que usamos',
    body:
      'Castigoal usa tu email de acceso, tu perfil basico, tus objetivos, check-ins, castigos personalizados, castigos asignados y ajustes de recordatorios para prestar el servicio.',
  },
  {
    title: 'Para que se usan',
    body:
      'Estos datos se usan para autenticar tu cuenta, sincronizar tu progreso entre sesiones, calcular estadisticas, asignar consecuencias y enviarte recordatorios locales en tu dispositivo.',
  },
  {
    title: 'Donde se almacenan',
    body:
      'La autenticacion y la base de datos se alojan en Supabase. La sesion del usuario se guarda de forma segura en el dispositivo mediante Secure Store cuando esta disponible.',
  },
  {
    title: 'Comparticion',
    body:
      'Castigoal no vende tus datos. Solo se comparten con los proveedores tecnicos necesarios para operar la app, como Supabase para autenticacion y base de datos.',
  },
  {
    title: 'Tus controles',
    body:
      'Puedes actualizar tus datos desde la app, vaciar tus registros y borrar tu cuenta completa desde Ajustes. Al borrar la cuenta, se eliminan tu perfil y tus datos asociados.',
  },
];

export function PrivacyPolicyScreen() {
  return (
    <ScreenContainer
      title="Politica de privacidad"
      subtitle="Version 1.0. Vigente desde el 11 de marzo de 2026."
      showBackButton
      backFallbackHref={appRoutes.auth}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Castigoal</Text>
        <Text style={styles.heroText}>
          Esta politica resume que datos trata la app, por que los necesita y como puede el usuario pedir su borrado.
        </Text>
      </View>

      {sections.map((section) => (
        <View key={section.title} style={styles.card}>
          <Text style={styles.cardTitle}>{section.title}</Text>
          <Text style={styles.cardBody}>{section.body}</Text>
        </View>
      ))}

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Contacto y borrado</Text>
        <Text style={styles.noticeBody}>
          Si publicas la app en Google Play, sustituye este texto por tu email real de soporte y publica esta misma politica en una URL accesible desde la ficha de Play Store.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.night,
    gap: spacing.sm,
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
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
    gap: spacing.xs,
  },
  cardTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  cardBody: {
    color: palette.slate,
    lineHeight: 22,
  },
  notice: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    gap: spacing.xs,
  },
  noticeTitle: {
    color: '#92400E',
    fontWeight: '800',
  },
  noticeBody: {
    color: '#92400E',
    lineHeight: 22,
  },
});
