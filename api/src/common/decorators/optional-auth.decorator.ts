import { SetMetadata } from '@nestjs/common';

/**
 * A PUBLIC ROUTE THAT STILL KNOWS WHO IS SIGNED IN, IF ANYBODY.
 *
 * `@Public()` made the JWT guard return before passport ran, so `req.user` was always undefined on a
 * public route - and the invite-accept route, which resumes a returning participant's own browser,
 * read `req.user` and always found nobody. Every returning participant was emailed a fresh link and
 * told this was a new device.
 *
 * Not every public route wants this: the Google OAuth callback's `req.user` is the passport Google
 * profile, and running the JWT strategy there would trample it. So it is opted into, route by route,
 * beside `@Public()`: the route stays open to strangers, and a session that happens to exist is read.
 */
export const IS_OPTIONAL_AUTH_KEY = 'isOptionalAuth';
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH_KEY, true);
