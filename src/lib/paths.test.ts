import { describe, expect, it } from 'vitest';
import { toCsv, sortingPrompt } from './export';
import { groupOf, hasThumbnail, viewerKind } from './fileTypes';
import { basename, crumbs, dirname, extOf, join, prettyName } from './paths';

describe('paths', () => {
  it('dirname/basename', () => {
    expect(dirname('/a/b/c.pdf')).toBe('/a/b');
    expect(dirname('/c.pdf')).toBe('/');
    expect(basename('/a/b/')).toBe('b');
  });
  it('join normalises slashes', () => {
    expect(join('/a/', '/b')).toBe('/a/b');
  });
  it('crumbs start at the root', () => {
    expect(crumbs('/a/b')).toEqual([{ name: 'Archiv', path: '/' }, { name: 'a', path: '/a' }, { name: 'b', path: '/a/b' }]);
  });
  it('prettyName strips sort prefixes', () => {
    expect(prettyName('01_Dokumente')).toBe('Dokumente');
    expect(prettyName('Reisen_Events')).toBe('Reisen Events');
  });
  it('extOf', () => {
    expect(extOf('Foto.JPG')).toBe('jpg');
    expect(extOf('.htaccess')).toBe('');
  });
});

describe('file types', () => {
  it('groups extensions', () => {
    expect(groupOf('PDF')).toBe('dokumente');
    expect(groupOf('mts')).toBe('videos');
    expect(groupOf('xyz')).toBe('sonstiges');
  });
  it('knows which files can be previewed', () => {
    expect(viewerKind('docx')).toBe('docx');
    expect(viewerKind('mp4')).toBe('video');
    expect(viewerKind('heic')).toBeNull();
    expect(hasThumbnail('jpg')).toBe(true);
    expect(hasThumbnail('pdf')).toBe(false);
  });
});

describe('export', () => {
  it('escapes csv cells and starts with a BOM', () => {
    const csv = toCsv(['A', 'B'], [['x;y', 'He said "hi"']]);
    expect(csv.startsWith('\ufeff')).toBe(true);
    expect(csv).toContain('"x;y";"He said ""hi"""');
  });
  it('builds a prompt that forbids acting before approval', () => {
    const p = sortingPrompt('Test.', ['/a/b.pdf'], 'Y:\\Archiv');
    expect(p).toContain('Y:\\Archiv\\a\\b.pdf');
    expect(p).toContain('nichts verschieben');
  });
});
