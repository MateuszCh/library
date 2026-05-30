import { describe, it, expect, vi, afterEach } from 'vitest';
import { FilterGroups } from './filter-groups';
import type { IFilterGroupConfig } from './filter-group';
import type { Listing } from '../listing';
import type { LibraryItemModel } from '../library-item/library-item';

const CONFIGS: IFilterGroupConfig[] = [
    { label: 'Genre', code: 'genre', type: 'string[]' },
    { label: 'Artist', code: 'artist', type: 'string' }
];

function makeListing(): Listing<LibraryItemModel> {
    return {
        type: 'record',
        onFilterUpdate: vi.fn()
    } as unknown as Listing<LibraryItemModel>;
}

function makeModel(data: Record<string, unknown>): LibraryItemModel {
    return { id: Math.random(), data: { data } } as unknown as LibraryItemModel;
}

function setupDOM(): {
    sidebar: HTMLElement;
    filterGroups: HTMLElement;
    buttonContainer: HTMLElement;
    modalOverlay: HTMLElement;
    modalBody: HTMLElement;
    modalClose: HTMLElement;
} {
    document.body.innerHTML = `
        <div id="filter-sidebar">
            <div id="listing-filter-groups"></div>
        </div>
        <div id="listing-filter-button"></div>
        <div id="filter-modal-overlay">
            <div id="filter-modal">
                <button id="filter-modal-close"></button>
                <div id="filter-modal-body"></div>
            </div>
        </div>
    `;
    return {
        sidebar: document.getElementById('filter-sidebar')!,
        filterGroups: document.getElementById('listing-filter-groups')!,
        buttonContainer: document.getElementById('listing-filter-button')!,
        modalOverlay: document.getElementById('filter-modal-overlay')!,
        modalBody: document.getElementById('filter-modal-body')!,
        modalClose: document.getElementById('filter-modal-close')!
    };
}

afterEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
});

// ─── filter ───────────────────────────────────────────────────────────────────

describe('FilterGroups.filter()', () => {
    it('returns all models when no group has selection', () => {
        const { filterGroups, buttonContainer } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        const models = [
            makeModel({ genre: ['Rock'], artist: 'Pink Floyd' }),
            makeModel({ genre: ['Jazz'], artist: 'Miles Davis' })
        ];
        fg.buildValues(models);
        expect(fg.filter(models)).toHaveLength(2);
    });

    it('AND logic across groups: model must satisfy all active groups', () => {
        const { filterGroups, buttonContainer } = setupDOM();
        const listing = makeListing();
        const fg = new FilterGroups(CONFIGS, listing, filterGroups, buttonContainer);
        const models = [
            makeModel({ genre: ['Rock'], artist: 'Pink Floyd' }),
            makeModel({ genre: ['Rock'], artist: 'Led Zeppelin' }),
            makeModel({ genre: ['Jazz'], artist: 'Pink Floyd' })
        ];
        fg.buildValues(models);

        // Manually tick genre=Rock and artist=Pink Floyd
        const genreCheckbox = filterGroups.querySelector<HTMLInputElement>(
            '.filter-group:nth-child(2) input[value="Rock"]'
        )!;
        const artistCheckbox = filterGroups.querySelector<HTMLInputElement>(
            '.filter-group:nth-child(3) input[value="Pink Floyd"]'
        )!;
        genreCheckbox.checked = true;
        genreCheckbox.dispatchEvent(new Event('change'));
        artistCheckbox.checked = true;
        artistCheckbox.dispatchEvent(new Event('change'));

        const result = fg.filter(models);
        expect(result).toHaveLength(1);
        expect(result[0].data.data['artist']).toBe('Pink Floyd');
        expect(result[0].data.data['genre']).toContain('Rock');
    });

    it('single active group acts as OR within that group', () => {
        const { filterGroups, buttonContainer } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        const models = [
            makeModel({ genre: ['Rock'], artist: 'Pink Floyd' }),
            makeModel({ genre: ['Jazz'], artist: 'Miles Davis' }),
            makeModel({ genre: ['Pop'], artist: 'ABBA' })
        ];
        fg.buildValues(models);

        const rockCheckbox = filterGroups.querySelector<HTMLInputElement>(
            'input[value="Rock"]'
        )!;
        const jazzCheckbox = filterGroups.querySelector<HTMLInputElement>(
            'input[value="Jazz"]'
        )!;
        rockCheckbox.checked = true;
        rockCheckbox.dispatchEvent(new Event('change'));
        jazzCheckbox.checked = true;
        jazzCheckbox.dispatchEvent(new Event('change'));

        expect(fg.filter(models)).toHaveLength(2);
    });
});

