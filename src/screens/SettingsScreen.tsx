import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { EmptyState } from '@/src/components/EmptyState';
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

export function SettingsScreen() {
  const { deleteAccount, signOut, session } = useAuth();
  const { resetApp, retrySync, sessionState, settings, updateSettings, user } = useAppStore(
    useShallow((state) => ({
      resetApp: state.resetApp,
      retrySync: state.retrySync,
      sessionState: state.sessionState,
      settings: state.userSettings,
      updateSettings: state.updateSettings,
      user: state.user,
    })),
  );
  const [openField, setOpenField] = useState<TimeField | null>(null);
  const [accountAction, setAccountAction] = useState<'delete' | 'signout' | null>(null);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

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
    } catch (error) {
      setDeleteAccountError(getErrorMessage(error));
    } finally {
      setAccountAction(null);
    }
  };

  const isAuthenticated = sessionState.mode === 'authenticated' && Boolean(session);
  const isSyncing = sessionState.syncStatus === 'syncing';
  const hasSyncError = sessionState.syncStatus === 'error' && Boolean(sessionState.syncError);

  return (
    <ScreenContainer title="Ajustes" subtitle="Cuenta, recordatorios y mantenimiento con el nuevo look visual.">
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

      {!isAuthenticated ? (
        <View style={styles.ctaCard}>
          <Text style={styles.sectionTitle}>Guardar tu progreso</Text>
          <Text style={styles.helperText}>
            Crea una cuenta para guardar tu progreso y recuperarlo cuando quieras. Mientras tanto, todo sigue
            guardado en este dispositivo.
          </Text>
          <Pressable
            onPress={() => router.push({ pathname: appRoutes.auth, params: { returnTo: appRoutes.settings } })}
            style={styles.primaryButton}>
            <Text style={styles.primaryLabel}>Crear cuenta</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: appRoutes.auth, params: { returnTo: appRoutes.settings } })}
            style={styles.secondaryButton}>
            <Text style={styles.secondaryLabel}>Login</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cuenta activa</Text>
          <Text style={styles.helperText}>
            Tu progreso esta vinculado a {user.name || session?.user.email || 'tu cuenta'}.
          </Text>
          {isSyncing ? <Text style={styles.syncInfo}>Estamos guardando tu progreso en tu cuenta...</Text> : null}
          {sessionState.syncStatus === 'idle' ? (
            <Text style={styles.syncSuccess}>Tu progreso se ha guardado correctamente.</Text>
          ) : null}
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
        </View>
      )}

      <View style={styles.card}>
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
        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.comboLabel}>Hora</Text>
            <Pressable onPress={() => setOpenField('hour')} style={styles.comboButton}>
              <Text style={styles.comboValue}>{String(selectedHour).padStart(2, '0')}</Text>
            </Pressable>
          </View>
          <View style={styles.half}>
            <Text style={styles.comboLabel}>Minuto</Text>
            <Pressable onPress={() => setOpenField('minute')} style={styles.comboButton}>
              <Text style={styles.comboValue}>{String(selectedMinute).padStart(2, '0')}</Text>
            </Pressable>
          </View>
        </View>
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

      <EmptyState
        title="Reset de demo"
        message="Borra objetivos, check-ins y castigos del contenedor local actual. Si tienes cuenta, la sincronizacion replicara el reset."
        actionLabel="Vaciar datos"
        onAction={() => {
          void resetApp();
        }}
      />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Privacidad y cuenta</Text>
        <Text style={styles.helperText}>
          Desde aqui puedes revisar la politica de privacidad y eliminar la cuenta completa para cumplir con Google Play.
        </Text>

        <Pressable onPress={() => router.push(appRoutes.privacy)} style={styles.secondaryButton}>
          <Text style={styles.secondaryLabel}>Ver politica de privacidad</Text>
        </Pressable>

        {isAuthenticated ? (
          <Pressable
            disabled={accountAction === 'delete'}
            onPress={handleDeleteAccount}
            style={[styles.dangerButton, accountAction === 'delete' && styles.disabled]}>
            <Text style={styles.dangerLabel}>
              {accountAction === 'delete' ? 'Borrando cuenta...' : 'Eliminar cuenta'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {isAuthenticated ? (
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
          style={[styles.secondaryButton, accountAction === 'signout' && styles.disabled]}>
          <Text style={styles.secondaryLabel}>
            {accountAction === 'signout' ? 'Cerrando sesion...' : 'Cerrar sesion'}
          </Text>
        </Pressable>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: 20,
    backgroundColor: palette.snow,
    borderWidth: 1,
    borderColor: palette.line,
    gap: spacing.sm,
  },
  ctaCard: {
    padding: spacing.lg,
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
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  half: {
    flex: 1,
  },
  comboLabel: {
    marginBottom: spacing.xs,
    color: palette.slate,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  comboButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: '#F7F9FD',
  },
  comboValue: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
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
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.snow,
  },
  modalDangerButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
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
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
    backgroundColor: palette.primary,
  },
  primaryLabel: {
    color: palette.snow,
    fontWeight: '800',
  },
  secondaryLabel: {
    color: palette.ink,
    fontWeight: '800',
  },
  syncInfo: {
    color: palette.primaryDeep,
    fontWeight: '700',
    lineHeight: 21,
  },
  syncSuccess: {
    color: palette.success,
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
  dangerLabel: {
    color: palette.snow,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.6,
  },
});
