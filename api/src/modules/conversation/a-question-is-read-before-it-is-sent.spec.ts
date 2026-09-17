import { whatTheReaderSees, whatTheReaderDecided, theTailOf, READ_IT_AS_THEY_WILL, THE_LAST_FEW_TURNS } from './a-question-is-read-before-it-is-sent';

/**
 * "HE ALREADY SAID HE IS WORKING TOWARDS 40 SHOPS, IT IS CONFUSING TO SAY WHAT IS THE NUMBER AGAIN."
 *
 * The sentence that produced this: "To start, what is the number you are working towards for these
 * 40 shops, and by when do you expect to hit that number?" - sent to somebody whose first message
 * was "I want 40 shops in Kano stocking our tea by the end of Q4."
 *
 * Nothing here could catch it. Every existing check reads the SHAPE of a reply. That sentence is
 * well formed, one question, the right length, names nobody, ends on a question mark, and is
 * incoherent. The fault is in what it means, and meaning needs a reader.
 */
describe('a question is read before it is sent', () => {
  it('the reader is shown the conversation and the draft, and nothing about us', () => {
    const seen = whatTheReaderSees({
      said: [
        { role: 'person', text: 'I want 40 shops in Kano by the end of Q4.' },
        { role: 'product', text: 'Who is carrying which part of that?' },
      ],
      draft: 'What is the number you are working towards for these 40 shops?',
    });
    expect(seen).toContain('THEM: I want 40 shops in Kano by the end of Q4.');
    expect(seen).toContain('US: Who is carrying which part of that?');
    expect(seen).toContain('ABOUT TO SEND:');
    /* No engine rules, no scenario pack, no mention of the product: a reader holding the same
       eighteen thousand words that wrote the draft is the reader that has failed every time. */
    expect(seen).not.toMatch(/Groundwork|ENGINE|scenario|check-in is about/i);
  });

  it('asks her five questions, in her order', () => {
    expect(READ_IT_AS_THEY_WILL).toMatch(/1\. DOES IT FOLLOW\?/);
    expect(READ_IT_AS_THEY_WILL).toMatch(/2\. DOES IT ASK FOR SOMETHING THEY HAVE ALREADY GIVEN\?/);
    expect(READ_IT_AS_THEY_WILL).toMatch(/3\. WOULD A PERSON SAY IT OUT LOUD\?/);
    expect(READ_IT_AS_THEY_WILL).toMatch(/4\. IF IT ASKS FOR SOMETHING ABSTRACT/);
    expect(READ_IT_AS_THEY_WILL).toMatch(/5\. DOES IT NEED A LINE SAYING WHY IT IS WORTH ANSWERING\?/);
  });

  it('and may rewrite, which no guard in this codebase can do', () => {
    expect(READ_IT_AS_THEY_WILL).toMatch(/reply with the message as it should be sent/);
    expect(READ_IT_AS_THEY_WILL).toMatch(/Ask for the same thing the draft was asking for/);
    expect(READ_IT_AS_THEY_WILL).toMatch(/Never add one/);
  });

  it('KEEP leaves the draft exactly as it was', () => {
    const draft = 'What is stopping you from telling them today?';
    expect(whatTheReaderDecided('KEEP', draft)).toEqual({ text: draft, changed: false });
    expect(whatTheReaderDecided('  keep  ', draft)).toEqual({ text: draft, changed: false });
    expect(whatTheReaderDecided('', draft)).toEqual({ text: draft, changed: false });
  });

  it('a rewrite is taken', () => {
    const out = whatTheReaderDecided('You have the 40. Who is carrying which part of it?', 'What is the number for these 40 shops?');
    expect(out.changed).toBe(true);
    expect(out.text).toBe('You have the 40. Who is carrying which part of it?');
  });

  it('but a reader explaining itself is ignored, and so is an essay', () => {
    const draft = 'What is the number for these 40 shops?';
    for (const waffle of [
      'The message asks for something she already said.',
      'I would rewrite this as: who carries which part?',
      'Here is a better version. Who carries which part?',
      'One. Two. Three. Four. Five.',
    ]) {
      expect(whatTheReaderDecided(waffle, draft).text).toBe(draft);
    }
  });

  it('and it reads the last few turns, not the whole history', () => {
    expect(THE_LAST_FEW_TURNS).toBe(6);
    const many = Array.from({ length: 20 }, (_, i) => ({ role: 'person' as const, text: `turn ${i}` }));
    expect(theTailOf(many)).toHaveLength(6);
    expect(theTailOf(many)[5].text).toBe('turn 19');
  });
});