// ─── buildValues ──────────────────────────────────────────────────────────────

describe('FilterGroups.buildValues()', () => {
    it('renders panels into sidebar container', () => {
        const { filterGroups, buttonContainer } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        const models = [makeModel({ genre: ['Rock'], artist: 'Pink Floyd' })];
        fg.buildValues(models);
        const details = filterGroups.querySelectorAll('details');
        expect(details.length).toBe(2);
    });

    it('renders one panel per config', () => {
        const { filterGroups, buttonContainer } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        fg.buildValues([makeModel({ genre: ['Rock'], artist: 'Pink Floyd' })]);
        const summaries = filterGroups.querySelectorAll('summary');
        const labels = Array.from(summaries).map(s => s.textContent);
        expect(labels).toContain('Genre');
        expect(labels).toContain('Artist');
    });
});

// ─── onFilterUpdate ───────────────────────────────────────────────────────────

describe('FilterGroups.onFilterUpdate()', () => {
    it('calls listing.onFilterUpdate()', () => {
        const { filterGroups, buttonContainer } = setupDOM();
        const listing = makeListing();
        const fg = new FilterGroups(CONFIGS, listing, filterGroups, buttonContainer);
        fg.buildValues([makeModel({ genre: ['Rock'], artist: 'Pink Floyd' })]);

        const checkbox = filterGroups.querySelector<HTMLInputElement>('input')!;
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));

        expect(listing.onFilterUpdate).toHaveBeenCalled();
    });

    it('saves state to localStorage after update', () => {
        const { filterGroups, buttonContainer } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        fg.buildValues([makeModel({ genre: ['Rock'], artist: 'Pink Floyd' })]);

        const checkbox = filterGroups.querySelector<HTMLInputElement>(
            'input[value="Rock"]'
        )!;
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));

        const stored = JSON.parse(
            localStorage.getItem('listing-filter-groups-record') || '{}'
        );
        expect(stored['genre']).toContain('Rock');
    });
});

// ─── rebuildAvailableOptions ──────────────────────────────────────────────────

describe('FilterGroups — rebuildAvailableOptions', () => {
    it('hides options in other groups that yield no results', () => {
        const { filterGroups, buttonContainer } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        fg.buildValues([
            makeModel({ genre: ['Rock'], artist: 'Pink Floyd' }),
            makeModel({ genre: ['Jazz'], artist: 'Miles Davis' })
        ]);

        const rockCheckbox = filterGroups.querySelector<HTMLInputElement>('input[value="Rock"]')!;
        rockCheckbox.checked = true;
        rockCheckbox.dispatchEvent(new Event('change'));

        const milesItem = Array.from(
            filterGroups.querySelectorAll<HTMLElement>('.filter-group-item')
        ).find(el => el.querySelector('input[value="Miles Davis"]'));
        expect(milesItem?.style.display).toBe('none');
    });

    it('keeps options visible when they still yield results', () => {
        const { filterGroups, buttonContainer } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        fg.buildValues([
            makeModel({ genre: ['Rock'], artist: 'Pink Floyd' }),
            makeModel({ genre: ['Jazz'], artist: 'Miles Davis' })
        ]);

        const rockCheckbox = filterGroups.querySelector<HTMLInputElement>('input[value="Rock"]')!;
        rockCheckbox.checked = true;
        rockCheckbox.dispatchEvent(new Event('change'));

        const pinkFloydItem = Array.from(
            filterGroups.querySelectorAll<HTMLElement>('.filter-group-item')
        ).find(el => el.querySelector('input[value="Pink Floyd"]'));
        expect(pinkFloydItem?.style.display).not.toBe('none');
    });
});

// ─── localStorage ─────────────────────────────────────────────────────────────

