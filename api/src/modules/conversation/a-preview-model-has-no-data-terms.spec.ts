/**
 * The model is one environment variable, and Google's Service Specific Terms exclude Pre-GA
 * Offerings from the Cloud Data Processing Addendum:
 *
 *   "no data processing terms (including the Cloud Data Processing Addendum) apply to Pre-GA
 *    Offerings and Customer should not use Pre-GA Offerings to process personal data"
 *
 * So `GEMINI_MODEL=gemini-3.0-pro-preview` would move every check-in in the product outside the
 * data processing terms the privacy page relies on, silently, while everything kept working.
 */
import { whyThisModelIsNotAllowed, MODELS_WE_HAVE_TERMS_FOR } from './a-preview-model-has-no-data-terms';

describe('a preview model has no data terms', () => {
  it('allows the models whose terms have been read', () => {
    for (const m of MODELS_WE_HAVE_TERMS_FOR) expect(whyThisModelIsNotAllowed(m)).toBeNull();
  });

  it('refuses a preview or experimental model', () => {
    for (const m of ['gemini-2.5-pro-preview-06-05', 'gemini-exp-1206', 'gemini-3.0-flash-exp']) {
      expect(whyThisModelIsNotAllowed(m)).toMatch(/Pre-GA/);
    }
  });

  it('refuses anything not on the list, rather than pattern-matching the words Google uses today', () => {
    /* A check that looks for "preview" and "exp" passes on whatever the next suffix is called. */
    expect(whyThisModelIsNotAllowed('some-new-model')).toMatch(/not in MODELS_WE_HAVE_TERMS_FOR/);
  });

  it('refuses an empty configuration rather than falling through', () => {
    expect(whyThisModelIsNotAllowed('')).toMatch(/No model is configured/);
    expect(whyThisModelIsNotAllowed(undefined as any)).toMatch(/No model is configured/);
  });

  it('says why, in terms somebody can act on', () => {
    const said = whyThisModelIsNotAllowed('gemini-9-preview')!;
    expect(said).toMatch(/Cloud Data Processing Addendum/);
    expect(said).toMatch(/after reading the terms for it/);
  });
});

describe('and the service refuses to start on one', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs
    .readFileSync(path.join(__dirname, 'anthropic.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('checks the configured model in the constructor', () => {
    const ctor = src.slice(src.indexOf('constructor(private config'), src.indexOf('private buildClient'));
    expect(ctor).toContain('whyThisModelIsNotAllowed(this.model)');
  });

  it('throws rather than logging, because a warning is read afterwards', () => {
    const ctor = src.slice(src.indexOf('constructor(private config'), src.indexOf('private buildClient'));
    expect(ctor).toMatch(/throw new Error\(`Refusing to start/);
  });
});
