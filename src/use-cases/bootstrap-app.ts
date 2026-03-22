import { getCurrentSession } from '@/src/repositories/auth-repository';
import { bootstrapOnboarding } from '@/src/services/onboarding-service';
import { bootstrapAppSession as bootstrapProgressSession } from '@/src/services/progress-service';

export async function bootstrapAppSession() {
  const [session, progressSnapshot] = await Promise.all([getCurrentSession(), bootstrapProgressSession()]);
  const onboarding = await bootstrapOnboarding(session);

  return {
    ...progressSnapshot,
    onboarding,
    user: {
      ...progressSnapshot.user,
      onboardingCompleted: onboarding.state.isCompleted,
    },
  };
}
