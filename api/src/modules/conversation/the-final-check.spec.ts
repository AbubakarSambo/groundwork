import { theFinalCheck, theRewordingHoldsNothingNew, everyLineTheFinalCheckPasses, type WhatTheRecordHolds } from './the-final-check';

/*
 * THE FINAL CHECK, ON THE QUALITY RUNS' OWN LINES (gw-pr-tools/quality/run1/audit.md, run2/audit.md). Each untrue line reached a person;
 * each true one must still reach them. Without the check every untrue line below comes back unchanged, so each test fails.
 */
const quiet = { warn: () => undefined };

/* What Hassan's week-1 check-in held: his own words, the lead's setup, the record. Nobody said twelve, or forty. */
const hassan: WhatTheRecordHolds = {
  texts: [
    'I restock the shops in Kisii once a month. The stock comes from Kisumu.',
    'Hassan Mwenda sells kits to shops in Kisii and Keroka. Target: 8 kits a week.',
    'I sent the order on Tuesday afternoon, around four.',
  ],
  people: ['Hassan Mwenda', 'Amina Otieno', 'Esther Wanjiru'],
  theirOwnWords: [{ name: 'Hassan Mwenda', text: 'I restock the shops in Kisii once a month. I sent the order on Tuesday afternoon, around four.' }],
  shownOrConfirmed: [],
  reader: 'Hassan Mwenda',
};

/* What Collins's check-ins held: his claims, no M-Pesa message shown, nothing backed. */
const collins: WhatTheRecordHolds = {
  texts: ['I did eleven kits this week.', 'Honestly eleven was rounding up, it is lower, maybe four or five.', 'Do ten kits.'],
  people: ['Collins Odhiambo', 'Esther Wanjiru'],
  theirOwnWords: [{ name: 'Collins Odhiambo', text: 'I did eleven kits this week. Honestly eleven was rounding up, it is lower, maybe four or five.' }],
  shownOrConfirmed: [],
  reader: 'Collins Odhiambo',
};

describe('the final check: a number the record does not hold', () => {
  it('removes "twelve refills a year across forty shops", which nobody said, and keeps the question after it', () => {
    const r = theFinalCheck('Monthly restocking caps you at twelve refills a year across forty shops. What would it take to restock every two weeks?', hassan, { log: quiet });
    expect(r.text).toBe('What would it take to restock every two weeks?');
    expect(r.removed.map((x) => x.why)).toEqual(['a number the record does not hold']);
  });
  it('keeps a number he said himself', () => {
    const r = theFinalCheck('You said you sent the order around four on Tuesday afternoon.', hassan, { log: quiet });
    expect(r.text).toBe('You said you sent the order around four on Tuesday afternoon.');
    expect(r.removed).toEqual([]);
  });
  it('keeps the target the lead set', () => {
    const r = theFinalCheck('Your target is 8 kits a week.', hassan, { log: quiet });
    expect(r.removed).toEqual([]);
  });
});

describe('the final check: a status the record does not hold', () => {
  it('removes "weekly sales confirmed by M-Pesa messages" when no message was shown', () => {
    const r = theFinalCheck('Collins Odhiambo sells kits in Kendu Bay, with weekly sales confirmed by M-Pesa messages. He plans to do ten kits.', collins, { log: quiet });
    expect(r.text).not.toMatch(/confirmed by M-Pesa/);
    expect(r.text).toBe('He plans to do ten kits.');
  });
  it('removes "eleven ... Won" when nothing was shown, and keeps his own words in quotation marks', () => {
    expect(theFinalCheck('"I did eleven kits this week", Won.', collins, { log: quiet, whenNothingIsLeft: null }).text).toBe('');
    expect(theFinalCheck('Eleven kits were won this week.', collins, { log: quiet, whenNothingIsLeft: null }).text).toBe('');
    expect(theFinalCheck('You said "I did eleven kits this week".', collins, { log: quiet }).text).toBe('You said "I did eleven kits this week".');
  });
  it('removes "All 3 check-ins due this week were made." when Amina was still due', () => {
    const esther: WhatTheRecordHolds = { texts: ['Amina Otieno is due. Yours is the last one we are waiting for.'], numbers: [2, 3], shownOrConfirmed: [], people: ['Amina Otieno'] };
    const r = theFinalCheck('All 3 check-ins due this week were made. Amina Otieno has not checked in yet.', esther, { log: quiet });
    expect(r.text).toBe('Amina Otieno has not checked in yet.');
  });
  it('puts "You have finished four check-ins." right to the two Jared answered', () => {
    const r = theFinalCheck('You have finished four check-ins.', { checkInsAnswered: 2 }, { log: quiet });
    expect(r.text).toBe('You have finished two check-ins.');
    expect(theFinalCheck('You have finished two check-ins.', { checkInsAnswered: 2 }, { log: quiet }).text).toBe('You have finished two check-ins.');
  });
  it('keeps a status a document backs', () => {
    const backed: WhatTheRecordHolds = { shownOrConfirmed: ['Order DN-1258 delivered to Kisii, receipt attached.'], texts: ['Order DN-1258 delivered to Kisii.'] };
    expect(theFinalCheck('The Kisii order was delivered and is confirmed by the receipt.', backed, { log: quiet }).removed).toEqual([]);
  });
  it('keeps a question that asserts nothing', () => {
    expect(theFinalCheck('Were all eleven kits won this week?', collins, { log: quiet }).text).toBe('Were all eleven kits won this week?');
  });
});

