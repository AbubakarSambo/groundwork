import { onlyWhatHolds, theLines } from './what-the-room-is-about';

/**
 * WHAT SURVIVES THE READ OF WHAT THE ROOM IS ABOUT.
 *
 * The model groups and the code keeps only what can be stood behind: a person who is actually in
 * the ground, a name that is really there, nothing counted twice, and the heaviest first so a
 * reader sees the weight without counting rows.
 */
describe('what the room is about', () => {
  const here = new Set(['Rita Okafor', 'Kunle Adeyinka', 'Hauwa Abubakar']);

  it('drops a person who is not in the ground, and the row if that empties it', () => {
    const held = onlyWhatHolds(
      {
        aims: [
          { aim: 'get capital back', held: ['Hauwa Abubakar', 'Somebody Invented'] },
          { aim: 'feed the hungriest places', held: ['Nobody At All'] },
        ],
        places: [{ name: 'Kano', named: ['Rita Okafor', 'Kunle Adeyinka'] }],
        things: [],
      },
      here,
    );
    expect(held.aims).toEqual([{ aim: 'get capital back', held: ['Hauwa Abubakar'] }]);
    expect(held.places).toEqual([{ name: 'Kano', named: ['Rita Okafor', 'Kunle Adeyinka'] }]);
  });

  it('puts the heaviest first, because the weight is the point', () => {
    const held = onlyWhatHolds(
      {
        places: [
          { name: 'Benue', named: ['Rita Okafor'] },
          { name: 'Kano', named: ['Rita Okafor', 'Kunle Adeyinka', 'Hauwa Abubakar'] },
        ],
      },
      here,
    );
    expect(held.places.map((p) => p.name)).toEqual(['Kano', 'Benue']);
  });

  it('names one person once, however many times the model listed them', () => {
    const held = onlyWhatHolds({ things: [{ name: 'rice', named: ['Rita Okafor', 'Rita Okafor'] }] }, here);
    expect(held.things[0].named).toEqual(['Rita Okafor']);
  });

  it('takes nothing at all without falling over', () => {
    expect(onlyWhatHolds(null, here)).toEqual({ aims: [], places: [], things: [] });
  });

  it('gives the model each line with the name of whoever said it, so the answer can be matched back', () => {
    expect(theLines([{ text: 'we work in Kano', who: 'Rita Okafor' }])).toContain('- Rita Okafor: we work in Kano');
  });
});
