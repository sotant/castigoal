import { StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, radius, spacing } from '@/src/constants/theme';

const sections = [
  {
    title: 'Datos que usamos',
    body:
      'Castigoal usa tu email de acceso, tu perfil básico, tus objetivos, check-ins, castigos personalizados, castigos asignados y ajustes de recordatorios para prestar el servicio.',
  },
  {
    title: 'Para qué se usan',
    body:
      'Estos datos se usan para autenticar tu cuenta, sincronizar tu progreso entre sesiones, calcular estadísticas, asignar castigos y enviarte recordatorios locales en tu dispositivo.',
  },
  {
    title: 'Dónde se almacenan',
    body:
      'La autenticación y la base de datos se alojan en Supabase. La sesión del usuario se guarda de forma segura en el dispositivo mediante Secure Store cuando está disponible.',
  },
  {
    title: 'Comparticion',
    body:
      'Castigoal no vende tus datos. Solo se comparten con los proveedores técnicos necesarios para operar la app, como Supabase para autenticación y base de datos.',
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
      title="Política de privacidad"
      subtitle="Version 1.0. Vigente desde el 11 de marzo de 2026.">
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Castigoal</Text>
        <Text style={styles.heroText}>
          Esta política resume qué datos trata la app, por qué los necesita y cómo puede el usuario solicitar su borrado.
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
          Si publicas la app en Google Play, sustituye este texto por tu email real de soporte y publica esta misma política en una URL accesible desde la ficha de Play Store.
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