describe('FilterGroups localStorage', () => {
    it('restores selected values from storage on construction', () => {
        localStorage.setItem(
            'listing-filter-groups-record',
            JSON.stringify({ genre: ['Rock'], artist: [] })
        );
        const { filterGroups, buttonContainer } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        fg.buildValues([makeModel({ genre: ['Rock'], artist: 'Pink Floyd' })]);
        const checkbox = filterGroups.querySelector<HTMLInputElement>(
            'input[value="Rock"]'
        )!;
        expect(checkbox.checked).toBe(true);
    });

    it('handles invalid JSON gracefully', () => {
        localStorage.setItem('listing-filter-groups-record', '{broken json');
        const { filterGroups, buttonContainer } = setupDOM();
        expect(
            () =>
                new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer)
        ).not.toThrow();
    });

    it('handles storage with unknown code keys gracefully', () => {
        localStorage.setItem(
            'listing-filter-groups-record',
            JSON.stringify({ unknown_field: ['value'] })
        );
        const { filterGroups, buttonContainer } = setupDOM();
        expect(
            () =>
                new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer)
        ).not.toThrow();
    });

    it('handles null storage value gracefully', () => {
        localStorage.setItem('listing-filter-groups-record', 'null');
        const { filterGroups, buttonContainer } = setupDOM();
        expect(
            () =>
                new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer)
        ).not.toThrow();
    });
});

// ─── mobile button ────────────────────────────────────────────────────────────

describe('FilterGroups — mobile button', () => {
    it('renders a button into buttonContainer', () => {
        const { filterGroups, buttonContainer } = setupDOM();
        new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        expect(buttonContainer.querySelector('button')).not.toBeNull();
    });

    it('does not throw when buttonContainer is undefined', () => {
        const { filterGroups } = setupDOM();
        expect(
            () => new FilterGroups(CONFIGS, makeListing(), filterGroups, undefined)
        ).not.toThrow();
    });
});

// ─── modal ────────────────────────────────────────────────────────────────────

describe('FilterGroups — modal', () => {
    it('clicking mobile button adds open class to overlay', () => {
        const { filterGroups, buttonContainer, modalOverlay } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        fg.buildValues([makeModel({ genre: ['Rock'], artist: 'Pink Floyd' })]);

        const btn = buttonContainer.querySelector<HTMLButtonElement>('button')!;
        btn.click();

        expect(modalOverlay.classList.contains('filter-modal-overlay-open')).toBe(true);
    });

    it('clicking close button removes open class', () => {
        const { filterGroups, buttonContainer, modalOverlay, modalClose } =
            setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        fg.buildValues([makeModel({ genre: ['Rock'], artist: 'Pink Floyd' })]);

        const btn = buttonContainer.querySelector<HTMLButtonElement>('button')!;
        btn.click();
        modalClose.click();

        expect(modalOverlay.classList.contains('filter-modal-overlay-open')).toBe(
            false
        );
    });

    it('clicking overlay backdrop closes modal', () => {
        const { filterGroups, buttonContainer, modalOverlay } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        fg.buildValues([makeModel({ genre: ['Rock'], artist: 'Pink Floyd' })]);

        const btn = buttonContainer.querySelector<HTMLButtonElement>('button')!;
        btn.click();
        modalOverlay.dispatchEvent(
            new MouseEvent('click', { bubbles: true, target: modalOverlay } as MouseEventInit)
        );

        expect(modalOverlay.classList.contains('filter-modal-overlay-open')).toBe(
            false
        );
    });

    it('opening modal moves filterGroups container into modal body', () => {
        const { filterGroups, buttonContainer, modalBody } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        fg.buildValues([makeModel({ genre: ['Rock'], artist: 'Pink Floyd' })]);

        const btn = buttonContainer.querySelector<HTMLButtonElement>('button')!;
        btn.click();

        expect(modalBody.contains(filterGroups)).toBe(true);
    });

    it('closing modal returns filterGroups container to sidebar', () => {
        vi.useFakeTimers();
        const { sidebar, filterGroups, buttonContainer, modalClose } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        fg.buildValues([makeModel({ genre: ['Rock'], artist: 'Pink Floyd' })]);

        const btn = buttonContainer.querySelector<HTMLButtonElement>('button')!;
        btn.click();
        modalClose.click();
        vi.advanceTimersByTime(300);

        expect(sidebar.contains(filterGroups)).toBe(true);
        vi.useRealTimers();
    });

    it('does not throw when modal elements are absent', () => {
        document.body.innerHTML = `
            <div id="filter-sidebar">
                <div id="listing-filter-groups"></div>
            </div>
            <div id="listing-filter-button"></div>
        `;
        const filterGroups = document.getElementById('listing-filter-groups')!;
        const buttonContainer = document.getElementById('listing-filter-button')!;
        expect(
            () =>
                new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer)
        ).not.toThrow();
    });

    it('clicking button does not throw when modalBody is absent', () => {
        document.body.innerHTML = `
            <div id="filter-sidebar">
                <div id="listing-filter-groups"></div>
            </div>
            <div id="listing-filter-button"></div>
        `;
        const filterGroups = document.getElementById('listing-filter-groups')!;
        const buttonContainer = document.getElementById('listing-filter-button')!;
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        fg.buildValues([makeModel({ genre: ['Rock'] })]);
        const btn = buttonContainer.querySelector<HTMLButtonElement>('button')!;
        expect(() => btn.click()).not.toThrow();
    });

    it('closing modal does not throw when filter-sidebar is absent from DOM', () => {
        vi.useFakeTimers();
        const { filterGroups, buttonContainer, modalClose } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        fg.buildValues([makeModel({ genre: ['Rock'] })]);

        const btn = buttonContainer.querySelector<HTMLButtonElement>('button')!;
        btn.click();

        document.getElementById('filter-sidebar')?.remove();
        expect(() => {
            modalClose.click();
            vi.advanceTimersByTime(300);
        }).not.toThrow();
        vi.useRealTimers();
    });
});