describe('the final check: credit no transcript holds', () => {
  it('removes "colleagues said you helped them" when no colleague said so', () => {
    const r = theFinalCheck('2 colleagues said you helped them. You did not mention it in your own check-ins.', {
      reader: 'Hassan Mwenda',
      theirOwnWords: [{ name: 'Amina Otieno', text: 'I sent the stock on Tuesday.' }, { name: 'Hassan Mwenda', text: 'The stock was late.' }],
    }, { log: quiet });
    expect(r.text).toBe('You did not mention it in your own check-ins.');
    expect(r.removed[0].why).toBe('credit no transcript holds');
  });
  it('keeps it when a colleague said it in their own words', () => {
    const r = theFinalCheck('A colleague said Hassan helped them.', {
      theirOwnWords: [{ name: 'Amina Otieno', text: 'Hassan helped me load the van on Monday.' }],
    }, { log: quiet });
    expect(r.removed).toEqual([]);
  });
});

describe('the final check: a date or a name the record does not hold', () => {
  it('removes a date nobody gave and keeps one the record holds', () => {
    const held: WhatTheRecordHolds = { texts: ['Kendu Bay and Oyugis by Friday 30 October.'] };
    expect(theFinalCheck('You agreed Kendu Bay by 30 October.', held, { log: quiet }).removed).toEqual([]);
    expect(theFinalCheck('You agreed Kendu Bay by 14 November.', held, { log: quiet, whenNothingIsLeft: null }).text).toBe('');
  });
  it('removes a person nobody in the check-in is called', () => {
    const r = theFinalCheck('Peter said the stock was ready. Amina Otieno sent it.', { people: ['Amina Otieno', 'Hassan Mwenda'], texts: [] }, { log: quiet });
    expect(r.text).toBe('Amina Otieno sent it.');
  });
});

describe('the final check keeps blame somebody gave', () => {
  it('a colleague\'s fault Hassan gave stays as his account, with the note, and is not removed', () => {
    const r = theFinalCheck('Amina Otieno sent the wrong mix of kits.', {
      blame: {
        people: ['Hassan Mwenda', 'Amina Otieno'],
        waits: [{ by: 'Hassan Mwenda', on: 'Amina Otieno', what: 'the mix of kits', triedSaid: null, confirmed: false }],
        theirOwnWords: [{ name: 'Hassan Mwenda', text: 'Amina sent the wrong mix of kits.' }],
        speaker: null,
      },
      texts: ['Amina sent the wrong mix of kits.'],
      people: ['Hassan Mwenda', 'Amina Otieno'],
    }, { log: quiet });
    expect(r.text).toMatch(/^Hassan Mwenda says Amina Otieno sent the wrong mix of kits\./);
  });
});

describe('a reworded board line holds nothing its engine line did not', () => {
  it('refuses a reworded line that says a promise was kept, or adds a count', () => {
    const engine = 'Collins Odhiambo said he would do ten kits.';
    expect(theRewordingHoldsNothingNew(engine, 'Collins Odhiambo said he would do ten kits, and that promise was kept.')).toBe(false);
    expect(theRewordingHoldsNothingNew(engine, 'Collins Odhiambo said he would do eleven kits.')).toBe(false);
    expect(theRewordingHoldsNothingNew(engine, 'Collins Odhiambo told you he would do ten kits.')).toBe(true);
  });
});

describe('every line of a stored value', () => {
  it('takes an untrue item out of a list and leaves the true ones', () => {
    const r = everyLineTheFinalCheckPasses({ findings: ['Monthly restocking caps you at twelve refills a year across forty shops.', 'You restock the shops in Kisii once a month.'] }, hassan, { log: quiet });
    expect(r.value.findings).toEqual(['You restock the shops in Kisii once a month.']);
  });
});

