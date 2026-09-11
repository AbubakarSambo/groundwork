import { ConfigService } from '@nestjs/config';

/**
 * THE SECRET IS SET, OR THE PROCESS SAYS SO AND STOPS.
 *
 * configuration.ts fell back to the literal "super-secret-key", and two further "fallback-secret"
 * literals sat behind it, unreachable; the production boot gate refused the first literal only when
 * NODE_ENV was production. So a staging or a misconfigured deploy signed every session with a string
 * in the repository, silently (fix plan B16, P2-027). Absence is visible in every environment now.
 */
export function theJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('jwt.secret');
  if (!secret || secret === 'super-secret-key' || secret === 'fallback-secret') {
    throw new Error('JWT_SECRET is not set. Put a long random value in the environment; there is no default.');
  }
  return secret;
}