// ─── renderSidebar defensive guard ───────────────────────────────────────────

describe('FilterGroups.buildValues() — group returning undefined element', () => {
    it('skips group that returns undefined from getElement()', () => {
        const { filterGroups, buttonContainer } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);

        // Patch internal groups to include one that always returns undefined
        const internalGroups = (
            fg as unknown as { groups: Array<{ buildValues: () => void; getElement: () => HTMLElement | undefined; filter: (m: unknown[]) => unknown[]; updateAvailableValues: () => void; selected: string[]; getValueLabel: (v: string) => string }> }
        ).groups;
        internalGroups.push({
            buildValues: vi.fn(),
            getElement: vi.fn(() => undefined),
            filter: (m: unknown[]) => m,
            updateAvailableValues: vi.fn(),
            selected: [],
            getValueLabel: (v: string) => v
        });

        expect(() =>
            fg.buildValues([makeModel({ genre: ['Rock'], artist: 'Pink Floyd' })])
        ).not.toThrow();
        expect(filterGroups.children.length).toBe(3); // chipsContainer + 2 real groups (undefined one skipped)
    });
});

// ─── filter chips ─────────────────────────────────────────────────────────────

describe('FilterGroups — filter chips', () => {
    it('renders a chip for each selected value', () => {
        const { filterGroups, buttonContainer } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        fg.buildValues([
            makeModel({ genre: ['Rock'], artist: 'Pink Floyd' }),
            makeModel({ genre: ['Jazz'], artist: 'Miles Davis' })
        ]);

        const checkbox = filterGroups.querySelector<HTMLInputElement>('input[value="Rock"]')!;
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));

        const chips = filterGroups.querySelectorAll('.filter-chip');
        expect(chips.length).toBe(1);
        expect(chips[0].textContent).toContain('Rock');
    });

    it('removes chip and deselects value when × is clicked', () => {
        const { filterGroups, buttonContainer } = setupDOM();
        const listing = makeListing();
        const fg = new FilterGroups(CONFIGS, listing, filterGroups, buttonContainer);
        fg.buildValues([makeModel({ genre: ['Rock'], artist: 'Pink Floyd' })]);

        const checkbox = filterGroups.querySelector<HTMLInputElement>('input[value="Rock"]')!;
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));

        const removeBtn = filterGroups.querySelector<HTMLButtonElement>('.filter-chip-remove')!;
        removeBtn.click();

        expect(filterGroups.querySelectorAll('.filter-chip').length).toBe(0);
        expect(listing.onFilterUpdate).toHaveBeenCalledTimes(2);
    });

    it('shows no chips when no filters are active', () => {
        const { filterGroups, buttonContainer } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        fg.buildValues([makeModel({ genre: ['Rock'], artist: 'Pink Floyd' })]);
        expect(filterGroups.querySelectorAll('.filter-chip').length).toBe(0);
    });

    it('shows reset button when filters are active', () => {
        const { filterGroups, buttonContainer } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        fg.buildValues([makeModel({ genre: ['Rock'], artist: 'Pink Floyd' })]);

        const checkbox = filterGroups.querySelector<HTMLInputElement>('input[value="Rock"]')!;
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));

        expect(filterGroups.querySelector('.filter-chips-reset')).not.toBeNull();
    });

    it('reset button clears all filters and updates listing', () => {
        const { filterGroups, buttonContainer } = setupDOM();
        const listing = makeListing();
        const fg = new FilterGroups(CONFIGS, listing, filterGroups, buttonContainer);
        fg.buildValues([
            makeModel({ genre: ['Rock'], artist: 'Pink Floyd' }),
            makeModel({ genre: ['Jazz'], artist: 'Miles Davis' })
        ]);

        filterGroups.querySelector<HTMLInputElement>('input[value="Rock"]')!.checked = true;
        filterGroups.querySelector<HTMLInputElement>('input[value="Rock"]')!.dispatchEvent(new Event('change'));
        filterGroups.querySelector<HTMLInputElement>('input[value="Pink Floyd"]')!.checked = true;
        filterGroups.querySelector<HTMLInputElement>('input[value="Pink Floyd"]')!.dispatchEvent(new Event('change'));

        filterGroups.querySelector<HTMLButtonElement>('.filter-chips-reset')!.click();

        expect(filterGroups.querySelectorAll('.filter-chip').length).toBe(0);
        expect(filterGroups.querySelector('.filter-chips-reset')).toBeNull();
        expect(fg.filter([
            makeModel({ genre: ['Rock'], artist: 'Pink Floyd' }),
            makeModel({ genre: ['Jazz'], artist: 'Miles Davis' })
        ])).toHaveLength(2);
    });
});

