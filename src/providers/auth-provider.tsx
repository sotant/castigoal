import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Session } from '@supabase/supabase-js';

import { useAppStore } from '@/src/store/app-store';
import {
  deleteCurrentAccount,
  getCurrentSession,
  signOut,
  subscribeToAuthChanges,
} from '@/src/repositories/auth-repository';
import {
  getOrCreateProfile,
  mapProfileToLocalUser,
  Profile,
} from '@/src/repositories/profile-repository';

type AuthContextValue = {
  deleteAccount: () => Promise<void>;
  isLoading: boolean;
  profile: Profile | null;
  refreshProfile: () => Promise<Profile | null>;
  session: Session | null;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const clearRemoteState = useAppStore((state) => state.clearRemoteState);
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

    const subscription = subscribeToAuthChanges((_event, nextSession) => {
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

  const deleteAccount = useCallback(async () => {
    await deleteCurrentAccount();
    setSession(null);
    setProfile(null);
    setIsLoading(false);
    clearRemoteState();
  }, [clearRemoteState]);

  const value = useMemo<AuthContextValue>(
    () => ({
      deleteAccount,
      isLoading,
      profile,
      refreshProfile,
      session,
      signOut,
    }),
    [deleteAccount, isLoading, profile, refreshProfile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
