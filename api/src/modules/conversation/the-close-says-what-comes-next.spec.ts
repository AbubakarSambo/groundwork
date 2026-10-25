import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { endingOnTheClose, endsOnTheClose, THE_CLOSE, THE_CLOSE_ON } from './the-close-says-what-comes-next';

/* What a person reads at the end of a check-in (task 2.7). The prototype: check-in-end-card.txt. */

describe('the close, as a person reads it', () => {
  /* docs/prototype/ is not tracked by git, so this runs only where the prototype's text exists. */
  const PROTOTYPE_CLOSE = join(__dirname, '../../../../docs/prototype/screens/B3-the-check-in/check-in-end-card.txt');
  (existsSync(PROTOTYPE_CLOSE) ? it : it.skip)("is the prototype's sentences, word for word", () => {
    const proto = readFileSync(PROTOTYPE_CLOSE, 'utf8');
    expect(proto).toContain(THE_CLOSE);
  });

  it("the reviewer's closes: never says the report is ready, and ends on the prototype's sentences", () => {
    expect(endingOnTheClose('Your report is ready now. Speak soon.')).toBe(THE_CLOSE);
    expect(endingOnTheClose('Thank you, Femi. You said you will call Tobi by Friday. Your report is ready now. Speak soon.'))
      .toBe(`Thank you, Femi. You said you will call Tobi by Friday.\n\n${THE_CLOSE}`);
    expect(endingOnTheClose('Understood. This record shows nothing more on that.'))
      .toBe(`Understood. This record shows nothing more on that.\n\n${THE_CLOSE}`);
    expect(endingOnTheClose('Your report is ready now, and nothing in it needs acting on today. Speak soon.')).not.toMatch(/report is ready/i);
  });

  it('says it once, however often it runs', () => {
    const once = endingOnTheClose('Thank you. That’s all for today.');
    expect(endingOnTheClose(once)).toBe(once);
    expect(once.split('That’s all for today').length).toBe(2);
  });

  it('a stored close still counts as closed when the same answer arrives twice', () => {
    expect(endsOnTheClose(`Thank you.\n\n${THE_CLOSE}`)).toBe(true);
    expect(endsOnTheClose('What happened with Green Mart?')).toBe(false);
  });

  /*
   * Run 20, 30 September 2026: the model's own closing reply sometimes still asked something, and the
   * close was appended on top of it, so the person was asked something they had no way to answer.
   */
  it("takes the model's own question out before the close, and keeps what still makes sense", () => {
    expect(endingOnTheClose(
      'Thanks, Priti. What is the current on-time delivery percentage you are seeing from them? '
      + 'It helps to have the starting point for that 98% target.',
    )).toBe(`Thanks, Priti. It helps to have the starting point for that 98% target.\n\n${THE_CLOSE}`);
    expect(endingOnTheClose('What will you do about getting those bank statements, and by when?')).toBe(THE_CLOSE);
  });

  it('never serves a closing turn with more than the close\'s own one question', () => {
    const out = endingOnTheClose('Thanks. What will you do about getting those bank statements, and by when?');
    expect((out.match(/\?/g) ?? []).length).toBe((THE_CLOSE.match(/\?/g) ?? []).length);
    for (const door of ['whatsapp', 'api'] as const) {
      const onDoor = endingOnTheClose('Thanks. What will you do about it, and by when?', door);
      expect((onDoor.match(/\?/g) ?? []).length).toBe((THE_CLOSE_ON[door].match(/\?/g) ?? []).length);
    }
  });

  it('is put on the turn that closed, after it is known to be closed', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    // Changed 26 October 2026 (Hafsah: item 4): sessionComplete is a let now, since past seven answers the product closes too.
    const decided = src.indexOf("let sessionComplete = close.ready && (theyAreLeaving || !stillAsking(aiTurn.content ?? ''));");
    const closed = src.indexOf("const closed = endingOnTheClose(aiTurn.content ?? '', how.door ?? 'web', await this.usesSimplerWords(checkIn.groundId));");
    expect(decided).toBeGreaterThan(0);
    expect(closed).toBeGreaterThan(decided);
    expect(src.slice(closed - 200, closed)).toContain('if (sessionComplete) {');
  });
});

describe('on a door that shows no end card, the close never says "Below"', () => {
  it('WhatsApp ends on replying "finish", which is what closes it there, and the report coming to the chat', () => {
    expect(endingOnTheClose('Thank you, Femi. Your report is ready now. Speak soon.', 'whatsapp'))
      .toBe('Thank you, Femi.\n\nThat’s all for today. Reply "finish" to close this check-in, and your report will come here.');
  });

  it('the developer API ends on what happens when the check-in is closed', () => {
    expect(endingOnTheClose('Thank you, Femi.', 'api'))
      .toBe('Thank you, Femi.\n\nThat’s all for today. Thank you for your answers. When this check-in is closed, they go into the report.');
  });

  it('neither says "Below", and the web keeps the prototype sentence', () => {
    expect(THE_CLOSE_ON.whatsapp).not.toMatch(/below/i);
    expect(THE_CLOSE_ON.api).not.toMatch(/below/i);
    expect(endingOnTheClose('Thank you.')).toBe(`Thank you.\n\n${THE_CLOSE}`);
    for (const c of Object.values(THE_CLOSE_ON)) expect(endsOnTheClose(`Thank you.\n\n${c}`)).toBe(true);
  });

  it('each door says which door it is, and WhatsApp does not say "finish" twice', () => {
    const wa = readFileSync(join(__dirname, '../public-api/whatsapp-for-an-organisation.service.ts'), 'utf8');
    const api = readFileSync(join(__dirname, '../public-api/a-check-in-a-customer-can-run.service.ts'), 'utf8');
    expect(wa).toContain("this.conversation.sendMessage(current.id, userId!, text, { door: 'whatsapp' })");
    // Changed 26 October 2026 (Hafsah: item 3): an engine close on WhatsApp no longer asks for "finish" at all; the line is taken off and it says the check-in is complete.
    expect(wa).toContain('const said = endingWithoutTheFinishLine(r.reply);');
    expect(wa).toContain('theCheckInIsCompleteSaying(current.simplerWords)');
    expect(wa).not.toContain('enoughToCloseSaying(current.simplerWords)');
    expect(api).toContain("content, { door: 'api' })");
  });
});
