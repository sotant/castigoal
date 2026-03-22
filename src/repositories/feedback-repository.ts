import { FeedbackType } from '@/src/features/feedback/form';
import { normalizeRepositoryError } from '@/src/lib/app-error';
import type { Database } from '@/src/lib/database.types';
import { supabase } from '@/src/lib/supabase';

type SubmitFeedbackInput = {
  affectedSection?: string | null;
  appVersion?: string | null;
  category?: string | null;
  deviceModel?: string | null;
  locale?: string | null;
  message: string;
  platform?: string | null;
  reproductionSteps?: string | null;
  sourceScreen?: string | null;
  subject: string;
  type: FeedbackType;
  userEmail?: string | null;
};

async function getFeedbackSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    return null;
  }

  return session;
}

function toNullableText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export async function submitUserFeedback(input: SubmitFeedbackInput) {
  const session = await getFeedbackSession();

  const payload: Database['public']['Tables']['user_feedback']['Insert'] = {
    affected_section: toNullableText(input.affectedSection),
    app_version: toNullableText(input.appVersion),
    category: toNullableText(input.category),
    device_model: toNullableText(input.deviceModel),
    locale: toNullableText(input.locale),
    message: input.message.trim(),
    platform: toNullableText(input.platform),
    reproduction_steps: toNullableText(input.reproductionSteps),
    source_screen: toNullableText(input.sourceScreen),
    subject: input.subject.trim(),
    type: input.type,
    user_email: toNullableText(input.userEmail) ?? toNullableText(session?.user?.email),
    user_id: session?.user?.id ?? null,
  };

  const { error } = await supabase.from('user_feedback').insert(payload);

  if (error) {
    throw normalizeRepositoryError(error, {
      code: 'FEEDBACK_SUBMIT_FAILED',
      fallback: 'No hemos podido enviar tu mensaje. Intentalo de nuevo.',
    });
  }
}
