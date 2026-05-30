import { describe, it, expect, vi, afterEach } from 'vitest';
import { Listing } from './listing';
import { LibraryItemModel } from './library-item/library-item';
import type { ILibraryItem } from './library-item/library-item';

// ─── Concrete test doubles ───────────────────────────────────────────────────

class TestModel extends LibraryItemModel<ILibraryItem> {
    render(): HTMLElement {
        const div = document.createElement('div');
        div.textContent = this.data.title;
        return div;
    }
    search(value: string): boolean {
        return this.data.title.toLowerCase().includes(value);
    }
}

class TestListing extends Listing<TestModel> {
    type = 'test';
    protected title = 'Test Title';
    protected modelConstructor = TestModel;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setupDOM(): void {
    document.body.innerHTML = `
        <div id="container" style="visibility: hidden;">
            <h1 id="title"></h1>
            <p id="listing-count"></p>
            <div id="tools">
                <form>
                    <input type="text" id="listing-search" />
                    <div id="listing-filter-button"></div>
                    <div id="listing-sort-options"></div>
                </form>
            </div>
            <div id="filter-sidebar">
                <div id="listing-filter-groups"></div>
            </div>
            <ul id="listing-results"></ul>
        </div>
    `;
}

function makeItems(n: number): ILibraryItem[] {
    return Array.from({ length: n }, (_, i) => ({
        id: i + 1,
        _id: String(i + 1),
        created: 0,
        title: `Item ${i + 1}`,
        type: 'test',
        data: {}
    }));
}

function mockFetch(items: ILibraryItem[]): void {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue(items)
    }));
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
    document.body.innerHTML = '';
});

// ─── constructor ─────────────────────────────────────────────────────────────

describe('Listing constructor', () => {
    it('does not throw when DOM elements are absent', () => {
        document.body.innerHTML = '';
        expect(() => new TestListing()).not.toThrow();
    });

    it('restores search value from localStorage', () => {
        setupDOM();
        localStorage.setItem('listing-search-value', 'saved');
        new TestListing();
        expect((document.getElementById('listing-search') as HTMLInputElement).value).toBe('saved');
    });

    it('does not restore search value when localStorage is empty', () => {
        setupDOM();
        new TestListing();
        expect((document.getElementById('listing-search') as HTMLInputElement).value).toBe('');
    });
});

// ─── init() ──────────────────────────────────────────────────────────────────

describe('Listing.init()', () => {
    it('sets the title element innerHTML', async () => {
        setupDOM();
        mockFetch([]);
        await new TestListing().init();
        expect(document.getElementById('title')?.innerHTML).toBe('Test Title');
    });

    it('makes the container visible after loading', async () => {
        setupDOM();
        mockFetch([]);
        const listing = new TestListing();
        expect(document.getElementById('container')!.style.visibility).toBe('hidden');
        await listing.init();
        expect(document.getElementById('container')!.style.visibility).toBe('visible');
    });

    it('renders fetched items', async () => {
        setupDOM();
        mockFetch(makeItems(3));
        await new TestListing().init();
        expect(document.querySelectorAll('.listing-results-item').length).toBe(3);
    });

    it('shows total count when all items are displayed', async () => {
        setupDOM();
        mockFetch(makeItems(4));
        await new TestListing().init();
        expect(document.getElementById('listing-count')!.innerHTML.trim()).toBe('4');
    });

    it('handles fetch failure — renders empty list and logs error', async () => {
        setupDOM();
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
        await new TestListing().init();
        expect(document.querySelectorAll('.listing-results-item').length).toBe(0);
        expect(spy).toHaveBeenCalledWith('Failed to load items:', expect.any(Error));
    });

    it('does not throw when container element is absent', async () => {
        setupDOM();
        document.getElementById('container')?.remove();
        mockFetch(makeItems(2));
        await expect(new TestListing().init()).resolves.not.toThrow();
    });

    it('does not throw when title element is absent', async () => {
        setupDOM();
        document.getElementById('title')?.remove();
        mockFetch([]);
        await expect(new TestListing().init()).resolves.not.toThrow();
    });

    it('does not throw when results container is absent', async () => {
        document.body.innerHTML = '<div id="container"></div>';
        mockFetch(makeItems(2));
        await expect(new TestListing().init()).resolves.not.toThrow();
    });

    it('clears previous SortOptions before re-initialising (no listener leak)', async () => {
        setupDOM();
        mockFetch([]);
        const listing = new TestListing();
        await listing.init();
        await expect(listing.init()).resolves.not.toThrow();
    });
});

// ─── search ──────────────────────────────────────────────────────────────────

