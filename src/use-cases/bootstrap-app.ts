import { AppBootstrapData } from '@/src/models/types';
import { getCurrentSession } from '@/src/repositories/auth-repository';
import { loadBootstrapData } from '@/src/repositories/app-repository';

export async function bootstrapAppSession(): Promise<AppBootstrapData | null> {
  const session = await getCurrentSession();

  if (!session?.user) {
    return null;
  }

  return loadBootstrapData(session.user.id);
}