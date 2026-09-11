import { readFileSync } from 'fs';
import { join } from 'path';
import { API_TERMS_VERSION } from './the-api-terms';

/**
 * A CHANGED TERM IS VISIBLE ON EVERY APPROVAL. The version is stamped at approval and displayed, and
 * nothing compared it with the current one; bump the constant and every approved organisation
 * carried a stale acceptance no code noticed (F15). The row says so now, and the sentence that
 * already prints the version says "terms have changed since".
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

describe('an approval row', () => {
  it('says whether the terms accepted are the terms in force', () => {
    const svc = strip(readFileSync(join(__dirname, 'api-access.service.ts'), 'utf8'));
    expect(svc).toContain('termsOutOfDate: !!r.acceptedTermsAt && r.termsVersion !== API_TERMS_VERSION');
    expect(API_TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('and the page that prints the version prints the change beside it', () => {
    const page = strip(readFileSync(join(__dirname, '..', '..', '..', '..', 'client', 'src', 'pages', 'admin', 'ApiAccessPage.tsx'), 'utf8'));
    expect(page).toMatch(/request\.termsOutOfDate \? ' - terms have changed since\.' : ''/);
    const type = strip(readFileSync(join(__dirname, '..', '..', '..', '..', 'client', 'src', 'api', 'admin.ts'), 'utf8'));
    expect(type).toContain('termsOutOfDate: boolean');
  });
});
