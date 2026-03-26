import * as Linking from 'expo-linking';
import { createContext, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Session } from '@supabase/supabase-js';

import { getErrorMessage } from '@/src/lib/app-error';
import { parsePasswordRecoveryLink } from '@/src/lib/auth-deep-links';
import { useAppStore } from '@/src/store/app-store';
import {
  deleteCurrentAccount,
  getCurrentSession,
  setRecoverySession,
  signOut,
  subscribeToAuthChanges,
} from '@/src/repositories/auth-repository';
import {
  getOrCreateProfile,
  mapProfileToLocalUser,
  Profile,
} from '@/src/repositories/profile-repository';

type PasswordRecoveryState = {
  error: string | null;
  hasCheckedInitialUrl: boolean;
  status: 'idle' | 'checking' | 'ready' | 'error';
};

type AuthContextValue = {
  clearPasswordRecovery: () => void;
  deleteAccount: () => Promise<void>;
  isLoading: boolean;
  passwordRecovery: PasswordRecoveryState;
  profile: Profile | null;
  refreshProfile: () => Promise<Profile | null>;
  session: Session | null;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

const initialPasswordRecoveryState: PasswordRecoveryState = {
  error: null,
  hasCheckedInitialUrl: false,
  status: 'idle',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState<PasswordRecoveryState>(initialPasswordRecoveryState);
  const processedRecoveryUrlRef = useRef<string | null>(null);
  const hydrateUser = useAppStore((state) => state.hydrateUser);

  const refreshProfile = useCallback(async () => {
    if (!session) {
      setProfile(null);
      return null;
    }

    const nextProfile = await getOrCreateProfile(session);
    setProfile(nextProfile);
    hydrateUser(mapProfileToLocalUser(nextProfile, session.user.email));
    return nextProfile;
  }, [hydrateUser, session]);

  useEffect(() => {
    let isMounted = true;

    const applySession = async (nextSession: Session | null) => {
      setSession(nextSession);

      if (!nextSession) {
        if (isMounted) {
          setProfile(null);
          setIsLoading(false);
        }
        return;
      }

      const nextProfile = await getOrCreateProfile(nextSession);

      if (!isMounted) {
        return;
      }

      setProfile(nextProfile);
      hydrateUser(mapProfileToLocalUser(nextProfile, nextSession.user.email));
      setIsLoading(false);
    };

    void getCurrentSession().then(async (currentSession) => {
      await applySession(currentSession);
    });

    const subscription = subscribeToAuthChanges((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY' && isMounted) {
        setPasswordRecovery({
          error: null,
          hasCheckedInitialUrl: true,
          status: 'ready',
        });
      }

      setIsLoading(true);
      void applySession(nextSession).catch(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [hydrateUser]);

  useEffect(() => {
    let isMounted = true;

    const markInitialUrlAsChecked = () => {
      if (!isMounted) {
        return;
      }

      setPasswordRecovery((current) =>
        current.hasCheckedInitialUrl
          ? current
          : {
              ...current,
              hasCheckedInitialUrl: true,
            },
      );
    };

    const handleIncomingUrl = async (url: string | null, source: 'initial' | 'event') => {
      if (!url) {
        if (source === 'initial') {
          markInitialUrlAsChecked();
        }
        return;
      }

      const parsedLink = parsePasswordRecoveryLink(url);

      if (!parsedLink) {
        if (source === 'initial') {
          markInitialUrlAsChecked();
        }
        return;
      }

      if (processedRecoveryUrlRef.current === url) {
        if (source === 'initial') {
          markInitialUrlAsChecked();
        }
        return;
      }

      processedRecoveryUrlRef.current = url;

      if (!isMounted) {
        return;
      }

      if (parsedLink.kind === 'error') {
        setPasswordRecovery({
          error: parsedLink.message,
          hasCheckedInitialUrl: true,
          status: 'error',
        });
        return;
      }

      setPasswordRecovery({
        error: null,
        hasCheckedInitialUrl: true,
        status: 'checking',
      });

      try {
        await setRecoverySession(parsedLink.accessToken, parsedLink.refreshToken);

        if (!isMounted) {
          return;
        }

        setPasswordRecovery({
          error: null,
          hasCheckedInitialUrl: true,
          status: 'ready',
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPasswordRecovery({
          error: getErrorMessage(error, 'No se pudo validar el enlace de recuperacion.'),
          hasCheckedInitialUrl: true,
          status: 'error',
        });
      }
    };

    void Linking.getInitialURL()
      .then((url) => handleIncomingUrl(url, 'initial'))
      .catch(() => {
        markInitialUrlAsChecked();
      });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleIncomingUrl(url, 'event');
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const deleteAccount = useCallback(async () => {
    await deleteCurrentAccount();
    setSession(null);
    setProfile(null);
    setIsLoading(false);
  }, []);

  const clearPasswordRecovery = useCallback(() => {
    setPasswordRecovery({
      error: null,
      hasCheckedInitialUrl: true,
      status: 'idle',
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      clearPasswordRecovery,
      deleteAccount,
      isLoading,
      passwordRecovery,
      profile,
      refreshProfile,
      session,
      signOut,
    }),
    [clearPasswordRecovery, deleteAccount, isLoading, passwordRecovery, profile, refreshProfile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
