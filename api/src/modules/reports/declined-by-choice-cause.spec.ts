import { REPORT_SCHEMA, SYNTHESIS_RULES } from './reports.service';

/**
 * #probing D (reports side): declined_by_choice is a real, additive
 * specificityCauses value - a refusal must file distinctly from adversarial
 * or unclear, since declining is a choice, not bad faith. Additive only:
 * the existing four values must still all be present.
 */
describe('declined_by_choice specificityCauses value', () => {
  it('is a valid enum value on the report synthesis schema, alongside the original four', () => {
    const causeEnum = (REPORT_SCHEMA as any).input_schema.properties.specificityCauses.items.properties.cause.enum;
    expect(causeEnum).toEqual(
      expect.arrayContaining(['behavioral', 'misunderstanding', 'adversarial', 'unclear', 'declined_by_choice']),
    );
    expect(causeEnum).toHaveLength(5);
  });

  it('the schema description tells the model never to file a genuine decline as adversarial or unclear', () => {
    const description = (REPORT_SCHEMA as any).input_schema.properties.specificityCauses.description;
    expect(description).toMatch(/declined_by_choice/);
    expect(description).toMatch(/never file a genuine decline under adversarial or unclear/i);
  });

  it('SYNTHESIS_RULES rule 11 instructs the same distinction', () => {
    expect(SYNTHESIS_RULES).toMatch(/"declined_by_choice" if the record shows an explicit, stated decline to answer/);
    expect(SYNTHESIS_RULES).toMatch(/a refusal is a choice, never file it as adversarial or unclear/);
  });
});
