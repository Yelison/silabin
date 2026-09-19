import { describe, expect, it } from 'vitest';
import {
  accentIsFinalOnly, areMirrorConfusable, hasAdjacentVowels,
  hasOnlyOpenSyllables, stripDiacritics, syllabify,
} from '@/content/invariants';

describe('stripDiacritics', () => {
  it('quita la tilde sin tocar la ñ', () => {
    expect(stripDiacritics('mamá')).toBe('mama');
    expect(stripDiacritics('uña')).toBe('uña');
  });
});

describe('syllabify', () => {
  it('parte palabras CV-CV', () => {
    expect(syllabify('mapa')).toEqual(['ma', 'pa']);
    expect(syllabify('mamá')).toEqual(['ma', 'má']);
  });

  it('reconoce una vocal suelta como sílaba', () => {
    expect(syllabify('ala')).toEqual(['a', 'la']);
    expect(syllabify('oso')).toEqual(['o', 'so']);
  });

  it('devuelve vacío si la palabra no es solo CV o V', () => {
    expect(syllabify('pan')).toEqual([]);
    expect(syllabify('plato')).toEqual([]);
  });
});

describe('hasOnlyOpenSyllables', () => {
  it('acepta CV y V, rechaza CVC y CCV', () => {
    expect(hasOnlyOpenSyllables('mapa')).toBe(true);
    expect(hasOnlyOpenSyllables('ala')).toBe(true);
    expect(hasOnlyOpenSyllables('pan')).toBe(false);
    expect(hasOnlyOpenSyllables('plato')).toBe(false);
  });
});

describe('hasAdjacentVowels', () => {
  it('detecta hiatos y diptongos', () => {
    expect(hasAdjacentVowels('mío')).toBe(true);
    expect(hasAdjacentVowels('tiene')).toBe(true);
    expect(hasAdjacentVowels('mapa')).toBe(false);
  });
});

describe('accentIsFinalOnly', () => {
  it('acepta la tilde en la última sílaba', () => {
    expect(accentIsFinalOnly('mamá')).toBe(true);
    expect(accentIsFinalOnly('papá')).toBe(true);
  });

  it('rechaza la tilde en cualquier otra posición', () => {
    expect(accentIsFinalOnly('árbol')).toBe(false);
    expect(accentIsFinalOnly('página')).toBe(false);
  });

  it('acepta una palabra sin tilde', () => {
    expect(accentIsFinalOnly('mapa')).toBe(true);
  });
});

describe('areMirrorConfusable', () => {
  it('agrupa b, d, p y q', () => {
    expect(areMirrorConfusable('b', 'd')).toBe(true);
    expect(areMirrorConfusable('p', 'q')).toBe(true);
    expect(areMirrorConfusable('b', 'q')).toBe(true);
  });

  it('no agrupa letras de formas distintas', () => {
    expect(areMirrorConfusable('m', 'a')).toBe(false);
    expect(areMirrorConfusable('b', 'b')).toBe(false);
  });
});