/*
 * AND IT IS THE LAST THING ON BOTH PATHS, NOT ONE OF THEM.
 *
 * Three times in two days a fix sat on a path nobody takes. The entry flow is the conversation
 * every lead meets first and the signed-in check-in is every conversation after it.
 */
describe('the reader runs last, on both paths', () => {
  const read = (f: string) => require('fs')
    .readFileSync(require('path').join(__dirname, f), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const CHECKIN = read('conversation.service.ts');
  const ENTRY = require('fs')
    .readFileSync(require('path').join(__dirname, '..', 'entry', 'entry.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('the check-in reads the draft after every other guard has had it', () => {
    const readAt = CHECKIN.indexOf('await this.readBeforeSending(history, reply, theirWords)');
    expect(readAt).toBeGreaterThan(-1);
    /* After the last of the nine, which is the words-we-do-not-use pass. */
    expect(readAt).toBeGreaterThan(CHECKIN.indexOf('const notOurWords = wordsWeDoNotUse'));
  });

  it('and the entry path reads it as the last thing before it returns', () => {
    const readAt = ENTRY.indexOf('await this.readBeforeSending(messages, forHumans(best), personSaid)');
    expect(readAt).toBeGreaterThan(-1);
    expect(ENTRY.slice(readAt, readAt + 200)).toMatch(/return \{ reply: read, closed: hadCloseMarker\(best\) \}/);
  });

  it('a rewrite that invents something is refused on both', () => {
    for (const src of [CHECKIN, ENTRY]) {
      expect(src).toMatch(/if \(clean\.hits\.length \|\| !clean\.text\.trim\(\)\)/);
      expect(src).toMatch(/rewrite added something nobody said; the draft stands/);
    }
  });

  it('and a reader that cannot be reached never costs the reply', () => {
    for (const src of [CHECKIN, ENTRY]) expect(src).toMatch(/catch \(err: any\) \{[\s\S]{0,200}return draft;/);
  });
});

/*
 * AND THE READER CAN SEE WHAT SETUP SETTLED, WITHOUT WHICH CHECK 2 IS BLIND.
 *
 * Read live with the reader running: it passed "Forty shops in Kano by the end of Q4. And for this
 * goal, who else needs to be involved in making that happen?" to somebody who had named Sahar and
 * Amina one screen earlier. The check-in is a new conversation and setup was not in it.
 */
describe('the reader knows what was settled before the conversation', () => {
  it('puts it in front of the transcript, marked as answered', () => {
    const seen = whatTheReaderSees({
      said: [{ role: 'person', text: 'I literally just told you.' }],
      draft: 'Who else needs to be involved?',
      alreadySettled: ['Sahar and Amina each need their own number', '40 shops in Kano by the end of Q4'],
    });
    expect(seen).toMatch(/ALL OF IT COUNTS AS ANSWERED/);
    expect(seen).toContain('- Sahar and Amina each need their own number');
    /* And it still comes before the draft, which is the last thing the reader sees. */
    expect(seen.indexOf('ALL OF IT COUNTS AS ANSWERED')).toBeLessThan(seen.indexOf('ABOUT TO SEND'));
  });

  it('and says nothing extra when there is nothing settled yet', () => {
    const seen = whatTheReaderSees({ said: [{ role: 'person', text: 'hi' }], draft: 'What is happening?' });
    expect(seen).not.toMatch(/ALREADY TOLD US/);
    expect(seen.startsWith('CONVERSATION SO FAR')).toBe(true);
  });

  it('and both paths hand it over', () => {
    const entry = require('fs').readFileSync(require('path').join(__dirname, '..', 'entry', 'entry.service.ts'), 'utf8');
    const checkin = require('fs').readFileSync(require('path').join(__dirname, 'conversation.service.ts'), 'utf8');
    expect(entry).toMatch(/whatTheReaderSees\(\{ said, draft, alreadySettled: personSaid \}\)/);
    expect(checkin).toMatch(/whatTheReaderSees\(\{ said, draft, alreadySettled: theirWords \}\)/);
  });
});
