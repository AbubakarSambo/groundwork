/**
 * WHERE THE API IS, IN ONE PLACE.
 *
 * The app and the API are separate origins in production and separate ports in development, and
 * three files had each worked that out for themselves - `api/client.ts` for requests, `AuthPage` and
 * `EntryChatPage` for the Google redirect. A fourth place did not work it out at all: the link to
 * the API reference on the Connect page was written as `/api/docs`, which is a relative path.
 *
 * A relative path resolves against the app's own origin, so it went to the React router, which has
 * no such route, and drew the not-found page. Reported as: clicking through to the API key "brings
 * you to an error or nothing's here page". Swagger was fine the whole time; nothing ever pointed at
 * it.
 *
 * In development `VITE_API_URL` is unset and requests go through Vite's proxy, so the origin is
 * empty and a relative path is correct. That is why this only fails in a deployed environment, and
 * why nobody hit it locally.
 */
export const API_ORIGIN: string = import.meta.env.VITE_API_URL ?? '';

/** The Swagger reference, on whichever origin the API is actually served from. */
export const API_DOCS_URL = `${API_ORIGIN}/api/docs`;
