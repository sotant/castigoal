import { StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, radius, spacing } from '@/src/constants/theme';

type PrivacySection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

const sections: PrivacySection[] = [
  {
    title: 'Responsable',
    paragraphs: [
      'Daniel Soto Ocón es el responsable del tratamiento descrito en esta política para la app Castigoal.',
      'Para cualquier consulta relacionada con privacidad o soporte, puedes escribir a sotodani11.dev@gmail.com.',
    ],
  },
  {
    title: 'Datos que tratamos',
    bullets: [
      'Correo electrónico de acceso y nombre visible del perfil cuando creas una cuenta.',
      'Objetivos, descripciones, check-ins, resultados, castigos personalizados, castigos asignados e historial relacionado.',
      'Preferencias de recordatorios y otros ajustes de la app.',
      'Datos guardados en el dispositivo para mantener la sesión, el modo invitado, el onboarding, el tutorial y el progreso local.',
      'Datos de soporte voluntarios si envías sugerencias o reportes: correo electrónico de contacto, asunto, mensaje, categoría, sección afectada, pasos de reproducción, plataforma, idioma y versión de la app.',
      'Identificadores internos de notificaciones locales y la hora que eliges para recibir recordatorios.',
    ],
    paragraphs: ['Castigoal no solicita ubicación, contactos, micrófono ni cámara para su funcionamiento actual.'],
  },
  {
    title: 'Para qué se usan',
    bullets: [
      'Crear y autenticar tu cuenta.',
      'Guardar tu progreso y sincronizarlo cuando usas una cuenta.',
      'Permitir el uso en modo invitado y migrar ese progreso a una cuenta si después te registras.',
      'Calcular estadísticas, evaluaciones y castigos asociados a tus objetivos.',
      'Guardar tus preferencias y programar recordatorios locales en el dispositivo.',
      'Atender sugerencias, incidencias o peticiones de ayuda enviadas desde la app.',
      'Borrar, resetear o desvincular datos cuando lo solicitas.',
    ],
  },
  {
    title: 'Dónde se almacenan',
    paragraphs: [
      'La autenticación y la base de datos remota se gestionan con Supabase.',
      'La sesión se almacena con Secure Store cuando el sistema lo permite. Parte del estado local, del modo invitado y de los recordatorios se guarda en el dispositivo para que la app funcione correctamente.',
    ],
  },
  {
    title: 'Compartición y conservación',
    paragraphs: [
      'Castigoal no vende datos personales ni trabaja con redes publicitarias. Los datos solo se comparten con proveedores técnicos necesarios para prestar el servicio, como Supabase.',
      'Los datos asociados a una cuenta se conservan mientras la cuenta permanezca activa o hasta que solicites su eliminación. Los datos guardados solo en el dispositivo pueden permanecer hasta que cierres sesión, elimines datos locales, desinstales la app o migres tu progreso a una cuenta.',
      'Los mensajes de soporte o feedback pueden conservarse durante el tiempo necesario para revisar la incidencia, responderte o mejorar la app.',
    ],
  },
];

export function PrivacyPolicyScreen() {
  return (
    <ScreenContainer title="Política de privacidad" subtitle="Versión 1.1. Vigente desde el 29 de marzo de 2026.">
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Castigoal</Text>
        <Text style={styles.heroText}>
          Esta política resume qué datos trata la app, para qué se usan, dónde se almacenan y qué controles tienes sobre tu
          cuenta y tu progreso.
        </Text>
      </View>

      {sections.map((section) => (
        <View key={section.title} style={styles.card}>
          <Text style={styles.cardTitle}>{section.title}</Text>
          {section.paragraphs?.map((paragraph) => (
            <Text key={paragraph} style={styles.cardBody}>
              {paragraph}
            </Text>
          ))}
          {section.bullets?.map((bullet) => (
            <View key={bullet} style={styles.bulletRow}>
              <Text style={styles.bulletMarker}>{'\u2022'}</Text>
              <Text style={styles.bulletText}>{bullet}</Text>
            </View>
          ))}
        </View>
      ))}

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Tus controles</Text>
        <Text style={styles.noticeBody}>
          Puedes revisar esta política desde Ajustes, gestionar recordatorios, cerrar sesión y eliminar tu cuenta completa
          desde la propia app.
        </Text>
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Contacto</Text>
        <Text style={styles.noticeBody}>
          Si necesitas ayuda o quieres realizar una consulta sobre privacidad, puedes escribir a
          {' '}sotodani11.dev@gmail.com.
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
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  bulletMarker: {
    color: palette.primaryDeep,
    fontSize: 16,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
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
