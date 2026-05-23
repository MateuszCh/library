import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SortOptions } from './sort-options';
import type { ISortOptionConfig } from './sort-option';
import type { Listing } from '../listing';
import type { LibraryItemModel, ILibraryItem } from '../library-item/library-item';

const CONFIGS: ISortOptionConfig[] = [
    { label: 'Recent purchases', codes: ['purchase_date'], order: 'desc', type: 'date', default: true },
    { label: 'Oldest purchases', codes: ['purchase_date'], order: 'asc', type: 'date' },
    { label: 'A-Z', codes: ['artist'], order: 'asc', type: 'string' }
];

function makeListing(): Listing<LibraryItemModel> {
    return {
        type: 'record',
        onSortUpdate: vi.fn()
    } as unknown as Listing<LibraryItemModel>;
}

function makeContainer(): HTMLElement {
    const el = document.createElement('div');
    document.body.appendChild(el);
    return el;
}

function makeModel(data: Record<string, unknown>): LibraryItemModel {
    return { id: Math.random(), data: { data } } as unknown as LibraryItemModel;
}

// ─── constructor / getDefaultOption ──────────────────────────────────────────

describe('SortOptions — default option', () => {
    afterEach(() => {
        localStorage.clear();
        document.body.innerHTML = '';
    });

    it('picks the config with default:true when localStorage is empty', () => {
        const listing = makeListing();
        const container = makeContainer();
        const so = new SortOptions(CONFIGS, listing, container);
        const models = [makeModel({ purchase_date: '2023-01-01' })];
        expect(so.sort(models)).toEqual(models);
    });

    it('restores option from localStorage by codes + order', () => {
        const azConfig = CONFIGS[2];
        localStorage.setItem(
            'listing-sort-options-record',
            JSON.stringify(azConfig)
        );
        const container = makeContainer();
        const so = new SortOptions(CONFIGS, makeListing(), container);
        const m1 = makeModel({ artist: 'Zeppelin' });
        const m2 = makeModel({ artist: 'Beatles' });
        const sorted = so.sort([m1, m2]);
        expect(sorted[0]).toBe(m2);
        expect(sorted[1]).toBe(m1);
    });

    it('falls back to default when localStorage has unrecognised config', () => {
        localStorage.setItem(
            'listing-sort-options-record',
            JSON.stringify({ label: 'Ghost', codes: ['unknown'], order: 'asc', type: 'string' })
        );
        const container = makeContainer();
        const so = new SortOptions(CONFIGS, makeListing(), container);
        expect(so.sort([])).toEqual([]);
    });

    it('falls back to first option when localStorage JSON is invalid', () => {
        localStorage.setItem('listing-sort-options-record', '{broken json');
        const container = makeContainer();
        expect(() => new SortOptions(CONFIGS, makeListing(), container)).not.toThrow();
    });
});

// ─── sort() ───────────────────────────────────────────────────────────────────

describe('SortOptions.sort()', () => {
    afterEach(() => {
        localStorage.clear();
        document.body.innerHTML = '';
    });

    it('delegates to the current SortOption', () => {
        const container = makeContainer();
        const so = new SortOptions(CONFIGS, makeListing(), container);
        const m1 = makeModel({ purchase_date: '2020-01-01' });
        const m2 = makeModel({ purchase_date: '2024-06-15' });
        const sorted = so.sort([m1, m2]);
        expect(sorted[0]).toBe(m2);
    });

    it('returns models unchanged when no options are configured', () => {
        const container = makeContainer();
        const so = new SortOptions([], makeListing(), container);
        const models = [makeModel({}), makeModel({})];
        expect(so.sort(models)).toBe(models);
    });
});

// ─── updateCurrentOption() ───────────────────────────────────────────────────

