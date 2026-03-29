import { Session } from '@supabase/supabase-js';

import { errorCopy } from '@/src/i18n/errors';
import { normalizeRepositoryError } from '@/src/lib/app-error';
import { Tables } from '@/src/lib/database.types';
import { supabase } from '@/src/lib/supabase';
import { User } from '@/src/models/types';

export type Profile = Tables<'profiles'>;

export function mapProfileToLocalUser(profile: Profile, email?: string | null): User {
  return {
    id: profile.id,
    name: profile.display_name ?? email?.split('@')[0] ?? 'Usuario',
    onboardingCompleted: profile.onboarding_completed,
    createdAt: profile.created_at,
  };
}

export async function getOrCreateProfile(session: Session): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: errorCopy.profile.loadFailed,
      code: 'PROFILE_LOAD_FAILED',
      fallback: errorCopy.profile.loadFailed,
    });
  }

  if (data) {
    return data;
  }

  const { data: createdProfile, error: upsertError } = await supabase
    .from('profiles')
    .upsert({ id: session.user.id }, { onConflict: 'id' })
    .select('*')
    .single();

  if (upsertError) {
    throw normalizeRepositoryError(upsertError, {
      authMessage: errorCopy.profile.createFailed,
      code: 'PROFILE_CREATE_FAILED',
      fallback: errorCopy.profile.createFailed,
    });
  }

  return createdProfile;
}

export async function completeProfileOnboarding(userId: string, displayName: string) {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId,
      display_name: displayName,
      onboarding_completed: true,
    },
    { onConflict: 'id' },
  );

  if (error) {
    throw normalizeRepositoryError(error, {
      authMessage: errorCopy.profile.saveOnboardingFailed,
      code: 'PROFILE_ONBOARDING_FAILED',
      fallback: errorCopy.profile.saveOnboardingFailed,
    });
  }
}
