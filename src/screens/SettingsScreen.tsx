import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { ScreenContainer } from '@/src/components/ScreenContainer';
import { palette, radius, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/use-auth';
import { getErrorMessage } from '@/src/lib/app-error';
import { appRoutes } from '@/src/navigation/app-routes';
import { useAppStore } from '@/src/store/app-store';

type TimeField = 'hour' | 'minute';

type ComboOption = {
  label: string;
  value: number;
};

const ACCOUNT_BUTTON_HEIGHT = 40;

export function SettingsScreen() {
  const { deleteAccount, signOut, session } = useAuth();
  const { resetOnboarding, retrySync, sessionState, settings, updateSettings } = useAppStore(
    useShallow((state) => ({
      resetOnboarding: state.resetOnboarding,
      retrySync: state.retrySync,
      sessionState: state.sessionState,
      settings: state.userSettings,
      updateSettings: state.updateSettings,
    })),
  );
  const goals = useAppStore((state) => state.goals);
  const [openField, setOpenField] = useState<TimeField | null>(null);
  const [accountAction, setAccountAction] = useState<'delete' | 'signout' | null>(null);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const [isPrivacySectionOpen, setIsPrivacySectionOpen] = useState(false);
  const [isResettingOnboarding, setIsResettingOnboarding] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
      });
    }, []),
  );

  const hourOptions = useMemo<ComboOption[]>(
    () =>
      Array.from({ length: 24 }, (_, index) => {
        const displayHour = index + 1;
        return {
          label: String(displayHour).padStart(2, '0'),
          value: displayHour,
        };
      }),
    [],
  );

  const minuteOptions = useMemo<ComboOption[]>(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const minute = index * 5;
        return {
          label: String(minute).padStart(2, '0'),
          value: minute,
        };
      }),
    [],
  );

  const selectedHour = settings.reminderHour === 0 ? 24 : settings.reminderHour;
  const selectedMinute = settings.reminderMinute;

  const comboTitle = openField === 'hour' ? 'Hora' : 'Minuto';
  const comboOptions = openField === 'hour' ? hourOptions : minuteOptions;

  const handleHourChange = (value: number) => {
    const normalizedHour = value === 24 ? 0 : value;
    void updateSettings({ reminderHour: normalizedHour });
  };

  const handleMinuteChange = (value: number) => {
    void updateSettings({ reminderMinute: value });
  };

  const handleDeleteAccount = () => {
    setDeleteAccountError(null);
    setDeleteAccountModalVisible(true);
  };

  const closeDeleteAccountModal = () => {
    if (accountAction === 'delete') {
      return;
    }

    setDeleteAccountModalVisible(false);
    setDeleteAccountError(null);
  };

  const confirmDeleteAccount = async () => {
    try {
      setAccountAction('delete');
      setDeleteAccountError(null);
      await deleteAccount();
      setDeleteAccountModalVisible(false);
      setDeleteAccountError(null);
    } catch (error) {
      setDeleteAccountError(getErrorMessage(error));
    } finally {
      setAccountAction(null);
    }
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reiniciar onboarding',
      'Se borrara el progreso local del onboarding y volveras al inicio del flujo. Esta opcion es temporal para validacion.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reiniciar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setIsResettingOnboarding(true);
                await resetOnboarding();
                router.replace(goals.length === 0 ? appRoutes.goals : appRoutes.home);
              } catch (error) {
                Alert.alert('No se pudo reiniciar', error instanceof Error ? error.message : 'Error desconocido');
              } finally {
                setIsResettingOnboarding(false);
              }
            })();
          },
        },
      ],
    );
  };

  const isAuthenticated = sessionState.mode === 'authenticated' && Boolean(session);
  const isSyncing = sessionState.syncStatus === 'syncing';
  const hasSyncError = sessionState.syncStatus === 'error' && Boolean(sessionState.syncError);
  const linkedEmail = session?.user.email || 'tu email';

  useEffect(() => {
    if (!isAuthenticated) {
      setDeleteAccountModalVisible(false);
      setDeleteAccountError(null);
    }
  }, [isAuthenticated]);

  return (
    <ScreenContainer
      bodyStyle={styles.screenBody}
      title="Ajustes"
      scroll={false}>
      <Modal
        animationType="fade"
        transparent
        visible={deleteAccountModalVisible}
        onRequestClose={closeDeleteAccountModal}>
        <View style={styles.modalOverlay}>
          <Pressable
            disabled={accountAction === 'delete'}
            style={styles.modalBackdrop}
            onPress={closeDeleteAccountModal}
          />

          <View style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>Privacidad y cuenta</Text>
            <Text style={styles.modalTitle}>Eliminar cuenta</Text>
            <Text style={styles.modalDescription}>
              {'Se eliminar\u00e1 tu cuenta, tu perfil y tus datos sincronizados en la base de datos. Esta acci\u00f3n no se puede deshacer.'}
            </Text>
            {deleteAccountError ? <Text style={styles.modalError}>{deleteAccountError}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable
                disabled={accountAction === 'delete'}
                onPress={closeDeleteAccountModal}
                style={[styles.modalSecondaryButton, accountAction === 'delete' && styles.disabled]}>
                <Text style={styles.secondaryLabel}>Cancelar</Text>
              </Pressable>
              <Pressable
                disabled={accountAction === 'delete'}
                onPress={() => {
                  void confirmDeleteAccount();
                }}
                style={[styles.modalDangerButton, accountAction === 'delete' && styles.disabled]}>
                <Text style={styles.modalDangerLabel}>
                  {accountAction === 'delete' ? 'Borrando...' : 'Borrar cuenta'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.contentSurface}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: tabBarHeight + insets.bottom + spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {!isAuthenticated ? (
            <View style={styles.ctaCard}>
              <Text style={styles.sectionTitle}>Guardar tu progreso</Text>
              <Text style={styles.helperText}>
                Crea una cuenta para guardar tu progreso y recuperarlo cuando quieras.
              </Text>
              <Pressable
                onPress={() => router.push({ pathname: appRoutes.auth, params: { returnTo: appRoutes.settings, mode: 'signup' } })}
                style={styles.primaryButton}>
                <Text style={styles.primaryLabel}>Crear cuenta</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push({ pathname: appRoutes.auth, params: { returnTo: appRoutes.settings, mode: 'signin' } })}
                style={styles.compactSecondaryButton}>
                <Text style={styles.secondaryLabel}>Iniciar sesion</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Cuenta activa</Text>
              <Text style={styles.helperText}>Progreso vinculado a {linkedEmail}</Text>
              {isSyncing ? <Text style={styles.syncInfo}>Estamos guardando tu progreso en tu cuenta...</Text> : null}
              {hasSyncError ? (
                <>
                  <Text style={styles.syncError}>
                    No pudimos completar la sincronizacion. Tus datos siguen en este dispositivo y volveremos a intentarlo.
                  </Text>
                  <Pressable onPress={() => void retrySync()} style={styles.secondaryButton}>
                    <Text style={styles.secondaryLabel}>Reintentar sincronizacion</Text>
                  </Pressable>
                </>
              ) : null}
              <Pressable
                disabled={accountAction === 'signout'}
                onPress={async () => {
                  try {
                    setAccountAction('signout');
                    await signOut();
                  } catch (error) {
                    Alert.alert('No se pudo cerrar sesion', error instanceof Error ? error.message : 'Error desconocido');
                  } finally {
                    setAccountAction(null);
                  }
                }}
                style={[styles.compactPrimaryButton, accountAction === 'signout' && styles.disabled]}>
                <Text style={styles.compactPrimaryLabel}>
                  {accountAction === 'signout' ? 'Cerrando sesion...' : 'Cerrar sesion'}
                </Text>
              </Pressable>
            </View>
          )}

          <View style={[styles.card, styles.remindersCard]}>
            <Text style={styles.sectionTitle}>Recordatorios</Text>
            <View style={styles.settingRow}>
              <Text style={styles.label}>Notificaciones diarias</Text>
              <Switch
                value={settings.remindersEnabled}
                onValueChange={(value) => {
                  void updateSettings({ remindersEnabled: value });
                }}
              />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.label}>Recordatorio de castigo pendiente</Text>
              <Switch
                value={settings.pendingPunishmentReminderEnabled}
                onValueChange={(value) => {
                  void updateSettings({ pendingPunishmentReminderEnabled: value });
                }}
              />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeRowLabel}>Hora</Text>
              <View style={styles.timeInputs}>
                <Pressable onPress={() => setOpenField('hour')} style={styles.timeInputButton}>
                  <Text style={styles.comboValue}>{String(selectedHour).padStart(2, '0')}</Text>
                </Pressable>
                <Text style={styles.timeSeparator}>:</Text>
                <Pressable onPress={() => setOpenField('minute')} style={styles.timeInputButton}>
                  <Text style={styles.comboValue}>{String(selectedMinute).padStart(2, '0')}</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Comentarios y ayuda</Text>
            <Text style={styles.helperText}>Comparte errores, sugerencias o ideas para mejorar la app.</Text>
            <View style={styles.feedbackActions}>
              <Pressable onPress={() => router.push(appRoutes.feedbackSuggestion)} style={styles.compactSectionPrimaryButton}>
                <View style={styles.buttonContent}>
                  <MaterialCommunityIcons color={palette.primaryDeep} name="lightbulb-outline" size={18} />
                  <Text style={styles.primaryLabel}>Enviar sugerencia</Text>
                </View>
              </Pressable>
              <Pressable onPress={() => router.push(appRoutes.feedbackBugReport)} style={styles.compactSectionPrimaryButton}>
                <View style={styles.buttonContent}>
                  <MaterialCommunityIcons color={palette.primaryDeep} name="bug-outline" size={18} />
                  <Text style={styles.primaryLabel}>Reportar error</Text>
                </View>
              </Pressable>
            </View>
          </View>

          <View style={[styles.card, styles.temporaryToolsCard]}>
            <Text style={styles.sectionTitle}>Herramientas temporales</Text>
            <Text style={styles.helperText}>Utilidad de testing para volver a recorrer el onboarding desde cero.</Text>
            <Pressable
              accessibilityLabel="Reiniciar onboarding"
              accessibilityRole="button"
              disabled={isResettingOnboarding}
              onPress={handleResetOnboarding}
              style={[styles.compactWarningButton, isResettingOnboarding && styles.disabled]}>
              <Text style={styles.warningLabel}>
                {isResettingOnboarding ? 'Reiniciando onboarding...' : 'Reiniciar onboarding'}
              </Text>
            </Pressable>
          </View>

          <View style={[styles.card, !isPrivacySectionOpen && styles.collapsedCard]}>
            <Pressable
              onPress={() => setIsPrivacySectionOpen((current) => !current)}
              style={({ pressed }) => [styles.collapsibleHeader, pressed && styles.collapsibleHeaderPressed]}>
              <Text style={styles.sectionTitle}>Privacidad y cuenta</Text>
              <Feather
                color={palette.primaryDeep}
                name={isPrivacySectionOpen ? 'chevron-up' : 'chevron-down'}
                size={20}
              />
            </Pressable>

            {isPrivacySectionOpen ? (
              <>
                <Text style={styles.helperText}>
                  {isAuthenticated
                    ? 'Revisa la politica de privacidad o elimina tu cuenta.'
                    : 'Revisa la politica de privacidad.'}
                </Text>

                <Pressable onPress={() => router.push(appRoutes.privacy)} style={styles.compactSectionPrimaryButton}>
                  <Text style={styles.primaryLabel}>Ver politica de privacidad</Text>
                </Pressable>

                {isAuthenticated ? (
                  <Pressable
                    disabled={accountAction === 'delete'}
                    onPress={handleDeleteAccount}
                    style={[styles.compactDangerButton, accountAction === 'delete' && styles.disabled]}>
                    <Text style={styles.dangerLabel}>
                      {accountAction === 'delete' ? 'Borrando cuenta...' : 'Eliminar cuenta'}
                    </Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}
          </View>
        </ScrollView>
      </View>

      <Modal animationType="slide" transparent visible={openField !== null} onRequestClose={() => setOpenField(null)}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={() => setOpenField(null)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetEyebrow}>Selecciona</Text>
            <Text style={styles.sheetTitle}>{comboTitle}</Text>
            <ScrollView contentContainerStyle={styles.optionList}>
              {comboOptions.map((option) => {
                const isSelected =
                  openField === 'hour' ? option.value === selectedHour : option.value === selectedMinute;

                return (
                  <Pressable
                    key={`${openField}-${option.value}`}
                    onPress={() => {
                      if (openField === 'hour') {
                        handleHourChange(option.value);
                      } else {
                        handleMinuteChange(option.value);
                      }
                      setOpenField(null);
                    }}
                    style={[styles.optionButton, isSelected ? styles.optionButtonSelected : null]}>
                    <Text style={[styles.optionLabel, isSelected ? styles.optionLabelSelected : null]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenBody: {
    paddingBottom: 0,
  },
  contentSurface: {
    flex: 1,
  },
  scrollContent: {
    gap: 6,
  },
  card: {
    padding: spacing.md,
    borderRadius: 20,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: palette.line,
    gap: spacing.sm,
  },
  collapsedCard: {
    paddingVertical: 10,
  },
  remindersCard: {
    gap: 4,
  },
  temporaryToolsCard: {
    borderColor: '#F3D19A',
    backgroundColor: '#FFF8EC',
  },
  ctaCard: {
    padding: spacing.md,
    borderRadius: 22,
    backgroundColor: '#EEF4FF',
    borderWidth: 1,
    borderColor: '#CCDCFF',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  collapsibleHeaderPressed: {
    opacity: 0.85,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  label: {
    flex: 1,
    color: palette.ink,
    fontWeight: '600',
  },
  helperText: {
    color: palette.slate,
    lineHeight: 21,
  },
  feedbackActions: {
    gap: spacing.sm,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  timeRowLabel: {
    color: palette.ink,
    fontWeight: '600',
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeInputButton: {
    minWidth: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#F7F9FD',
  },
  timeSeparator: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 22,
  },
  comboValue: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(11, 23, 38, 0.45)',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(11, 23, 38, 0.45)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    padding: spacing.lg,
    borderRadius: 22,
    backgroundColor: palette.snow,
    gap: spacing.sm,
  },
  modalEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.primary,
    textTransform: 'uppercase',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.ink,
  },
  modalDescription: {
    color: palette.slate,
    lineHeight: 22,
  },
  modalError: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    fontWeight: '600',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  modalSecondaryButton: {
    flex: 1,
    minHeight: 40,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
  },
  modalDangerButton: {
    flex: 1,
    minHeight: 40,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B91C1C',
  },
  modalDangerLabel: {
    color: palette.snow,
    fontWeight: '800',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    maxHeight: '70%',
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: palette.snow,
  },
  sheetEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.primary,
    textTransform: 'uppercase',
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.ink,
  },
  optionList: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  optionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#F7F9FD',
  },
  optionButtonSelected: {
    borderColor: '#CFE0FF',
    backgroundColor: '#EEF4FF',
  },
  optionLabel: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  optionLabelSelected: {
    color: palette.primaryDeep,
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
  },
  primaryButton: {
    minHeight: ACCOUNT_BUTTON_HEIGHT,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C9D9F8',
    backgroundColor: '#E4EDFF',
  },
  primaryLabel: {
    color: palette.primaryDeep,
    fontWeight: '800',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  compactPrimaryButton: {
    minHeight: ACCOUNT_BUTTON_HEIGHT,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C9D9F8',
    backgroundColor: '#E4EDFF',
  },
  compactSectionPrimaryButton: {
    minHeight: ACCOUNT_BUTTON_HEIGHT,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C9D9F8',
    backgroundColor: '#E4EDFF',
  },
  compactPrimaryLabel: {
    color: palette.primaryDeep,
    fontWeight: '800',
  },
  secondaryLabel: {
    color: palette.ink,
    fontWeight: '800',
  },
  compactSecondaryButton: {
    minHeight: ACCOUNT_BUTTON_HEIGHT,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
  },
  syncInfo: {
    color: palette.primaryDeep,
    fontWeight: '700',
    lineHeight: 21,
  },
  syncError: {
    color: palette.danger,
    fontWeight: '700',
    lineHeight: 21,
  },
  dangerButton: {
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
    backgroundColor: '#B91C1C',
  },
  compactDangerButton: {
    minHeight: ACCOUNT_BUTTON_HEIGHT,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B91C1C',
  },
  compactWarningButton: {
    minHeight: ACCOUNT_BUTTON_HEIGHT,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3D19A',
    backgroundColor: '#FFF1D6',
  },
  dangerLabel: {
    color: palette.snow,
    fontWeight: '800',
  },
  warningLabel: {
    color: '#9A6700',
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.6,
  },
});
