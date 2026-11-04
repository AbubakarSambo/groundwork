import { AnthropicService } from './anthropic.service';
import { DEPENDENCY_EXTRACTION_SCHEMA } from './prompt-library';
import { THE_ASSESSMENT_SCHEMA } from './the-assessment';

/**
 * GW-SCHEMA-CONV tripwire.
 *
 * Every structured extraction goes through convertSchema on its way to Gemini.
 * A schema that uses the JSON Schema nullable union form (["string","null"]) used
 * to throw there, and because extraction is fire-and-forget the failure was
 * SILENT: dependency extraction threw on every single check-in, so "waiting on"
 * - the board's stated differentiator - never populated from a real
 * conversation, and nothing surfaced that.
 *
 * These tests convert the REAL shipped schemas, so a new extraction that uses a
 * union type cannot quietly break the same way.
 */
function convert(schema: any) {
  const svc = Object.create(AnthropicService.prototype) as any;
  return svc.convertSchema(schema);
}

describe('GW-SCHEMA-CONV: nullable union types survive conversion', () => {
  it('turns ["string","null"] into a scalar type plus nullable', () => {
    const out = convert({ type: ['string', 'null'], description: 'd' });
    expect(out.type).toBe('STRING');
    expect(out.nullable).toBe(true);
  });

  it('leaves a plain string type alone', () => {
    expect(convert({ type: 'object' }).type).toBe('OBJECT');
    expect(convert({ type: 'string' }).nullable).toBeUndefined();
  });

  it('does not throw on a union type (the actual regression)', () => {
    expect(() => convert({ type: ['integer', 'null'] })).not.toThrow();
    expect(convert({ type: ['integer', 'null'] }).type).toBe('INTEGER');
  });

  it('converts the REAL dependency schema without throwing (tripwire)', () => {
    // This is the one that was silently failing on every check-in.
    expect(() => convert(DEPENDENCY_EXTRACTION_SCHEMA.input_schema)).not.toThrow();
    const out = convert(DEPENDENCY_EXTRACTION_SCHEMA.input_schema);
    const props = out.properties.dependencies.items.properties;
    expect(props.onName.type).toBe('STRING');
    expect(props.onName.nullable).toBe(true);
    expect(props.what.type).toBe('STRING');
    expect(props.status.enum).toEqual(['BLOCKING', 'WAITING', 'CLEARED']);
  });

  /* Changed 2 November 2026: work mentions are read by the conversation's assessment, so its schema is the one that carries them. */
  it('converts the REAL assessment schema, which carries the work mentions, without throwing', () => {
    expect(() => convert((THE_ASSESSMENT_SCHEMA as any).input_schema)).not.toThrow();
  });

  it('preserves enum, required, nested properties and array items', () => {
    const out = convert({
      type: 'object',
      required: ['a'],
      properties: {
        a: { type: 'array', items: { type: 'object', properties: { b: { type: 'string', enum: ['X'] } } } },
      },
    });
    expect(out.required).toEqual(['a']);
    expect(out.properties.a.type).toBe('ARRAY');
    expect(out.properties.a.items.properties.b.enum).toEqual(['X']);
  });
});
