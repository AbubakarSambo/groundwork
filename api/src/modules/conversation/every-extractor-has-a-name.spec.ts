import * as lib from './prompt-library';

/**
 * EVERY EXTRACTOR SCHEMA IS A NAMED TOOL.
 *
 * Five schemas were exported as bare JSON schemas and passed to extract() "as any". Gemini needs a
 * function name, convertTool() throws without one, and so the coaching observation, operating
 * differences, what-they-say-happened, progress and own-promise extractors had never once succeeded:
 * interactions 0, proposed changes 0, coaching_states 0, for as long as they existed. The "as any"
 * was the tell. This reads every exported *_SCHEMA so the next one cannot ship bare.
 */
describe('every extractor schema is a named tool', () => {
  const schemas = Object.entries(lib).filter(([k, v]) => /_SCHEMA$/.test(k) && v && typeof v === 'object');
  it('finds the schemas', () => {
    expect(schemas.length).toBeGreaterThan(5);
  });
  for (const [k, v] of schemas) {
    it(`${k} has a name, a description and an input_schema`, () => {
      const tool = v as any;
      expect(typeof tool.name).toBe('string');
      expect(tool.name.trim().length).toBeGreaterThan(0);
      expect(typeof tool.description).toBe('string');
      expect(tool.input_schema?.type).toBe('object');
    });
  }
});
