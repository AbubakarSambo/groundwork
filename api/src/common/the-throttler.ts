/**
 * THE ONE THROTTLER, BY NAME.
 *
 * @nestjs/throttler looks a route's limit up under the throttler's NAME. A `@Throttle` keyed to a
 * name nobody registered is not an error - it is never looked up, and the route silently falls back
 * to the registered default. Five decorators said `default` while the registration said `global`,
 * so two webhooks were throttled harder than intended and two public token routes whose own
 * comments said "nothing should be able to sit and try" were not throttled at all (fix plan A9).
 *
 * The name lives here so the registration and a guard can both read it. Decorators still write
 * the key literally - `@Throttle({ global: ... })` - and the guard checks every one of them says
 * this word.
 */
export const THE_THROTTLER = 'global';