describe('SortOptions.updateCurrentOption()', () => {
    afterEach(() => {
        localStorage.clear();
        document.body.innerHTML = '';
    });

    it('calls listing.onSortUpdate() when option changes', () => {
        const listing = makeListing();
        const container = makeContainer();
        const so = new SortOptions(CONFIGS, listing, container);
        const buttons = container.querySelectorAll('button.listing-sort-options-list-item-button');
        (buttons[2] as HTMLButtonElement).click();
        expect(listing.onSortUpdate).toHaveBeenCalled();
    });

    it('saves chosen option to localStorage', () => {
        const container = makeContainer();
        const so = new SortOptions(CONFIGS, makeListing(), container);
        const buttons = container.querySelectorAll('button.listing-sort-options-list-item-button');
        (buttons[2] as HTMLButtonElement).click();
        const stored = JSON.parse(localStorage.getItem('listing-sort-options-record') ?? '{}');
        expect(stored.codes).toEqual(['artist']);
        expect(stored.order).toBe('asc');
    });

    it('does not call onSortUpdate() when same option is selected again', () => {
        const listing = makeListing();
        const container = makeContainer();
        const so = new SortOptions(CONFIGS, listing, container);
        const firstButton = container.querySelectorAll('button.listing-sort-options-list-item-button')[0] as HTMLButtonElement;
        firstButton.click();
        expect(listing.onSortUpdate).not.toHaveBeenCalled();
    });
});

// ─── render (UI) ─────────────────────────────────────────────────────────────

describe('SortOptions rendering', () => {
    afterEach(() => {
        localStorage.clear();
        document.body.innerHTML = '';
    });

    it('renders a toggle button and a list when options.length > 1', () => {
        const container = makeContainer();
        new SortOptions(CONFIGS, makeListing(), container);
        expect(container.querySelector('button.listing-sort-options-button')).not.toBeNull();
        expect(container.querySelector('ul.listing-sort-options-list')).not.toBeNull();
    });

    it('does NOT render UI when there is only one option', () => {
        const container = makeContainer();
        new SortOptions([CONFIGS[0]], makeListing(), container);
        expect(container.querySelector('button')).toBeNull();
    });

    it('renders one list item per config', () => {
        const container = makeContainer();
        new SortOptions(CONFIGS, makeListing(), container);
        const items = container.querySelectorAll('li.listing-sort-options-list-item');
        expect(items.length).toBe(CONFIGS.length);
    });

    it('toggle button opens and closes the list', () => {
        const container = makeContainer();
        new SortOptions(CONFIGS, makeListing(), container);
        const btn = container.querySelector('button.listing-sort-options-button') as HTMLButtonElement;
        const list = container.querySelector('ul') as HTMLUListElement;
        expect(list.classList.contains('listing-sort-options-list-visible')).toBe(false);
        btn.click();
        expect(list.classList.contains('listing-sort-options-list-visible')).toBe(true);
        btn.click();
        expect(list.classList.contains('listing-sort-options-list-visible')).toBe(false);
    });
});

// ─── clear() ─────────────────────────────────────────────────────────────────

describe('SortOptions with single option (UI not rendered)', () => {
    afterEach(() => {
        localStorage.clear();
        document.body.innerHTML = '';
    });

    it('toggle() with undefined button/list does not throw', () => {
        const container = makeContainer();
        const so = new SortOptions([CONFIGS[0]], makeListing(), container);
        const option = (so as any).options[0];
        expect(() => so.updateCurrentOption(option)).not.toThrow();
    });

    it('clear() with undefined button does not throw', () => {
        const container = makeContainer();
        const so = new SortOptions([CONFIGS[0]], makeListing(), container);
        expect(() => so.clear()).not.toThrow();
    });
});

describe('SortOptions.clear()', () => {
    afterEach(() => {
        localStorage.clear();
        document.body.innerHTML = '';
    });

    it('removes toggle button click listener after clear()', () => {
        const listing = makeListing();
        const container = makeContainer();
        const so = new SortOptions(CONFIGS, listing, container);
        so.clear();
        const btn = container.querySelector('button.listing-sort-options-button') as HTMLButtonElement;
        btn.click();
        const list = container.querySelector('ul') as HTMLUListElement;
        expect(list.classList.contains('listing-sort-options-list-visible')).toBe(false);
    });

    it('removes item click listeners after clear()', () => {
        const listing = makeListing();
        const container = makeContainer();
        const so = new SortOptions(CONFIGS, listing, container);
        so.clear();
        const itemBtn = container.querySelectorAll(
            'button.listing-sort-options-list-item-button'
        )[2] as HTMLButtonElement;
        itemBtn.click();
        expect(listing.onSortUpdate).not.toHaveBeenCalled();
    });
});
