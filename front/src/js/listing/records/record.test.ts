import { describe, it, expect, beforeEach } from 'vitest';
import { RecordModel } from './record';
import type { IRecordLibraryItem, IRecordData } from './record';

function makeModel(data: Partial<IRecordData> = {}, base: Partial<IRecordLibraryItem> = {}): RecordModel {
    return new RecordModel({
        id: 1,
        created: 0,
        title: '',
        type: 'record',
        _id: 'abc',
        data,
        ...base
    } as IRecordLibraryItem);
}

// ─── search() ────────────────────────────────────────────────────────────────

describe('RecordModel.search()', () => {
    it('matches by artist (searchValue is pre-lowercased by caller)', () => {
        const m = makeModel({ artist: 'Pink Floyd' });
        expect(m.search('pink')).toBe(true);
        expect(m.search('floyd')).toBe(true);
        expect(m.search('pink floyd')).toBe(true);
    });

    it('matches by title (searchValue is pre-lowercased by caller)', () => {
        const m = makeModel({ title: 'The Wall' });
        expect(m.search('wall')).toBe(true);
        expect(m.search('the wall')).toBe(true);
    });

    it('matches by genre', () => {
        const m = makeModel({ genre: ['Rock', 'Progressive Rock'] });
        expect(m.search('progressive')).toBe(true);
        expect(m.search('rock')).toBe(true);
    });

    it('matches by release year', () => {
        const m = makeModel({ release_date: '1979-11-30' });
        expect(m.search('1979')).toBe(true);
    });

    it('returns false when nothing matches', () => {
        const m = makeModel({ artist: 'Pink Floyd', title: 'The Wall' });
        expect(m.search('beatles')).toBe(false);
    });

    it('returns false for empty model data', () => {
        const m = makeModel();
        expect(m.search('anything')).toBe(false);
    });

    it('empty searchValue matches everything (caller is responsible for filtering empty values)', () => {
        const m = makeModel({ artist: 'Pink Floyd' });
        expect(m.search('')).toBe(true);
    });
});

// ─── render() ────────────────────────────────────────────────────────────────

describe('RecordModel.render()', () => {
    it('returns an HTMLElement', () => {
        const m = makeModel({ artist: 'Led Zeppelin', title: 'IV' });
        expect(m.render()).toBeInstanceOf(HTMLElement);
    });

    it('returns the same element on repeated calls (memoized)', () => {
        const m = makeModel({ artist: 'Led Zeppelin', title: 'IV' });
        expect(m.render()).toBe(m.render());
    });

    it('renders artist and title in the heading', () => {
        const m = makeModel({ artist: 'Led Zeppelin', title: 'IV' });
        const el = m.render();
        const h3 = el.querySelector('h3.record-item-title');
        expect(h3?.textContent?.trim()).toBe('Led Zeppelin - IV');
    });

    it('renders only title when artist is absent', () => {
        const m = makeModel({ title: 'IV' });
        const h3 = m.render().querySelector('h3.record-item-title');
        expect(h3?.textContent?.trim()).toBe('IV');
    });

    it('renders only artist when title is absent', () => {
        const m = makeModel({ artist: 'Led Zeppelin' });
        const h3 = m.render().querySelector('h3.record-item-title');
        expect(h3?.textContent?.trim()).toBe('Led Zeppelin');
    });

    it('renders genres when present', () => {
        const m = makeModel({ genre: ['rock', 'blues'] });
        const p = m.render().querySelector('p.record-item-genres');
        expect(p).not.toBeNull();
        expect(p?.textContent?.trim()).toBe('Rock, Blues');
    });

    it('does not render genres element when genre list is empty', () => {
        const m = makeModel({ genre: [] });
        const p = m.render().querySelector('p.record-item-genres');
        expect(p).toBeNull();
    });

    it('does not render genres element when genre is absent', () => {
        const m = makeModel();
        const p = m.render().querySelector('p.record-item-genres');
        expect(p).toBeNull();
    });

    it('renders cover image when cover is present', () => {
        const m = makeModel({ cover: '/uploads/cover.jpg' });
        const img = m.render().querySelector('img.record-item-image');
        expect(img).not.toBeNull();
        expect((img as HTMLImageElement).src).toContain('/uploads/cover.jpg');
    });

    it('does not render cover image when cover is absent', () => {
        const m = makeModel();
        const img = m.render().querySelector('img.record-item-image');
        expect(img).toBeNull();
    });

    it('renders back cover image when back_cover is present', () => {
        const m = makeModel({ back_cover: '/uploads/back.jpg' });
        const img = m.render().querySelector('img.record-item-image-back');
        expect(img).not.toBeNull();
        expect((img as HTMLImageElement).src).toContain('/uploads/back.jpg');
    });

    it('renders release date when present', () => {
        const m = makeModel({ release_date: '1971-11-08' });
        const dates = m.render().querySelectorAll('p.record-item-date');
        const texts = Array.from(dates).map(p => p.textContent?.trim() ?? '');
        expect(texts.some(t => t.startsWith('Release date:'))).toBe(true);
    });

    it('renders purchase date when present', () => {
        const m = makeModel({ purchase_date: '2023-01-15' });
        const dates = m.render().querySelectorAll('p.record-item-date');
        const texts = Array.from(dates).map(p => p.textContent?.trim() ?? '');
        expect(texts.some(t => t.startsWith('Purchase date:'))).toBe(true);
    });

    it('does not render date elements when dates are absent', () => {
        const m = makeModel();
        const dates = m.render().querySelectorAll('p.record-item-date');
        expect(dates.length).toBe(0);
    });

    it('title textContent is plain text — no HTML injection', () => {
        const m = makeModel({ artist: '<script>alert(1)</script>', title: 'Safe' });
        const h3 = m.render().querySelector('h3.record-item-title');
        expect(h3?.textContent).toContain('<script>');
        expect(h3?.innerHTML).not.toContain('<script>');
    });

    it('genres textContent is plain text — no HTML injection', () => {
        const m = makeModel({ genre: ['<img src=x onerror=alert(1)>'] });
        const p = m.render().querySelector('p.record-item-genres');
        expect(p?.textContent).toContain('<img');
        expect(p?.innerHTML).not.toContain('<img');
    });
});

// ─── genres memoization ──────────────────────────────────────────────────────

describe('RecordModel genres memoization', () => {
    it('capitalises genre words', () => {
        const m = makeModel({ genre: ['progressive rock', 'blues'] });
        const p = m.render().querySelector('p.record-item-genres');
        expect(p?.textContent?.trim()).toBe('Progressive Rock, Blues');
    });

    it('genres element is absent for model without genres, and search still works (memoization does not break)', () => {
        const m = makeModel({ artist: 'Artist' });
        expect(m.search('artist')).toBe(true);
        expect(m.search('artist')).toBe(true);
        expect(m.render().querySelector('p.record-item-genres')).toBeNull();
    });

    it('handles empty word tokens from consecutive spaces in genre string (falsy word branch)', () => {
        const m = makeModel({ genre: ['rock  n  roll'] });
        const p = m.render().querySelector('p.record-item-genres');
        expect(p).not.toBeNull();
        expect(p?.textContent?.trim()).toContain('Rock');
    });
});

// ─── id getter ───────────────────────────────────────────────────────────────

describe('RecordModel.id', () => {
    it('returns id from base data', () => {
        const m = makeModel({}, { id: 42 });
        expect(m.id).toBe(42);
    });
});
