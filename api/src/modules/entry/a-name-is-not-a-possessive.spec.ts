import { theNameWithoutThePossessive, namesWithoutPossessives } from './a-name-is-not-a-possessive';

describe('a name is not the possessive form of it', () => {
  it('takes the apostrophe-s off a name the model lifted from a possessive', () => {
    expect(theNameWithoutThePossessive("Segun's")).toBe('Segun');
    expect(theNameWithoutThePossessive("Tunde's")).toBe('Tunde');
  });

  it('leaves a real surname ending in s alone, because it carries no apostrophe', () => {
    expect(theNameWithoutThePossessive('James')).toBe('James');
    expect(theNameWithoutThePossessive('Rogers')).toBe('Rogers');
  });

  it('and takes the bare apostrophe off a plural possessive', () => {
    expect(theNameWithoutThePossessive("Rogers'")).toBe('Rogers');
  });

  it('keeps every other field on the person', () => {
    const out = namesWithoutPossessives([{ name: "Segun's", context: 'Taking over the close.' }]);
    expect(out).toEqual([{ name: 'Segun', context: 'Taking over the close.' }]);
  });
});
