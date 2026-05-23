import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SortOption, type ISortOptionConfig } from './sort-option';
import type { SortOptions } from './sort-options';
import type { LibraryItemModel, ILibraryItem } from '../library-item/library-item';

function makeSortOptions(): SortOptions<LibraryItemModel> {
    return {
        updateCurrentOption: vi.fn(),
        isActive: vi.fn(() => false)
    } as unknown as SortOptions<LibraryItemModel>;
}

function makeOption(config: Partial<ISortOptionConfig>): SortOption<LibraryItemModel> {
    const defaults: ISortOptionConfig = {
        label: 'Test',
        codes: ['release_date'],
        order: 'desc',
        type: 'date'
    };
    return new SortOption({ ...defaults, ...config }, makeSortOptions());
}

function makeModel(data: Record<string, unknown>): LibraryItemModel {
    return {
        id: Math.random(),
        data: { data }
    } as unknown as LibraryItemModel;
}

// ─── applySort — date ─────────────────────────────────────────────────────────

describe('SortOption.applySort() — type: date', () => {
    const models = [
        makeModel({ release_date: '1979-11-30' }),
        makeModel({ release_date: '1971-11-08' }),
        makeModel({ release_date: '1987-09-07' })
    ];

    it('sorts descending (newest first)', () => {
        const opt = makeOption({ codes: ['release_date'], order: 'desc', type: 'date' });
        const sorted = opt.applySort([...models]);
        expect(sorted[0].data.data['release_date']).toBe('1987-09-07');
        expect(sorted[1].data.data['release_date']).toBe('1979-11-30');
        expect(sorted[2].data.data['release_date']).toBe('1971-11-08');
    });

    it('sorts ascending (oldest first)', () => {
        const opt = makeOption({ codes: ['release_date'], order: 'asc', type: 'date' });
        const sorted = opt.applySort([...models]);
        expect(sorted[0].data.data['release_date']).toBe('1971-11-08');
        expect(sorted[2].data.data['release_date']).toBe('1987-09-07');
    });

    it('puts models with undefined date value at the end', () => {
        const opt = makeOption({ codes: ['release_date'], order: 'desc', type: 'date' });
        const withUndefined = makeModel({});
        const result = opt.applySort([withUndefined, ...models]);
        expect(result[result.length - 1]).toBe(withUndefined);
    });

    it('puts models with invalid date string at the end (isNaN fix)', () => {
        const opt = makeOption({ codes: ['release_date'], order: 'desc', type: 'date' });
        const invalid = makeModel({ release_date: 'not-a-date' });
        const valid = makeModel({ release_date: '1979-11-30' });
        const result = opt.applySort([invalid, valid]);
        expect(result[0]).toBe(valid);
        expect(result[1]).toBe(invalid);
    });

    it('returns empty array when input is empty', () => {
        const opt = makeOption({ codes: ['release_date'], order: 'desc', type: 'date' });
        expect(opt.applySort([])).toEqual([]);
    });
});

// ─── applySort — string ───────────────────────────────────────────────────────

describe('SortOption.applySort() — type: string', () => {
    const models = [
        makeModel({ artist: 'Led Zeppelin' }),
        makeModel({ artist: 'Beatles' }),
        makeModel({ artist: 'Pink Floyd' })
    ];

    it('sorts ascending A-Z by single code', () => {
        const opt = makeOption({ codes: ['artist'], order: 'asc', type: 'string' });
        const sorted = opt.applySort([...models]);
        expect(sorted[0].data.data['artist']).toBe('Beatles');
        expect(sorted[1].data.data['artist']).toBe('Led Zeppelin');
        expect(sorted[2].data.data['artist']).toBe('Pink Floyd');
    });

    it('sorts descending Z-A by single code', () => {
        const opt = makeOption({ codes: ['artist'], order: 'desc', type: 'string' });
        const sorted = opt.applySort([...models]);
        expect(sorted[0].data.data['artist']).toBe('Pink Floyd');
        expect(sorted[2].data.data['artist']).toBe('Beatles');
    });

    it('sorts by multiple codes concatenated', () => {
        const m1 = makeModel({ artist: 'B Artist', title: 'A Title' });
        const m2 = makeModel({ artist: 'A Artist', title: 'Z Title' });
        const opt = makeOption({ codes: ['artist', 'title'], order: 'asc', type: 'string' });
        const sorted = opt.applySort([m1, m2]);
        expect(sorted[0]).toBe(m2);
    });

    it('puts models with missing field at the end', () => {
        const opt = makeOption({ codes: ['artist'], order: 'asc', type: 'string' });
        const missing = makeModel({});
        const result = opt.applySort([missing, ...models]);
        expect(result[result.length - 1]).toBe(missing);
    });
});

// ─── isDefault ───────────────────────────────────────────────────────────────

describe('SortOption.isDefault', () => {
    it('returns true when config.default is true', () => {
        const opt = makeOption({ default: true });
        expect(opt.isDefault).toBe(true);
    });

    it('returns false when config.default is absent', () => {
        const opt = makeOption({});
        expect(opt.isDefault).toBe(false);
    });
});

// ─── label ───────────────────────────────────────────────────────────────────

describe('SortOption.label', () => {
    it('returns the label from config', () => {
        const opt = makeOption({ label: 'Recent purchases' });
        expect(opt.label).toBe('Recent purchases');
    });
});

// ─── render() ─────────────────────────────────────────────────────────────────

describe('SortOption.render()', () => {
    it('returns an li element', () => {
        const opt = makeOption({ label: 'A-Z' });
        const el = opt.render();
        expect(el.tagName).toBe('LI');
    });

    it('button has the label text', () => {
        const opt = makeOption({ label: 'A-Z' });
        const btn = opt.render().querySelector('button');
        expect(btn?.innerHTML).toBe('A-Z');
    });

    it('clicking button calls updateCurrentOption', () => {
        const sortOptions = makeSortOptions();
        const opt = new SortOption(
            { label: 'A-Z', codes: ['artist'], order: 'asc', type: 'string' },
            sortOptions
        );
        const btn = opt.render().querySelector('button')!;
        btn.click();
        expect(sortOptions.updateCurrentOption).toHaveBeenCalledWith(opt);
    });
});

// ─── clear() ─────────────────────────────────────────────────────────────────

describe('SortOption.clear()', () => {
    it('removes click listener — clicking after clear does not call updateCurrentOption', () => {
        const sortOptions = makeSortOptions();
        const opt = new SortOption(
            { label: 'A-Z', codes: ['artist'], order: 'asc', type: 'string' },
            sortOptions
        );
        const btn = opt.render().querySelector('button')!;
        opt.clear();
        btn.click();
        expect(sortOptions.updateCurrentOption).not.toHaveBeenCalled();
    });

    it('does not throw when clear() is called before render() (button is undefined)', () => {
        const opt = makeOption({});
        expect(() => opt.clear()).not.toThrow();
    });
});