// ─── clear ────────────────────────────────────────────────────────────────────

describe('FilterGroups.clear()', () => {
    it('removes mobile button from DOM', () => {
        const { filterGroups, buttonContainer } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        fg.clear();
        expect(buttonContainer.querySelector('button')).toBeNull();
    });

    it('modal no longer opens after clear()', () => {
        const { filterGroups, buttonContainer, modalOverlay } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        fg.buildValues([makeModel({ genre: ['Rock'] })]);

        const btn = buttonContainer.querySelector<HTMLButtonElement>('button')!;
        fg.clear();
        btn.click();

        expect(modalOverlay.classList.contains('filter-modal-overlay-open')).toBe(
            false
        );
    });

    it('does not throw when called without prior buildValues', () => {
        const { filterGroups, buttonContainer } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        expect(() => fg.clear()).not.toThrow();
    });

    it('does not throw when mobileFilterButton was never rendered (no buttonContainer)', () => {
        const { filterGroups } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, undefined);
        expect(() => fg.clear()).not.toThrow();
    });
});

// ─── accordion toggle (bindToggleListeners) ───────────────────────────────────

describe('FilterGroups — accordion toggle', () => {
    it('clicking a closed summary opens the group', () => {
        const { filterGroups, buttonContainer } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        fg.buildValues([makeModel({ genre: ['Rock'], artist: 'Pink Floyd' })]);

        const details = filterGroups.querySelector<HTMLDetailsElement>('.filter-group')!;
        details.querySelector<HTMLElement>('summary')!.click();

        expect(details.hasAttribute('open')).toBe(true);
    });

    it('clicking an open summary closes the group', () => {
        const { filterGroups, buttonContainer } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        fg.buildValues([makeModel({ genre: ['Rock'], artist: 'Pink Floyd' })]);

        const details = filterGroups.querySelector<HTMLDetailsElement>('.filter-group')!;
        const summary = details.querySelector<HTMLElement>('summary')!;

        summary.click(); // open
        summary.click(); // close — no el.animate in jsdom so finish() runs immediately

        expect(details.hasAttribute('open')).toBe(false);
    });

    it('opening one group closes the currently open group', () => {
        const { filterGroups, buttonContainer } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        fg.buildValues([makeModel({ genre: ['Rock'], artist: 'Pink Floyd' })]);

        const allDetails = filterGroups.querySelectorAll<HTMLDetailsElement>('.filter-group');
        allDetails[0].querySelector<HTMLElement>('summary')!.click(); // open first
        allDetails[1].querySelector<HTMLElement>('summary')!.click(); // open second

        expect(allDetails[0].hasAttribute('open')).toBe(false);
        expect(allDetails[1].hasAttribute('open')).toBe(true);
    });
});

