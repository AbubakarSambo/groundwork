import { slidesInOrder, textFromOneSlide, deckToText, WHAT_A_DECK_IS } from './slides-are-mostly-headings';
const JSZip = require('jszip') as typeof import('jszip');

/** A real .pptx, built here, so this tests a zip of XML and not a fixture of my own assumptions. */
async function deck(slides: Record<number, string[]>): Promise<Buffer> {
  const zip = new JSZip();
  const xml = (runs: string[]) =>
    '<?xml version="1.0"?><p:sld xmlns:a="x" xmlns:p="y"><p:cSld><p:spTree>'
    + runs.map((r) => `<a:p><a:r><a:t>${r}</a:t></a:r></a:p>`).join('')
    + '</p:spTree></p:cSld></p:sld>';
  for (const [n, runs] of Object.entries(slides)) zip.file(`ppt/slides/slide${n}.xml`, xml(runs));
  zip.file('docProps/app.xml', '<x/>');
  return zip.generateAsync({ type: 'nodebuffer' });
}

async function read(buf: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const slides = await Promise.all(
    slidesInOrder(Object.keys(zip.files)).map(async ({ name, number }) => ({
      number,
      text: textFromOneSlide(await zip.file(name)!.async('string')),
    })),
  );
  return deckToText(slides);
}

describe('a deck is a zip of xml', () => {
  it('reads the words off the slides', async () => {
    const out = await read(await deck({ 1: ['Q3 roadmap', 'Ship CAN-bus by 18 Oct'] }));
    expect(out).toContain('Slide 1: Q3 roadmap Ship CAN-bus by 18 Oct');
  });

  it('puts slide 10 after slide 2, which zip order does not', async () => {
    const out = await read(await deck({ 10: ['Last'], 2: ['Second'], 1: ['First'] }));
    expect(out.indexOf('First')).toBeLessThan(out.indexOf('Second'));
    expect(out.indexOf('Second')).toBeLessThan(out.indexOf('Last'));
  });

  it('numbers a slide by the deck\'s own number, not by its position after empties are dropped', async () => {
    /*
     * Found by reading the output of a real deck; the code looked correct. A slide of pictures
     * produces no text and drops out, and numbering by array position then put "Slide 4" on slide
     * ten - so every number after the first image slide pointed at the wrong one.
     */
    const out = await read(await deck({ 1: ['First'], 2: [], 10: ['Tenth'] }));
    expect(out).toContain('Slide 10: Tenth');
    expect(out).not.toContain('Slide 3:');
  });

  it('unescapes xml entities, including an escaped ampersand', async () => {
    const out = await read(await deck({ 1: ['Architecture &amp; risks', '&lt;service&gt;'] }));
    expect(out).toContain('Architecture & risks');
    expect(out).toContain('<service>');
    expect(out).not.toContain('&amp;');
  });

  it('says what slide text is, every time, before any of it', async () => {
    /*
     * Without this, forty fragments arrive looking like prose somebody wrote in sentences, and the
     * assessment, the claim extraction and the check-in all treat a headline as a considered
     * statement. A deck is not that.
     */
    const out = await read(await deck({ 1: ['Anything'] }));
    expect(out.startsWith(WHAT_A_DECK_IS)).toBe(true);
    expect(WHAT_A_DECK_IS).toContain('meant to be spoken over');
    expect(WHAT_A_DECK_IS).toContain('never quote a fragment back');
  });

  it('says so plainly when a deck is all pictures', async () => {
    /* Better than storing nothing and leaving somebody wondering why it is never mentioned. */
    const out = await read(await deck({ 1: [], 2: [] }));
    expect(out).toContain('every slide is an image');
  });

  it('ignores everything in the zip that is not a slide', async () => {
    expect(slidesInOrder(['ppt/slides/slide1.xml', 'docProps/app.xml', 'ppt/notesSlides/notesSlide1.xml']))
      .toEqual([{ name: 'ppt/slides/slide1.xml', number: 1 }]);
  });
});
