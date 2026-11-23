import { aParticipantsOwnBoard, withoutOtherPeoplesDeals } from './a-participants-board-is-their-own';
import { aLineNamesTheCustomer, theSameCustomer } from './one-deal-per-customer';
import { namesToCallAmong, theNameToCall } from '../../common/names-that-tell-people-apart';
import { aHandoffThatCleared } from '../reports/the-weekly-report';

/**
 * THE PAGE AUDIT OF 24 NOVEMBER, AS EACH READER READS IT (rows 1, 11, 12 and 15; approved by Hafsah).
 *
 * Row 1: Amani's board said "You have no deals on record yet." and My work "You have no deals on the board yet.", while Wairimu's board
 * held three deals of hers. Her own "Mama Njeri Duka" says "Duka", which starts Sade's "Duka Bora", and the wall that keeps another
 * rep's customers off her board dropped the whole deal grid holding her rows. My work reads the same served board.
 */
describe('page audit, 24 November', () => {
  const AMANI = 'amani';
  const SADE = 'sade';
  const LEAD = 'wairimu';
  const row = (id: string, name: string, owner: string, stage: string) => ({ id, kind: 'deal', name, stage, ownerParticipantId: owner, said: `${name}, ${stage}.` });
  const theLeadsBoard = {
    groundId: 'g1', title: 'Sales team, Q4', myParticipantId: LEAD, participants: [],
    workRecords: [
      { section: 'Deal grid', state: 'filled', rows: [
        row('d1', 'Mama Njeri Duka', AMANI, 'Won'), row('d2', 'Naivas Kilimani', AMANI, 'Contacted'), row('d3', 'Jirani Mart', AMANI, 'Contacted'),
        row('d4', 'Duka Bora', SADE, 'Need established'), row('d5', 'Kwa Mama', SADE, 'Contacted'),
      ] },
      { section: 'Forecast', state: 'not-known', why: '' },
    ],
  };
  /* As board.service serves a rep: their own rows, then nothing that names somebody else's customer. */
  const asAmaniReadsIt = () => {
    const own = aParticipantsOwnBoard(theLeadsBoard, { meId: AMANI, released: true, hasOwnReport: true });
    const every = theLeadsBoard.workRecords[0].rows!;
    const mine = every.filter((r) => r.ownerParticipantId === AMANI).map((r) => r.name);
    const others = [...new Set(every.filter((r) => r.ownerParticipantId !== AMANI).map((r) => r.name))].filter((n) => !mine.some((m) => theSameCustomer(m, n)));
    return withoutOtherPeoplesDeals(own, AMANI, others, aLineNamesTheCustomer);
  };

  it('row 1: the member reads her own three deals, the same rows the lead reads for her, by name', () => {
    expect(aLineNamesTheCustomer('Mama Njeri Duka', 'Duka Bora')).toBe(true); // the overlap that emptied her board
    const grid = asAmaniReadsIt().workRecords.find((s: any) => s.section === 'Deal grid');
    expect(grid).toBeTruthy();
    expect(grid.rows.map((r: any) => r.name)).toEqual(['Mama Njeri Duka', 'Naivas Kilimani', 'Jirani Mart']);
    expect(grid.state).toBe('filled');
  });

  it('row 1: another rep\'s deal still never reaches her board (the privacy wall is kept)', () => {
    const served = JSON.stringify(asAmaniReadsIt());
    expect(served).not.toContain('Duka Bora');
    expect(served).not.toContain('Kwa Mama');
    expect(served).not.toContain(SADE);
  });

  it('rows 11 and 15: a first name alone, unless somebody else here has the same first name', () => {
    const here = ['Juma Otieno', 'Neema Kamau', 'Amani Wekesa', 'Juma Test', 'Juma Test', 'Neema Wanjiru'];
    const callThem = namesToCallAmong(here);
    expect(here.map(callThem)).toEqual(['Juma Otieno', 'Neema Kamau', 'Amani', 'Juma Test', 'Juma Test', 'Neema Wanjiru']);
    /* The same person twice in a list is still one person. */
    expect(theNameToCall('Amani Wekesa', ['Amani Wekesa', 'Amani Wekesa', 'Sade Balogun'])).toBe('Amani');
  });

  it('row 12: a wait whose "on" is the thing itself is said once', () => {
    const d: any = { what: 'the price list', onParticipantId: null, onLabel: 'the price list', confirmed: null };
    expect(aHandoffThatCleared(d, 'Juma Test', 'the price list')).toBe('Juma Test is no longer waiting for the price list.');
    /* A wait on somebody outside the check-in still names them. */
    expect(aHandoffThatCleared({ ...d, onLabel: 'Duka Bora' }, 'Juma Test', 'Duka Bora')).toBe('Juma Test is no longer waiting on Duka Bora for the price list.');
  });
});
