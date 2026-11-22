import { GroundScenario } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { theClassifierPrompt, readTheClassification, PRECEDENCE_RULE, THE_CLASSIFICATION_SCHEMA } from './which-situation-this-is';

/**
 * A NEW HIRE IN TROUBLE IS STILL A NEW HIRE. The classifier sent "a new hire six weeks in who is not
 * settling, inside a six-month probation" to PIP, and the words of a performance process went around
 * somebody's onboarding. The rule is in the prompt as a rule; the answer carries a confidence; below
 * the bar nothing is guessed.
 */
describe('the prompt', () => {
  it('states the precedence as a rule, and asks for confidence', () => {
    const p = theClassifierPrompt('a new hire six weeks in who is not settling, inside a six-month probation');
    expect(p).toContain(PRECEDENCE_RULE);
    expect(PRECEDENCE_RULE).toMatch(/^RULE, not a hint/);
    /* Changed 22 November 2026: the answer is the schema's fields, not a JSON line the prompt spells out. */
    expect(THE_CLASSIFICATION_SCHEMA.input_schema.properties.confidence.enum).toEqual(['high', 'low']);
    expect(p).toContain('A wrong answer given as "high" is worse than "low"');
  });
});

describe('the scenarios the classifier can name', () => {
  it('names every scenario the product has, so none can be reached only by clicking a card', () => {
    const p = theClassifierPrompt('Our finance manager leaves in three weeks and I want what is in her head written down');
    for (const key of Object.values(GroundScenario)) expect(p).toContain(`${key} - `);
  });
  it('tells the model that thin input is low confidence, so the conversation can ask instead of guessing', () => {
    expect(theClassifierPrompt('My team is not happy')).toMatch(/too thin to tell/);
  });
});

/* Changed 22 November 2026: the model answers by the schema's fields, so the reader is given those fields, not free text. */
describe('reading the answer', () => {
  it('a confident answer is the scenario', () => {
    expect(readTheClassification({ scenario: 'NEW_HIRE', confidence: 'high', kind: 'none' })).toEqual({ scenario: 'NEW_HIRE', confidence: 'high' });
    expect(readTheClassification({ scenario: 'PIP', confidence: 'high', kind: 'none' })).toEqual({ scenario: 'PIP', confidence: 'high' });
  });
  it('a low-confidence answer is no scenario, so the flow asks rather than guesses', () => {
    expect(readTheClassification({ scenario: 'PIP', confidence: 'low', kind: 'none' })).toEqual({ scenario: null, confidence: 'low' });
  });
  it('an answer that is not a scenario is no answer', () => {
    expect(readTheClassification({ scenario: 'SOMETHING_ELSE', confidence: 'high', kind: 'none' })).toBeNull();
    expect(readTheClassification(null)).toBeNull();
  });
  it('a new hire has no kind of work, whatever work they will do', () => {
    expect(PRECEDENCE_RULE).toContain('A new hire\'s check-in is about that person, so it has no kind of work, whatever work they will do and wherever they will do it.');
  });
});

describe('the flow', () => {
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  it('the service reads through the one reader and the client keeps the card on a null answer', () => {
    expect(strip(readFileSync(join(__dirname, 'entry.service.ts'), 'utf8'))).toMatch(/readTheSituationAndTheKind\(this\.anthropic, description, mode\)/); /* Changed 22 November 2026: the one reading, shared by every path. */
    const page = strip(readFileSync(join(__dirname, '..', '..', '..', '..', 'client', 'src', 'pages', 'enter', 'EntryChatPage.tsx'), 'utf8'));
    expect(page).toMatch(/if \(sure\) setOnboardingSelections/);
  });
});
