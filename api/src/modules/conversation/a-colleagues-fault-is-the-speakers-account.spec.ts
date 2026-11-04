import { withAColleaguesFaultAsTheirAccount, everyColleaguesFaultAsTheirAccount, WhatTheRecordHoldsForBlame } from './a-colleagues-fault-is-the-speakers-account';

/**
 * The real lines from night quality run 2, week 4 (gw-pr-tools/quality/run2/week-4/served): Hassan blamed Amina for the stock; Amina sent
 * exactly his order, the same afternoon, and never said otherwise. Nothing in the record confirms his wait.
 */
const LAKESHORE = ['Esther Wanjiru', 'Hassan Mwenda', 'Amina Otieno', 'Collins Odhiambo', 'Jared Okoth'];
const HIS_WAIT = { by: 'Hassan Mwenda', on: 'Amina Otieno', what: 'the stock from Kisumu', triedSaid: null, confirmed: false };
const AMINAS_WORDS = [{ name: 'Amina Otieno', text: 'Stock is dispatched on Tuesdays for all orders received by the Monday noon deadline. DN-1258 left on Tuesday.' }];
/* Changed 3 November (Hafsah, F2: silence is never a finding): with nothing he said he tried, nothing goes beside the claim; "Not backed: ...
   You could have messaged ..." is gone. What he said he tried, from the record, is said in full. */

const asHassanReads = (over: Partial<WhatTheRecordHoldsForBlame> = {}): WhatTheRecordHoldsForBlame => ({
  people: LAKESHORE, lead: 'Esther Wanjiru', waits: [HIS_WAIT], theirOwnWords: AMINAS_WORDS,
  speaker: { name: 'Hassan Mwenda', isTheReader: true }, ...over,
});
const asTheLeadReads = (over: Partial<WhatTheRecordHoldsForBlame> = {}): WhatTheRecordHoldsForBlame => ({
  people: LAKESHORE, lead: 'Esther Wanjiru', waits: [HIS_WAIT], theirOwnWords: AMINAS_WORDS, speaker: null, ...over,
});

