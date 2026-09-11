import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * ANONYMOUS MODEL SPEND IS WRITTEN DOWN. The /start page's FAQ and classifier reach the model for
 * nobody signed in and recorded nothing, so the only evidence of the spend was the bill (F13).
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const service = strip(readFileSync(join(__dirname, 'entry.service.ts'), 'utf8'));

describe('the two anonymous model routes', () => {
  it('each record a usage event before they call the model', () => {
    const faq = service.slice(service.indexOf('async faq('), service.indexOf('async faq(') + 400);
    expect(faq).toContain("this.anonymousModelCall('faq', question.length)");
    const classify = service.slice(service.indexOf('async classifyIntent('), service.indexOf('async classifyIntent(') + 400);
    expect(classify).toContain("this.anonymousModelCall('classify-intent', description.length)");
  });

  it('as their own kind of event, never blocking the answer', () => {
    const write = service.slice(service.indexOf('private anonymousModelCall('), service.indexOf('private anonymousModelCall(') + 500);
    expect(write).toContain('UsageEventType.ANONYMOUS_MODEL_CALL');
    expect(write).toMatch(/void this\.prisma\.usageEvent/);
    expect(write).toContain('.catch(');
  });
});
