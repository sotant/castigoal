import { AppState, Platform } from 'react-native';
import { createClient, processLock } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import { env } from '@/src/config/env';
import type { Database } from '@/src/lib/database.types';
import { sessionStorage } from '@/src/services/storage';

export const supabase = createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: sessionStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