describe('the board\'s reworded reason and pattern lines go through the final check (docs/records-plan.md line 10)', () => {
  /* eslint-disable @typescript-eslint/no-var-requires */
  const { safeToUse } = require('../assistant/the-model-words-it-and-nothing-more');
  const { wordPatternEvidence } = require('../reports/pattern-evidence-in-plain-words');

  it('a reason line reworded to say a promise was kept ships the engine\'s line instead', () => {
    const engine = 'Collins Odhiambo said he would do ten kits.';
    expect(safeToUse(engine, 'Collins Odhiambo said he would do ten kits, and the promise was kept.')).toBe(false);
    expect(safeToUse(engine, 'Collins Odhiambo said he would do eleven kits.')).toBe(false);
    expect(safeToUse(engine, 'Collins Odhiambo told you he would do ten kits.')).toBe(true);
  });

  it('a pattern line reworded to say a deal was won reads as the detector wrote it', async () => {
    const detector = 'Collins reported eleven kits, then said the real number was four or five.';
    const served = [{ participantId: 'p1', yours: false, whatHappened: detector }];
    const [won] = await wordPatternEvidence(served, () => 'Collins', async () => 'Collins reported eleven kits, which were won, then said the real number was four or five.');
    expect(won.whatHappened).toBe(detector);
    const [plain] = await wordPatternEvidence(served, () => 'Collins', async () => 'Collins said eleven kits at first, then said the real number was four or five.');
    expect(plain.whatHappened).toBe('Collins said eleven kits at first, then said the real number was four or five.');
  });
});

describe('a sentence that says when something will be is not a status', () => {
  it('keeps the product\'s own "The shared picture is made once people have answered." (B-009)', () => {
    const r = theFinalCheck('Nobody has checked in yet, out of two people. The shared picture is made once people have answered.', { shownOrConfirmed: [], theirOwnWords: [] } as any, { log: quiet });
    expect(r.text).toBe('Nobody has checked in yet, out of two people. The shared picture is made once people have answered.');
  });
  it('still cuts "The ten kits are done." when nothing backs it', () => {
    const r = theFinalCheck('The ten kits are done.', { shownOrConfirmed: [], theirOwnWords: [] } as any, { log: quiet });
    expect(r.text).not.toMatch(/are done/);
  });
});

describe('a reworded board line keeps to the week rule', () => {
  const engine = 'In the week of 12 October, Collins Odhiambo said, “maybe four or five”. In the week of 19 October, Collins said, “Last week I did nine, maybe ten”.';
  it('may not turn two weeks into one contradiction', () => {
    expect(theRewordingHoldsNothingNew('Collins Odhiambo reports selling nine or ten kits and four or five kits.', 'Collins Odhiambo first reported nine or ten, but later said it was four or five.')).toBe(false);
  });
  it('may not drop a week the engine line names', () => {
    expect(theRewordingHoldsNothingNew(engine, 'Collins said “maybe four or five”, and then “Last week I did nine, maybe ten”.')).toBe(false);
  });
  it('a plain rewording that keeps both weeks still passes', () => {
    expect(theRewordingHoldsNothingNew(engine, 'In the week of 12 October, Collins Odhiambo said, “maybe four or five”. In the week of 19 October, he said, “Last week I did nine, maybe ten”.')).toBe(true);
  });
});

/*
 * NO LABELS ON PEOPLE (Hafsah, 12 October, step 3). "Stuck and not chasing" beside Collins and Amina; "Presents well, delivers late,
 * more than once" over Collins's name. Without the check each of these comes back unchanged.
 */
describe('the final check refuses a pattern title or a label used of a named person', () => {
  const team: WhatTheRecordHolds = { people: ['Collins Odhiambo', 'Amina Otieno', 'Esther Wanjiru'], reader: 'Esther Wanjiru' };

  it('removes "Stuck and not chasing" beside Collins and Amina, and the pattern heading on the lead\'s board', () => {
    for (const line of [
      'Collins Odhiambo is stuck and not chasing.',
      'Amina Otieno, stuck and not chasing.',
      'Collins Odhiambo presents well, delivers late, more than once.',
      'Presents well, delivers late, more than once. Collins Odhiambo saw this first and said what is behind it.',
      'Presents well, delivers late, more than once, in your last three check-ins.',
      'Collins is a blame shifter.',
    ]) {
      const out = theFinalCheck(line, team, { whenNothingIsLeft: null, log: quiet });
      expect({ line, why: out.removed.map((r) => r.why) }).toEqual({ line, why: ['a label on a person'] });
      expect(out.text).not.toMatch(/stuck and not chasing|presents well, delivers late|blame shifter/i);
    }
  });

  it('keeps what happened, with dates and the person\'s own words, and never reads their words', () => {
    const line = 'In the last three check-ins, Collins said a number at the start of the week that was larger than what he later said he sold.';
    expect(theFinalCheck(line, team, { whenNothingIsLeft: null, log: quiet })).toEqual({ text: line, removed: [] });
    const quoted = 'Collins said, “Esther thinks I am a poor performer.”';
    expect(theFinalCheck(quoted, team, { whenNothingIsLeft: null, log: quiet }).text).toBe(quoted);
    const work = 'Your order for the Rangwe shop is stuck at the depot.';
    expect(theFinalCheck(work, team, { whenNothingIsLeft: null, log: quiet }).text).toBe(work);
  });
});