// ─── animation (mocked el.animate) ────────────────────────────────────────────

describe('FilterGroups — animation', () => {
    type MockAnim = { cancel: ReturnType<typeof vi.fn>; onfinish: null | (() => void) };

    function mockAnimate(details: HTMLDetailsElement): MockAnim {
        const anim: MockAnim = { cancel: vi.fn(), onfinish: null };
        (details as unknown as Record<string, unknown>)['animate'] = vi.fn(() => anim);
        return anim;
    }

    it('animateOpen calls el.animate with fill:backwards', () => {
        const { filterGroups, buttonContainer } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        fg.buildValues([makeModel({ genre: ['Rock'], artist: 'Pink Floyd' })]);

        const details = filterGroups.querySelector<HTMLDetailsElement>('.filter-group')!;
        const anim = mockAnimate(details);

        details.querySelector<HTMLElement>('summary')!.click();

        expect((details as unknown as Record<string, unknown>)['animate'])
            .toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ fill: 'backwards' }));
        expect(typeof anim.onfinish).toBe('function');
    });

    it('animateOpen onfinish calls cancel', () => {
        const { filterGroups, buttonContainer } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        fg.buildValues([makeModel({ genre: ['Rock'], artist: 'Pink Floyd' })]);

        const details = filterGroups.querySelector<HTMLDetailsElement>('.filter-group')!;
        const anim = mockAnimate(details);
        details.querySelector<HTMLElement>('summary')!.click();

        anim.onfinish!();
        expect(anim.cancel).toHaveBeenCalled();
    });

    it('animateClose calls el.animate with fill:forwards', () => {
        const { filterGroups, buttonContainer } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        fg.buildValues([makeModel({ genre: ['Rock'], artist: 'Pink Floyd' })]);

        const details = filterGroups.querySelector<HTMLDetailsElement>('.filter-group')!;
        const summary = details.querySelector<HTMLElement>('summary')!;

        summary.click(); // open without mock
        const anim = mockAnimate(details);
        summary.click(); // close with mock

        expect((details as unknown as Record<string, unknown>)['animate'])
            .toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ fill: 'forwards' }));
        expect(typeof anim.onfinish).toBe('function');
    });

    it('animateClose onfinish removes open attribute, closing class, and calls cancel', () => {
        const { filterGroups, buttonContainer } = setupDOM();
        const fg = new FilterGroups(CONFIGS, makeListing(), filterGroups, buttonContainer);
        fg.buildValues([makeModel({ genre: ['Rock'], artist: 'Pink Floyd' })]);

        const details = filterGroups.querySelector<HTMLDetailsElement>('.filter-group')!;
        const summary = details.querySelector<HTMLElement>('summary')!;

        summary.click(); // open
        const anim = mockAnimate(details);
        summary.click(); // trigger close animation

        expect(details.classList.contains('filter-group-closing')).toBe(true);
        anim.onfinish!();

        expect(details.hasAttribute('open')).toBe(false);
        expect(details.classList.contains('filter-group-closing')).toBe(false);
        expect(anim.cancel).toHaveBeenCalled();
    });
});

// ─── no container ─────────────────────────────────────────────────────────────

describe('FilterGroups — no container', () => {
    it('does not throw when sidebarContainer is undefined', () => {
        expect(
            () => new FilterGroups(CONFIGS, makeListing(), undefined, undefined)
        ).not.toThrow();
    });

    it('buildValues does not throw when sidebarContainer is undefined', () => {
        const fg = new FilterGroups(CONFIGS, makeListing(), undefined, undefined);
        expect(() =>
            fg.buildValues([makeModel({ genre: ['Rock'] })])
        ).not.toThrow();
    });

    it('filter() works even without containers', () => {
        const fg = new FilterGroups(CONFIGS, makeListing(), undefined, undefined);
        const models = [makeModel({ genre: ['Rock'] })];
        expect(fg.filter(models)).toHaveLength(1);
    });
});
