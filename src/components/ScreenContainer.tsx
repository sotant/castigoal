import { PropsWithChildren, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Directions, FlingGestureHandler } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Href, router, usePathname } from 'expo-router';

import { palette, spacing } from '@/src/constants/theme';
import { getAdjacentTabHref, isMainTabPath } from '@/src/navigation/app-routes';

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  action?: ReactNode;
  scroll?: boolean;
  showBackButton?: boolean;
  backFallbackHref?: Href;
  backLabel?: string;
  enableTabSwipe?: boolean;
}>;

export function ScreenContainer({
  title,
  subtitle,
  action,
  scroll = true,
  showBackButton = false,
  backFallbackHref,
  backLabel = 'Volver',
  enableTabSwipe,
  children,
}: Props) {
  const pathname = usePathname();
  const shouldEnableTabSwipe = enableTabSwipe ?? isMainTabPath(pathname);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (backFallbackHref) {
      router.replace(backFallbackHref);
    }
  };

  const handleTabSwipe = (direction: 'left' | 'right') => {
    if (!shouldEnableTabSwipe) {
      return;
    }

    const nextHref = getAdjacentTabHref(pathname, direction);

    if (nextHref) {
      router.navigate(nextHref);
    }
  };

  const content = (
    <View style={styles.body}>
      <View style={styles.header}>
        {showBackButton ? (
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonLabel}>{backLabel}</Text>
          </Pressable>
        ) : null}
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
      {children}
    </View>
  );

  return (
    <FlingGestureHandler direction={Directions.LEFT} onActivated={() => handleTabSwipe('left')}>
      <FlingGestureHandler direction={Directions.RIGHT} onActivated={() => handleTabSwipe('right')}>
        <SafeAreaView edges={['top']} style={styles.safe}>
          {scroll ? <ScrollView contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}
        </SafeAreaView>
      </FlingGestureHandler>
    </FlingGestureHandler>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.cloud,
  },
  scroll: {
    paddingBottom: spacing.xl,
  },
  body: {
    padding: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  header: {
    gap: spacing.sm,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  backButtonLabel: {
    color: palette.primaryDeep,
    fontWeight: '800',
  },
  headerCopy: {
    gap: spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: palette.ink,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.slate,
  },
});
