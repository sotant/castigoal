import { PropsWithChildren, ReactNode, useCallback, useRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Directions, FlingGestureHandler } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';

import { palette, spacing } from '@/src/constants/theme';
import { getAdjacentTabHref, isMainTabPath } from '@/src/navigation/app-routes';

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  action?: ReactNode;
  overlay?: ReactNode;
  scroll?: boolean;
  fixedHeader?: boolean;
  enableTabSwipe?: boolean;
  bodyStyle?: StyleProp<ViewStyle>;
  resetScrollOnFocus?: boolean;
}>;

export function ScreenContainer({
  title,
  subtitle,
  action,
  overlay,
  scroll = true,
  fixedHeader = false,
  enableTabSwipe,
  bodyStyle,
  resetScrollOnFocus = false,
  children,
}: Props) {
  const pathname = usePathname();
  const scrollViewRef = useRef<ScrollView>(null);
  const shouldEnableTabSwipe = enableTabSwipe ?? isMainTabPath(pathname);
  const shouldUseKeyboardAvoidingView = Platform.OS === 'ios';

  useFocusEffect(
    useCallback(() => {
      if (!scroll || !resetScrollOnFocus) {
        return;
      }

      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: false });
      });
    }, [resetScrollOnFocus, scroll]),
  );

  const handleTabSwipe = (direction: 'left' | 'right') => {
    if (!shouldEnableTabSwipe) {
      return;
    }

    const nextHref = getAdjacentTabHref(pathname, direction);

    if (nextHref) {
      router.navigate(nextHref);
    }
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );

  const bodyContent = <View style={[styles.bodyContent, !scroll && styles.bodyFill, bodyStyle]}>{children}</View>;

  const content = (
    <View style={[styles.body, !scroll && styles.bodyFill]}>
      {header}
      {bodyContent}
    </View>
  );

  const keyboardContent = (
    <>
      {scroll && fixedHeader ? (
        <View style={[styles.body, styles.bodyFill]}>
          {header}
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scroll}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            style={styles.scrollView}>
            {bodyContent}
          </ScrollView>
        </View>
      ) : scroll ? (
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scroll}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        content
      )}
      {overlay}
    </>
  );

  return (
    <FlingGestureHandler direction={Directions.LEFT} onActivated={() => handleTabSwipe('left')}>
      <FlingGestureHandler direction={Directions.RIGHT} onActivated={() => handleTabSwipe('right')}>
        <SafeAreaView edges={['top']} style={styles.safe}>
          {shouldUseKeyboardAvoidingView ? (
            <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={spacing.md} style={styles.keyboardArea}>
              {keyboardContent}
            </KeyboardAvoidingView>
          ) : (
            <View style={styles.keyboardArea}>{keyboardContent}</View>
          )}
        </SafeAreaView>
      </FlingGestureHandler>
    </FlingGestureHandler>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },
  keyboardArea: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  scrollView: {
    flex: 1,
  },
  body: {
    flex: 1,
    padding: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  bodyContent: {
    gap: spacing.md,
  },
  bodyFill: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: palette.ink,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#7C8798',
  },
});
