import { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Directions, FlingGestureHandler } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';

import { palette, spacing } from '@/src/constants/theme';
import { getAdjacentTabHref, isMainTabPath } from '@/src/navigation/app-routes';

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  action?: ReactNode;
  scroll?: boolean;
  enableTabSwipe?: boolean;
}>;

export function ScreenContainer({
  title,
  subtitle,
  action,
  scroll = true,
  enableTabSwipe,
  children,
}: Props) {
  const pathname = usePathname();
  const shouldEnableTabSwipe = enableTabSwipe ?? isMainTabPath(pathname);

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
    <View style={[styles.body, !scroll && styles.bodyFill]}>
      <View style={styles.header}>
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
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? spacing.md : 0}
            style={styles.keyboardArea}>
            {scroll ? (
              <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                keyboardShouldPersistTaps="handled">
                {content}
              </ScrollView>
            ) : (
              content
            )}
          </KeyboardAvoidingView>
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
  keyboardArea: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  body: {
    padding: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  bodyFill: {
    flex: 1,
  },
  header: {
    gap: spacing.sm,
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
