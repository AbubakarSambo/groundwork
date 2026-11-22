import { whatTheLeadSaidAtSetUp, theSetUpReadBackInWords } from './what-the-lead-said-at-set-up';
import { theSetupWords } from '../board/the-kind-of-work';
import { whatThisRunMayDo } from '../../../scripts/re-read-existing-check-ins';

/**
 * WHAT THE LEAD SAID AT SET-UP, FROM ONE PLACE (existing customers, 22 November 2026). Drop Access's freezer team was set up in the chat
 * on main: an empty brief and end state, no lead_setup_words row, and her targets only in the set-up read-back she saved. The kind of work
 * was read from "A check-in at Drop Access" and came back as none.
 */
const READ_BACK = {
  yourRole: 'I am the sales lead.',
  whatGroundworkSaw: 'You want to track the weekly sales and activation performance of your five-person freezer sales team.',
  alignmentReached: [{ title: 'The weekly targets for each agent have been set.', note: 'Each agent has a weekly target of selling 8 freezers and activating 4 Drop Access points.' }],
  mentionedPeople: [{ name: 'Brian Otieno', context: 'He is a member of your freezer sales team.' }],
};
const db = (own: string | null) => ({
  leadSetupWords: { findUnique: async () => (own ? { text: own } : null) },
  ground: { findUnique: async () => ({ initiatorId: 'u-ruth' }) },
  groundParticipant: { findFirst: async () => ({ id: 'p-ruth' }) },
  checkIn: { findFirst: async () => ({ sessionReport: { reportTheyRead: READ_BACK } }) },
});

describe('what the lead said at set-up', () => {
  it('is her own words where they were kept', async () => {
    expect(await whatTheLeadSaidAtSetUp(db('Each agent has a target of 8 freezers and 4 activations a week.'), 'g')).toBe('What the lead typed when setting it up:\nEach agent has a target of 8 freezers and 4 activations a week.');
  });
  it('is the set-up read-back she saved where they were not, said as what it is', async () => {
    const said = await whatTheLeadSaidAtSetUp(db(null), 'g');
    expect(said.split('\n')[0]).toBe('What Groundwork said back to the lead at set-up, and she saved:');
    expect(said).toContain('Each agent has a weekly target of selling 8 freezers and activating 4 Drop Access points.');
    expect(said).toContain('Brian Otieno: He is a member of your freezer sales team.');
    expect(theSetUpReadBackInWords(null)).toBe('');
  });
  it('reaches the kind of work reading beside an empty brief', async () => {
    const words = theSetupWords({ label: 'A check-in at Drop Access', brief: '', endState: '' }, null, await whatTheLeadSaidAtSetUp(db(null), 'g'));
    expect(words).toContain('freezer sales team');
  });
});

describe('the re-read runs only where it may', () => {
  it('is a dry run by default, refuses a hosted database without --hosted-database, and asks for the host back to write there', () => {
    expect(whatThisRunMayDo('postgresql://me@localhost:5432/gw_x', [])).toMatchObject({ refused: false, writes: false });
    expect(whatThisRunMayDo('postgresql://me@localhost:5432/gw_x', ['--write'])).toMatchObject({ refused: false, writes: true, mustTypeTheHostBack: false });
    expect(whatThisRunMayDo('postgresql://me@db.example.com:5432/prod', ['--write']).refused).toBe(true);
    expect(whatThisRunMayDo('postgresql://me@db.example.com:5432/prod', ['--hosted-database'])).toMatchObject({ refused: false, writes: false });
    expect(whatThisRunMayDo('postgresql://me@db.example.com:5432/prod', ['--hosted-database', '--write'])).toMatchObject({ refused: false, writes: true, mustTypeTheHostBack: true });
  });
});
