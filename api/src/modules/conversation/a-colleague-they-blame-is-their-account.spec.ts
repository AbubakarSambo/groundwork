import { whatTheRecordAlreadyHolds } from './what-the-record-already-holds';
import { PATTERN_PROBE_BY_CODE } from '../patterns/pattern-library';

/*
 * KEVIN'S CONVERSATION (decision 137, item 2; decision 139, must-fix 4). He said every week he was waiting on Fatuma for the final prices; she
 * had sent them and never promised them again. The conversation praised the list and repeated it as fact. What reaches the model now is that
 * this is his word alone, with B11's and K3's own probes to ask what was in his hands. Nothing here is a scripted line for him to read.
 */
const NOW = new Date('2026-10-21T09:00:00Z');
const wait = (over: any = {}) => ({ what: 'the final prices', on: 'Fatuma Bello', since: new Date('2026-10-07T09:00:00Z'), escalated: false, onAColleagueHere: true, theyConfirmedIt: false, ...over });

describe('what the model is given when somebody blames a colleague', () => {
  it('a wait only Kevin claims is his account, with the probes for what was in his own hands', () => {
    const block = whatTheRecordAlreadyHolds({ targets: [], inTheWay: [wait()], saidLastTime: [], now: NOW });
    expect(block).toContain('WHAT THEY SAY A COLLEAGUE IS HOLDING UP, ON THEIR WORD ALONE.');
    expect(block).toContain('- "the final prices", which they say is with Fatuma Bello');
    expect(block).toContain(`[PATTERN_PROBE] Recommended probe: ${PATTERN_PROBE_BY_CODE.get('B11')}`);
    expect(block).toContain(`[PATTERN_PROBE] Recommended probe: ${PATTERN_PROBE_BY_CODE.get('K3')}`);
    expect(block).toContain('What was within your control in this situation?');
    expect(block).not.toMatch(/Blame Shifting|B11|K3/);
  });

  it('not once the colleague has said it is theirs to give, nor for a wait outside the check-in', () => {
    expect(whatTheRecordAlreadyHolds({ targets: [], inTheWay: [wait({ theyConfirmedIt: true })], saidLastTime: [], now: NOW })).not.toContain('ON THEIR WORD ALONE');
    expect(whatTheRecordAlreadyHolds({ targets: [], inTheWay: [wait({ on: 'the supplier', onAColleagueHere: false })], saidLastTime: [], now: NOW })).not.toContain('ON THEIR WORD ALONE');
  });

  it('not where the lead has said this check-in does not ask people to unblock themselves', () => {
    expect(whatTheRecordAlreadyHolds({ targets: [], inTheWay: [wait()], saidLastTime: [], now: NOW, expectThemToUnblock: false })).not.toContain('ON THEIR WORD ALONE');
  });
});