describe("a colleague's fault, written by Groundwork, is the speaker's account", () => {
  it("Hassan's coaching reads as his account, with the note", () => {
    const line = 'You have been waiting on Amina Otieno for the stock from Kisumu since 12 October, and you have not taken it any further. Put the request in writing with a date, or take it to whoever is above them.';
    expect(withAColleaguesFaultAsTheirAccount(line, asHassanReads()).text).toBe(
      `You say you have been waiting on Amina Otieno for the stock from Kisumu since 12 October, and you have not taken it any further. Put the request in writing with a date, or take it to whoever is above them.`,
    );
  });

  it("Hassan's own report says the mix of kits was his account, not a fact about Amina", () => {
    const line = 'Here is what you shared. You reported that your sales have been affected by stock arriving late from Kisumu, and on one occasion the mix of kits was not right for the shops you had planned to visit. This has meant you have not been able to visit all the shops on your plan.';
    expect(withAColleaguesFaultAsTheirAccount(line, asHassanReads()).text).toBe(
      `Here is what you shared. You reported that your sales have been affected by stock arriving late from Kisumu, and you said that on one occasion the mix of kits was not right for the shops you had planned to visit. This has meant you have not been able to visit all the shops on your plan.`,
    );
  });

  it("the lead's section for Amina reads as Hassan's account, with the note", () => {
    const line = 'Hassan Mwenda has been waiting on Amina Otieno for the stock from Kisumu since 12 October. Ask what that is waiting on.';
    expect(withAColleaguesFaultAsTheirAccount(line, asTheLeadReads()).text).toBe(
      `Hassan Mwenda says the work has been waiting on Amina Otieno for the stock from Kisumu since 12 October. Ask what that is waiting on.`,
    );
  });

  it('what Hassan said he tried goes in the note in its place', () => {
    const line = 'Hassan Mwenda has been waiting on Amina Otieno for the stock from Kisumu since 12 October.';
    expect(withAColleaguesFaultAsTheirAccount(line, asTheLeadReads({ waits: [{ ...HIS_WAIT, triedSaid: 'I called her twice on Tuesday' }] })).text).toBe(
      'Hassan Mwenda says the work has been waiting on Amina Otieno for the stock from Kisumu since 12 October. Hassan Mwenda said, “I called her twice on Tuesday.”',
    );
  });

  it("Hassan's session turn says it reached Kisii late as his account, without the note, and the question stays", () => {
    const turn = 'You sent the order on Tuesday around four. It reached Kisii two days later. What happened with those sales?';
    expect(withAColleaguesFaultAsTheirAccount(turn, asHassanReads({ withTheNote: false })).text).toBe(
      'You sent the order on Tuesday around four. You say it reached Kisii two days later. What happened with those sales?',
    );
  });

  it('a colleague named as at fault, where the text does not say who said it, stays as the claim of the one whose wait is on record', () => {
    const r = withAColleaguesFaultAsTheirAccount('Amina Otieno sent the wrong mix of kits. The shops were planned for Thursday.', asTheLeadReads());
    expect(r.text).toBe(`Hassan Mwenda says Amina Otieno sent the wrong mix of kits. The shops were planned for Thursday.`);
  });

  it('blame nobody in the record gave is taken out, and only that', () => {
    const r = withAColleaguesFaultAsTheirAccount('Amina Otieno sent the wrong mix of kits. The shops were planned for Thursday.', asTheLeadReads({ waits: [] }));
    expect(r.text).toBe('The shops were planned for Thursday.');
  });

  it('a claim with an attempt on record is kept, with what was tried beside it', () => {
    const tried = asTheLeadReads({ waits: [{ ...HIS_WAIT, triedSaid: 'I messaged her on Monday and asked again on Wednesday' }] });
    expect(withAColleaguesFaultAsTheirAccount('Amina Otieno sent the wrong mix of kits.', tried).text)
      .toBe('Hassan Mwenda says Amina Otieno sent the wrong mix of kits. Hassan Mwenda said, “I messaged her on Monday and asked again on Wednesday.”');
  });

  it('a wait the colleague confirmed in her own promise stays as fact', () => {
    const line = 'Hassan Mwenda has been waiting on Amina Otieno for the stock from Kisumu since 12 October. Ask what that is waiting on.';
    expect(withAColleaguesFaultAsTheirAccount(line, asTheLeadReads({ waits: [{ ...HIS_WAIT, confirmed: true }] })).text).toBe(line);
  });

  it('a delay the colleague owned up to in her own words stays as fact', () => {
    const line = 'Amina Otieno sent the stock late this week.';
    const held = asTheLeadReads({ theirOwnWords: [{ name: 'Amina Otieno', text: 'I was late with the stock this week, my fault.' }] });
    expect(withAColleaguesFaultAsTheirAccount(line, held).text).toBe(line);
  });

  it("a person's own words in quotation marks stay word for word", () => {
    const line = 'You said "The stock is late because Amina sends it late. I have said it before." What did you try after that?';
    expect(withAColleaguesFaultAsTheirAccount(line, asHassanReads()).text).toBe(line);
  });

  it('a line that already says whose account it is stays', () => {
    const line = 'Hassan Mwenda said the wrong mix of kits was sent, which blocked planned visits to shops.';
    expect(withAColleaguesFaultAsTheirAccount(line, asTheLeadReads()).text).toBe(line);
  });

  it('a wait on a customer is not about a colleague and stays', () => {
    const line = "You have been waiting for a signature from the women's group since 12 October, and you have not taken it any further.";
    expect(withAColleaguesFaultAsTheirAccount(line, asHassanReads()).text).toBe(line);
  });

  it('over a served value: a list item emptied of blame nobody gave goes, quotes and ids are not read', () => {
    const r = everyColleaguesFaultAsTheirAccount(
      { items: ['Amina Otieno has not sent the stock.', 'Ask Hassan how many he sold.'], participantId: 'Amina Otieno has not sent' },
      asTheLeadReads({ waits: [] }),
    );
    expect(r.value).toEqual({ items: ['Ask Hassan how many he sold.'], participantId: 'Amina Otieno has not sent' });
  });

  it('over a served value: a claim Hassan made is never emptied out of the list', () => {
    const r = everyColleaguesFaultAsTheirAccount({ items: ['Amina Otieno has not sent the stock.'] }, asTheLeadReads());
    expect(r.value).toEqual({ items: [`Hassan Mwenda says Amina Otieno has not sent the stock.`] });
  });
});
