import { bootstrapAppSession as bootstrapProgressSession } from '@/src/services/progress-service';

export async function bootstrapAppSession() {
  return bootstrapProgressSession();
}