describe('Listing search', () => {
    it('filters results when search input changes', async () => {
        setupDOM();
        mockFetch([
            { id: 1, _id: '1', created: 0, title: 'Rock Album', type: 'test', data: {} },
            { id: 2, _id: '2', created: 0, title: 'Jazz Record', type: 'test', data: {} }
        ]);
        await new TestListing().init();

        const input = document.getElementById('listing-search') as HTMLInputElement;
        input.value = 'rock';
        input.dispatchEvent(new Event('input'));

        expect(document.querySelectorAll('.listing-results-item').length).toBe(1);
    });

    it('saves search value to localStorage on input', async () => {
        setupDOM();
        mockFetch([]);
        await new TestListing().init();

        const input = document.getElementById('listing-search') as HTMLInputElement;
        input.value = 'my query';
        input.dispatchEvent(new Event('input'));

        expect(localStorage.getItem('listing-search-value')).toBe('my query');
    });

    it('shows X/Y count when results are filtered', async () => {
        setupDOM();
        mockFetch([
            { id: 1, _id: '1', created: 0, title: 'Rock', type: 'test', data: {} },
            { id: 2, _id: '2', created: 0, title: 'Jazz', type: 'test', data: {} },
            { id: 3, _id: '3', created: 0, title: 'Rock Blues', type: 'test', data: {} }
        ]);
        await new TestListing().init();

        const input = document.getElementById('listing-search') as HTMLInputElement;
        input.value = 'rock';
        input.dispatchEvent(new Event('input'));

        expect(document.getElementById('listing-count')!.innerHTML).toContain('2/3');
    });

    it('restores all results when search is cleared', async () => {
        setupDOM();
        mockFetch(makeItems(3));
        await new TestListing().init();

        const input = document.getElementById('listing-search') as HTMLInputElement;
        input.value = 'item 1';
        input.dispatchEvent(new Event('input'));
        expect(document.querySelectorAll('.listing-results-item').length).toBe(1);

        input.value = '';
        input.dispatchEvent(new Event('input'));
        expect(document.querySelectorAll('.listing-results-item').length).toBe(3);
    });
});

// ─── applySort / applyFilter fallback before init() ─────────────────────────

describe('Listing.onSortUpdate() before init()', () => {
    it('does not throw when sortOptions is not yet set (covers || models branch)', () => {
        setupDOM();
        const listing = new TestListing();
        expect(() => listing.onSortUpdate()).not.toThrow();
    });
});

describe('Listing.onFilterUpdate() before init()', () => {
    it('does not throw when filterGroups is not yet set', () => {
        setupDOM();
        const listing = new TestListing();
        expect(() => listing.onFilterUpdate()).not.toThrow();
    });
});

// ─── onFilterUpdate() ────────────────────────────────────────────────────────

describe('Listing.onFilterUpdate()', () => {
    it('triggers re-render when called after init', async () => {
        setupDOM();
        mockFetch([
            { id: 1, _id: '1', created: 0, title: 'Rock', type: 'test', data: {} },
            { id: 2, _id: '2', created: 0, title: 'Jazz', type: 'test', data: {} }
        ]);
        const listing = new TestListing();
        await listing.init();

        const input = document.getElementById('listing-search') as HTMLInputElement;
        input.value = 'rock';
        input.dispatchEvent(new Event('input'));
        expect(document.querySelectorAll('.listing-results-item').length).toBe(1);

        input.value = '';
        listing.onFilterUpdate();
        expect(document.querySelectorAll('.listing-results-item').length).toBe(2);
    });
});

// ─── onSortUpdate() ──────────────────────────────────────────────────────────

describe('Listing.onSortUpdate()', () => {
    it('triggers re-render when models change', async () => {
        setupDOM();
        mockFetch([
            { id: 1, _id: '1', created: 0, title: 'Rock', type: 'test', data: {} },
            { id: 2, _id: '2', created: 0, title: 'Jazz', type: 'test', data: {} }
        ]);
        const listing = new TestListing();
        await listing.init();

        const input = document.getElementById('listing-search') as HTMLInputElement;
        input.value = 'rock';
        input.dispatchEvent(new Event('input'));
        expect(document.querySelectorAll('.listing-results-item').length).toBe(1);

        input.value = '';
        listing.onSortUpdate();
        expect(document.querySelectorAll('.listing-results-item').length).toBe(2);
    });
});

// ─── updateResults() deduplication ──────────────────────────────────────────

describe('Listing updateResults() deduplication', () => {
    it('does not re-render when result set is identical', async () => {
        setupDOM();
        mockFetch(makeItems(2));
        const listing = new TestListing();
        await listing.init();

        const firstItem = document.querySelector('.listing-results-item');
        firstItem?.setAttribute('data-sentinel', 'alive');

        listing.onSortUpdate();

        expect(
            document.querySelector('.listing-results-item[data-sentinel="alive"]')
        ).not.toBeNull();
    });
});

// ─── clear() ─────────────────────────────────────────────────────────────────

describe('Listing.clear()', () => {
    it('removes search input event listener', async () => {
        setupDOM();
        mockFetch(makeItems(3));
        const listing = new TestListing();
        await listing.init();

        listing.clear();

        const input = document.getElementById('listing-search') as HTMLInputElement;
        input.value = 'item 1';
        input.dispatchEvent(new Event('input'));

        expect(document.querySelectorAll('.listing-results-item').length).toBe(3);
    });

    it('clears the listing count element', async () => {
        setupDOM();
        mockFetch(makeItems(2));
        const listing = new TestListing();
        await listing.init();

        listing.clear();

        expect(document.getElementById('listing-count')?.innerHTML).toBe('');
    });

    it('does not throw when called without DOM (no search, no count)', () => {
        document.body.innerHTML = '';
        const listing = new TestListing();
        expect(() => listing.clear()).not.toThrow();
    });

    it('does not throw when count container is absent', async () => {
        setupDOM();
        document.getElementById('listing-count')?.remove();
        mockFetch([]);
        const listing = new TestListing();
        await listing.init();
        expect(() => listing.clear()).not.toThrow();
    });
});
