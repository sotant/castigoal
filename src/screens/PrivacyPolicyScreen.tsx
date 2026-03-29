import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, radius, spacing } from '@/src/constants/theme';
import { privacyCopy } from '@/src/i18n/privacy';

export function PrivacyPolicyScreen() {
  useTranslation();
  return (
    <ScreenContainer
      title={privacyCopy.screen.title}
      subtitle={privacyCopy.screen.subtitle}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{privacyCopy.hero.title}</Text>
        <Text style={styles.heroText}>{privacyCopy.hero.text}</Text>
      </View>

      {privacyCopy.sections.map((section) => (
        <View key={section.title} style={styles.card}>
          <Text style={styles.cardTitle}>{section.title}</Text>
          <Text style={styles.cardBody}>{section.body}</Text>
        </View>
      ))}

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>{privacyCopy.notice.title}</Text>
        <Text style={styles.noticeBody}>{privacyCopy.notice.body}</Text>
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
