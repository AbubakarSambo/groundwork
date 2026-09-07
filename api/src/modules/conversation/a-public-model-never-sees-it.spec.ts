/**
 * THE ONE CONFIGURATION A PUBLIC PRIVACY CLAIM RESTS ON.
 *
 * The marketing site tells customers that the AI providers Groundwork uses do not learn from their
 * data. Everything about whether that is true sits in a single flag: `vertexai: true` selects
 * Google Cloud's **Vertex AI**, whose terms differ from the consumer Gemini API at
 * `generativelanguage.googleapis.com` — and the consumer one is the one that may use submitted data
 * to improve Google's products.
 *
 * That flag is one word in a constructor. Somebody could drop it while chasing a local
 * authentication problem, everything would keep working, every test would pass, and a published
 * promise would silently become false. So it is asserted here, along with the two other ways the
 * claim could quietly stop being true: an API-key path appearing, or a second provider's SDK
 * arriving in the tree.
 *
 * See PRIVACY-AND-AI-AUDIT.md. If any of these fail, the marketing claim has to come down before
 * the code goes out.
 */
import * as fs from 'fs';
import * as path from 'path';

const apiRoot = path.join(__dirname, '..', '..', '..');
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function everySource(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) everySource(full, out);
    else if (e.name.endsWith('.ts') && !e.name.includes('.spec.')) out.push(full);
  }
  return out;
}

const sources = everySource(path.join(apiRoot, 'src'));
const allCode = sources.map((f) => strip(fs.readFileSync(f, 'utf8'))).join('\n');

describe('every AI call goes through Vertex, not the consumer API', () => {
  it('found the source tree, so this cannot pass by reading nothing', () => {
    expect(sources.length).toBeGreaterThan(100);
  });

  it('every GoogleGenAI client is constructed with vertexai: true', () => {
    const clients = [...allCode.matchAll(/new GoogleGenAI\(\{[\s\S]{0,400}?\}\)/g)].map((m) => m[0]);
    expect(clients.length).toBeGreaterThan(0);
    for (const c of clients) {
      /* A client without this flag is the CONSUMER API, whose terms are different. */
      expect(c).toContain('vertexai: true');
    }
  });

  it('and none is constructed with an API key, which is the consumer path', () => {
    const clients = [...allCode.matchAll(/new GoogleGenAI\(\{[\s\S]{0,400}?\}\)/g)].map((m) => m[0]);
    for (const c of clients) expect(c).not.toMatch(/apiKey/);
    expect(allCode).not.toMatch(/GEMINI_API_KEY|GOOGLE_API_KEY/);
  });

  it('nothing addresses the consumer endpoint directly', () => {
    expect(allCode).not.toContain('generativelanguage.googleapis.com');
  });
});

describe('and no second provider can be reached', () => {
  it('no code imports another provider SDK', () => {
    for (const sdk of ['@anthropic-ai/sdk', 'openai', '@mistralai', 'cohere-ai', 'replicate']) {
      expect({ sdk, imported: allCode.includes(`from '${sdk}'`) }).toEqual({ sdk, imported: false });
    }
  });

  it('and none is installed, because an unused provider SDK is a path somebody takes by accident', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(apiRoot, 'package.json'), 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const sdk of ['@anthropic-ai/sdk', 'openai', 'cohere-ai', 'replicate', '@google-cloud/vertexai']) {
      expect({ sdk, installed: Object.keys(deps).includes(sdk) }).toEqual({ sdk, installed: false });
    }
  });

  it('nothing posts to a provider endpoint by hand', () => {
    for (const host of ['api.openai.com', 'api.anthropic.com', 'api.cohere.ai']) {
      expect(allCode).not.toContain(host);
    }
  });
});

describe('and nothing trains anything on customer data', () => {
  it('there is no fine-tuning or training path', () => {
    for (const word of ['fine-tune', 'finetune', 'fineTuning', 'createFineTune', 'trainModel']) {
      expect(allCode.toLowerCase()).not.toContain(word.toLowerCase());
    }
  });
});

describe('and no log line carries what somebody wrote', () => {
  /*
   * Four lines did: up to 120 characters of a quoted phrase, the person's own shortened words, and
   * invented causal claims, on the check-in and entry paths. A log is staff-readable, which makes
   * it the same disclosure as a screen.
   */
  it('the conversation and entry paths log counts, not text', () => {
    for (const gone of [
      'misquoted[0].slice',
      '${truncated.join',
      '${invented.join',
    ]) {
      expect({ gone, stillThere: allCode.includes(gone) }).toEqual({ gone, stillThere: false });
    }
  });

  it('and a WhatsApp body is only logged outside production', () => {
    const whatsapp = strip(fs.readFileSync(path.join(apiRoot, 'src', 'modules', 'whatsapp', 'whatsapp.service.ts'), 'utf8'));
    const at = whatsapp.indexOf('[DEV WHATSAPP]');
    expect(at).toBeGreaterThan(-1);
    /* The branch it sits in must be about the environment, not about whether the channel is on. */
    expect(whatsapp.slice(Math.max(0, at - 400), at)).toContain("process.env.NODE_ENV === 'production'");
  });
});
