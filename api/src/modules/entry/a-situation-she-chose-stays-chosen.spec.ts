import { EntryService, theSituationSheChose } from './entry.service';

/**
 * A SITUATION THE LEAD CHOSE STAYS CHOSEN (request 35). Live with Gemini: the lead picked "Help
 * someone get back on track", said "Daniel, our sales manager..." and "Once, in July. Not formally.",
 * and the classifier came back DRIFT, so her bar read "Set up as Get a project back on track". What
 * she reads is the situation the endpoint serves; a picked one is served back as it was picked.
 */
/* Changed 22 November 2026: the reading is the schema's fields (extract), not free text (respond). */
function aService(modelSays: Record<string, string>) {
  const s = Object.create(EntryService.prototype) as any;
  s.anthropic = { extract: jest.fn().mockResolvedValue(modelSays) };
  s.prisma = { usageEvent: { create: jest.fn().mockResolvedValue({}) } };
  s.logger = { log: jest.fn(), warn: jest.fn() };
  return s;
}

const HER_WORDS = 'A team member is not delivering and I need to address it. I want to make sure I have the full picture before we talk. Daniel, our sales manager. He joined in July. Once, in July. Not formally.';

describe('the classifier and a situation the lead picked', () => {
  it('serves back the situation she picked, even when the model would say another', async () => {
    const s = aService({ scenario: 'DRIFT', confidence: 'high', kind: 'none' });
    await expect(s.classifyIntent(HER_WORDS, 'look_back', 'PIP')).resolves.toEqual({ scenario: 'PIP', confidence: 'high' });
    expect(s.anthropic.extract).not.toHaveBeenCalled();
  });

  it('still classifies when nothing was picked, or "It\'s something else" was', async () => {
    const s = aService({ scenario: 'DRIFT', confidence: 'high', kind: 'none' });
    await expect(s.classifyIntent(HER_WORDS, 'look_back')).resolves.toEqual({ scenario: 'DRIFT', confidence: 'high' });
    await expect(s.classifyIntent(HER_WORDS, 'look_back', 'other')).resolves.toEqual({ scenario: 'DRIFT', confidence: 'high' });
  });

  it('keeps only a real situation key, never a label or a made-up word', () => {
    expect(theSituationSheChose('PIP')).toBe('PIP');
    expect(theSituationSheChose('Help someone get back on track')).toBeNull();
    expect(theSituationSheChose('other')).toBeNull();
    expect(theSituationSheChose(undefined)).toBeNull();
  });
});
