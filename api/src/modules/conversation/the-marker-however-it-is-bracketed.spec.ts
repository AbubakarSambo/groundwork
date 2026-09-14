import { stripCloseMarker, SESSION_CLOSE_MARKER } from './prompt-library';

/**
 * THE FIRST LINE A PERSON EVER READS, WITH THE MACHINERY STILL ON IT.
 *
 * Off a real participant check-in, the opening message:
 *
 *   "...what are your top two or three objectives for this period, and why do they matter?<<SESSION_COMPLETE>>"
 *
 * Angle brackets, not square. One character different from the constant, so the strip missed it and
 * the close detector missed it too: internal machinery reached her screen AND the session did not
 * register as closing. Two faults from one near miss, on the first thing she has ever seen.
 *
 * Fifth time this session that something internal reached a page by being one character off what a
 * check expected. The name is the signal; the brackets are decoration.
 */
describe('the marker, however it is bracketed', () => {
  it('takes the one the model actually wrote', () => {
    const r = stripCloseMarker('...and why do they matter?<<SESSION_COMPLETE>>');
    expect(r.hadMarker).toBe(true);
    expect(r.text).toBe('...and why do they matter?');
  });

  it.each([
    '[[SESSION_COMPLETE]]',
    '<<SESSION_COMPLETE>>',
    '<SESSION_COMPLETE>',
    '(SESSION_COMPLETE)',
    '{{SESSION_COMPLETE}}',
    '[SESSION_COMPLETE]',
    '||SESSION_COMPLETE||',
    '[[ SESSION_COMPLETE ]]',
  ])('takes %s', (marker) => {
    const r = stripCloseMarker(`We are done here. ${marker}`);
    expect(r.hadMarker).toBe(true);
    expect(r.text).toBe('We are done here.');
  });

  it('and the one we write is still the one we write', () => {
    expect(SESSION_CLOSE_MARKER).toBe('[[SESSION_COMPLETE]]');
    expect(stripCloseMarker(`x ${SESSION_CLOSE_MARKER}`).hadMarker).toBe(true);
  });

  it('leaves a reply that has no marker in it exactly as written', () => {
    const plain = 'What is in the way of the first one right now?';
    const r = stripCloseMarker(plain);
    expect(r.hadMarker).toBe(false);
    expect(r.text).toBe(plain);
  });

  it('does not fire on somebody talking about a completed session', () => {
    const r = stripCloseMarker('the session completed on Friday and nobody noticed');
    expect(r.hadMarker).toBe(false);
  });

  it('is not left holding a lastIndex, which is how a global regex goes wrong on the second call', () => {
    const said = 'Done. <<SESSION_COMPLETE>>';
    expect(stripCloseMarker(said).hadMarker).toBe(true);
    expect(stripCloseMarker(said).hadMarker).toBe(true);
    expect(stripCloseMarker(said).hadMarker).toBe(true);
  });
});
