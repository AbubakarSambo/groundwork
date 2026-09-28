/**
 * WHERE THE API LISTENS (Hafsah, 28 September 2026).
 *
 * "Nothing is ever exposed beyond this Mac." A development run on a laptop is narrowed to the
 * machine itself, 127.0.0.1. Every other case - production, any other value, or no value at all -
 * listens exactly as it did before this change, on every address, so no deployed server can become
 * unreachable because of this rule. Only an explicit NODE_ENV of "development" narrows it.
 */
export function theAddressTheApiListensOn(nodeEnv: string | undefined): string {
  return nodeEnv === 'development' ? '127.0.0.1' : '0.0.0.0';
}
