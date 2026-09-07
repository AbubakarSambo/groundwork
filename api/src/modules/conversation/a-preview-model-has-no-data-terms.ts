/**
 * A PREVIEW MODEL SITS OUTSIDE THE DATA PROCESSING TERMS.
 *
 * Google's Service Specific Terms say this about Pre-GA Offerings, in as many words:
 *
 *   "Except as otherwise expressly indicated in a written notice or Google documentation, no data
 *    processing terms (including the Cloud Data Processing Addendum) apply to Pre-GA Offerings and
 *    Customer should not use Pre-GA Offerings to process personal data or other data subject to
 *    legal or regulatory compliance requirements."
 *
 * The model is configurable — `GEMINI_MODEL`, defaulting to `gemini-2.5-pro`. So a one-line
 * environment change to a preview or experimental model would move every check-in in the product
 * outside the Cloud Data Processing Addendum, silently, while everything kept working. That is a
 * bigger change than it looks: check-ins carry personal data by definition, and the marketing site
 * makes a public claim about how providers may use it.
 *
 * Google's no-training commitment is stated to cover GA and pre-GA models alike, so this is not
 * about training. It is about the DPA, which is the instrument the rest of the promise rests on.
 *
 * A named list rather than a pattern: "preview" and "exp" are the suffixes Google happens to use
 * today, and a check that only looks for those would pass on whatever it calls the next one. So the
 * models we have decided are in-scope are written down, and anything else has to be added here
 * deliberately — by somebody who has read the terms for it.
 */

/** Models this deployment is permitted to call, because their terms have been read. */
export const MODELS_WE_HAVE_TERMS_FOR = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
] as const;

export function whyThisModelIsNotAllowed(model: string): string | null {
  const named = (model ?? '').trim();
  if (!named) return 'No model is configured.';
  if ((MODELS_WE_HAVE_TERMS_FOR as readonly string[]).includes(named)) return null;
  return (
    `"${named}" is not in MODELS_WE_HAVE_TERMS_FOR. Preview and experimental models are Pre-GA ` +
    `Offerings, and Google's Service Specific Terms exclude Pre-GA Offerings from the Cloud Data ` +
    `Processing Addendum — so pointing the product at one moves every check-in outside the data ` +
    `processing terms the privacy page relies on. Add it here only after reading the terms for it.`
  );
}
