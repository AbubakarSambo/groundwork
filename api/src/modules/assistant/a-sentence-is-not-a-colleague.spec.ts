import { looksLikeAName } from './assistant.service';

/**
 * A REQUEST TO ADD NOTES, READ BACK AS A MISSING COLLEAGUE (screens request 154, item 2).
 *
 * Juma asked about looking after people while the road was closed, and read:
 *
 *   I do not have anybody called "looking after them while the road is closed. ...".
 *   I only know the people your organisation has sent me.
 *
 * `whoIs` echoed whatever it was handed. The router putting him there is worth fixing too, but
 * the damage is done at the echo, which is where it is held: anything that cannot be a name is
 * something we did not understand, not somebody we failed to find.
 */
describe('a sentence is not a colleague', () => {
  it('turns down the sentence that actually caused this', () => {
    expect(looksLikeAName('looking after them while the road is closed. I want to add that')).toBe(false);
  });

  it('still takes the names people really type', () => {
    for (const name of ['Juma', 'Juma Kariuki', 'Ada', 'Mary Jane Watson', 'de Souza', 'Ngozi']) {
      expect(looksLikeAName(name)).toBe(true);
    }
  });

  it('turns down anything with a sentence inside it, however short', () => {
    for (const notAName of ['who is on call?', 'Juma, Ada and Ngozi', 'add this: a note', 'Help!']) {
      expect(looksLikeAName(notAName)).toBe(false);
    }
  });

  it('turns down something far too long to be a name', () => {
    expect(looksLikeAName('the person who looks after the warehouse on the days when the road is closed')).toBe(false);
  });

  it('turns down nothing at all', () => {
    expect(looksLikeAName('')).toBe(false);
    expect(looksLikeAName('   ')).toBe(false);
  });
});

/**
 * "HELLO, WHO IS THIS?" (release test 21 November, 93). Halima's first message on WhatsApp was answered 'I do not know anyone called "this". I only know the
 * people your organisation has sent me.' The rules read every "who is X" as a lookup of a colleague called X. Now a "who is X" stays a lookup only when
 * somebody here is called X; anything else is read by the model, like any message the rules do not place.
 */
describe('"who is ..." is a lookup only of somebody who is here', () => {
  const { askGroundwork, textOf } = require('./request-92-harness');
  const PEOPLE = [{ externalId: 'amani', userName: 'amani', displayName: 'Amani Wekesa', title: 'Account manager', department: 'Sales', managerExternalId: null }];
  const anAsk = (meaning: Record<string, any>) => {
    const engine = { extract: jest.fn(async (prompt: string, h: any[]) => (/^You read one message/.test(prompt) ? meaning[String(h[0].content).split('\n')[0]] ?? { kind: 'other' } : null)) };
    const h = askGroundwork({ userId: 'u-1', engine });
    h.prisma.person.findMany = jest.fn(async () => PEOPLE);
    return { ...h, engine, say: async (m: string) => textOf(await h.service.respond('org-a', 'p1', m)) };
  };

  it('"hello, who is this?" is read by the model, and nobody is said to be missing', async () => {
    const said = 'hello, who is this?';
    const a = anAsk({ [said]: { kind: 'question' } });
    const documents = jest.spyOn(a.service as any, 'aQuestionAnsweredFromTheDocuments').mockResolvedValue({ lane: 'answer_from_documents', composedBy: 'rules', blocks: [{ type: 'text', body: 'I am Groundwork, the assistant your organisation set up for you.' }] });
    const t = await a.say(said);
    console.log(`SHE TYPES\n${said}\nSHE READS\n${t}`);
    expect(t).not.toMatch(/anybody called|anyone called|only know the people/);
    expect(a.engine.extract).toHaveBeenCalled();
    expect(documents).toHaveBeenCalled();
  });

  it('"who is Amani?" is still the roster lookup, with no model', async () => {
    const a = anAsk({});
    const t = await a.say('who is Amani?');
    expect(t).toBe('Amani Wekesa, Account manager, in Sales. No reporting line has been sent for them.');
  });
});
