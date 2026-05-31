import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { SortOptions } from './sort-options';
import type { ISortOptionConfig } from './sort-option';
import type { Listing } from '../listing';
import type { LibraryItemModel } from '../library-item/library-item';

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

interface Dom {
    sidebar: HTMLElement;
    buttonContainer: HTMLElement;
    overlay: HTMLElement;
    body: HTMLElement;
    close: HTMLButtonElement;
}

function setupDom(): Dom {
    const sidebar = document.createElement('div');
    sidebar.id = 'listing-sort-sidebar';
    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'listing-sort-button';
    const overlay = document.createElement('div');
    overlay.id = 'sort-modal-overlay';
    const body = document.createElement('div');
    body.id = 'sort-modal-body';
    overlay.appendChild(body);
    const close = document.createElement('button');
    close.id = 'sort-modal-close';
    document.body.append(sidebar, buttonContainer, overlay, close);
    return { sidebar, buttonContainer, overlay, body, close };
}

function makeModel(data: Record<string, unknown>): LibraryItemModel {
    return { id: Math.random(), data: { data } } as unknown as LibraryItemModel;
}

function mockAnimate(el: HTMLElement): ReturnType<typeof vi.fn> {
    const anim = { onfinish: null as (() => void) | null, cancel: vi.fn() };
    (el as any).animate = vi.fn().mockReturnValue(anim);
    return anim as any;
}

beforeEach(() => {
    window.scrollTo = vi.fn();
});

afterEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    vi.useRealTimers();
});

// ─── constructor / getDefaultOption ──────────────────────────────────────────

describe('SortOptions — default option', () => {
    it('picks the config with default:true when localStorage is empty', () => {
        const so = new SortOptions(CONFIGS, makeListing(), setupDom().sidebar);
        const models = [makeModel({ purchase_date: '2023-01-01' })];
        expect(so.sort(models)).toEqual(models);
    });

    it('restores option from localStorage by codes + order', () => {
        localStorage.setItem(
            'listing-sort-options-record',
            JSON.stringify(CONFIGS[2])
        );
        const so = new SortOptions(CONFIGS, makeListing(), setupDom().sidebar);
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
        const so = new SortOptions(CONFIGS, makeListing(), setupDom().sidebar);
        expect(so.sort([])).toEqual([]);
    });

    it('falls back to first option when localStorage JSON is invalid', () => {
        localStorage.setItem('listing-sort-options-record', '{broken json');
        expect(
            () => new SortOptions(CONFIGS, makeListing(), setupDom().sidebar)
        ).not.toThrow();
    });
});

// ─── sort() ───────────────────────────────────────────────────────────────────

describe('SortOptions.sort()', () => {
    it('delegates to the current SortOption', () => {
        const so = new SortOptions(CONFIGS, makeListing(), setupDom().sidebar);
        const m1 = makeModel({ purchase_date: '2020-01-01' });
        const m2 = makeModel({ purchase_date: '2024-06-15' });
        const sorted = so.sort([m1, m2]);
        expect(sorted[0]).toBe(m2);
    });

    it('returns models unchanged when no options are configured', () => {
        const so = new SortOptions([], makeListing(), setupDom().sidebar);
        const models = [makeModel({}), makeModel({})];
        expect(so.sort(models)).toBe(models);
    });
});

// ─── updateCurrentOption() ───────────────────────────────────────────────────

describe('SortOptions.updateCurrentOption()', () => {
    it('calls listing.onSortUpdate() when option changes', () => {
        const listing = makeListing();
        const { sidebar } = setupDom();
        new SortOptions(CONFIGS, listing, sidebar);
        const buttons = sidebar.querySelectorAll('button.listing-sort-options-list-item-button');
        (buttons[2] as HTMLButtonElement).click();
        expect(listing.onSortUpdate).toHaveBeenCalled();
    });

    it('saves chosen option to localStorage', () => {
        const { sidebar } = setupDom();
        new SortOptions(CONFIGS, makeListing(), sidebar);
        const buttons = sidebar.querySelectorAll('button.listing-sort-options-list-item-button');
        (buttons[2] as HTMLButtonElement).click();
        const stored = JSON.parse(localStorage.getItem('listing-sort-options-record') ?? '{}');
        expect(stored.codes).toEqual(['artist']);
        expect(stored.order).toBe('asc');
    });

    it('does not call onSortUpdate() when same option is selected again', () => {
        const listing = makeListing();
        const { sidebar } = setupDom();
        new SortOptions(CONFIGS, listing, sidebar);
        const firstButton = sidebar.querySelectorAll('button.listing-sort-options-list-item-button')[0] as HTMLButtonElement;
        firstButton.click();
        expect(listing.onSortUpdate).not.toHaveBeenCalled();
    });

    it('marks the chosen option button active', () => {
        const { sidebar } = setupDom();
        new SortOptions(CONFIGS, makeListing(), sidebar);
        const buttons = sidebar.querySelectorAll('button.listing-sort-options-list-item-button');
        (buttons[2] as HTMLButtonElement).click();
        expect(
            (buttons[2] as HTMLButtonElement).classList.contains(
                'listing-sort-options-list-item-button-active'
            )
        ).toBe(true);
    });

    it('selecting a desktop option closes the open accordion', () => {
        const { sidebar } = setupDom();
        new SortOptions(CONFIGS, makeListing(), sidebar);
        const details = sidebar.querySelector('details') as HTMLDetailsElement;
        details.setAttribute('open', '');
        const buttons = sidebar.querySelectorAll('button.listing-sort-options-list-item-button');
        (buttons[2] as HTMLButtonElement).click();
        expect(details.hasAttribute('open')).toBe(false);
    });

    it('selecting a desktop option when accordion is closed does not throw', () => {
        const { sidebar } = setupDom();
        new SortOptions(CONFIGS, makeListing(), sidebar);
        const buttons = sidebar.querySelectorAll('button.listing-sort-options-list-item-button');
        expect(() => (buttons[2] as HTMLButtonElement).click()).not.toThrow();
    });

    it('scrolls to top with smooth behavior when a desktop option is selected', () => {
        const { sidebar } = setupDom();
        new SortOptions(CONFIGS, makeListing(), sidebar);
        const buttons = sidebar.querySelectorAll('button.listing-sort-options-list-item-button');
        (buttons[2] as HTMLButtonElement).click();
        expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });

    it('does not scroll when the same desktop option is reselected', () => {
        const { sidebar } = setupDom();
        new SortOptions(CONFIGS, makeListing(), sidebar);
        const firstButton = sidebar.querySelectorAll('button.listing-sort-options-list-item-button')[0] as HTMLButtonElement;
        firstButton.click();
        expect(window.scrollTo).not.toHaveBeenCalled();
    });
});

// ─── rendering ───────────────────────────────────────────────────────────────

describe('SortOptions rendering', () => {
    it('renders a details accordion with summary "Sort by" in the sidebar', () => {
        const { sidebar } = setupDom();
        new SortOptions(CONFIGS, makeListing(), sidebar);
        const details = sidebar.querySelector('details.filter-group');
        const summary = sidebar.querySelector('summary.filter-group-summary');
        expect(details).not.toBeNull();
        expect(summary?.textContent).toBe('Sort by');
    });

    it('renders the options list inside the accordion and a mobile button', () => {
        const { sidebar, buttonContainer } = setupDom();
        new SortOptions(CONFIGS, makeListing(), sidebar, buttonContainer);
        expect(sidebar.querySelector('ul.listing-sort-options-list')).not.toBeNull();
        expect(buttonContainer.querySelector('button.listing-sort-button')).not.toBeNull();
    });

    it('does NOT render UI when there is only one option', () => {
        const { sidebar, buttonContainer } = setupDom();
        new SortOptions([CONFIGS[0]], makeListing(), sidebar, buttonContainer);
        expect(sidebar.querySelector('details')).toBeNull();
        expect(buttonContainer.querySelector('button')).toBeNull();
    });

    it('renders one list item per config', () => {
        const { sidebar } = setupDom();
        new SortOptions(CONFIGS, makeListing(), sidebar);
        const items = sidebar.querySelectorAll('li.listing-sort-options-list-item');
        expect(items.length).toBe(CONFIGS.length);
    });

    it('does not throw when sidebar/button containers are missing', () => {
        setupDom();
        expect(
            () => new SortOptions(CONFIGS, makeListing())
        ).not.toThrow();
    });

    it('does not throw when the modal DOM elements are absent', () => {
        const sidebar = document.createElement('div');
        document.body.appendChild(sidebar);
        const so = new SortOptions(CONFIGS, makeListing(), sidebar);
        expect(sidebar.querySelector('ul.listing-sort-options-list')).not.toBeNull();
        expect(() => (so as any).openModal()).not.toThrow();
    });
});

// ─── accordion (desktop) ─────────────────────────────────────────────────────

describe('SortOptions accordion (desktop)', () => {
    it('clicking summary opens the accordion', () => {
        const { sidebar } = setupDom();
        new SortOptions(CONFIGS, makeListing(), sidebar);
        const summary = sidebar.querySelector('summary') as HTMLElement;
        summary.click();
        expect(sidebar.querySelector('details')?.hasAttribute('open')).toBe(true);
    });

    it('clicking summary again closes the accordion', () => {
        const { sidebar } = setupDom();
        new SortOptions(CONFIGS, makeListing(), sidebar);
        const summary = sidebar.querySelector('summary') as HTMLElement;
        summary.click();
        summary.click();
        expect(sidebar.querySelector('details')?.hasAttribute('open')).toBe(false);
    });

    it('animateOpen calls el.animate when available and fires cancel on finish', () => {
        const { sidebar } = setupDom();
        const so = new SortOptions(CONFIGS, makeListing(), sidebar);
        const details = sidebar.querySelector('details') as HTMLDetailsElement;
        const anim = mockAnimate(details);
        (so as any).animateOpen(details);
        expect(details.animate).toHaveBeenCalled();
        anim.onfinish?.();
        expect(anim.cancel).toHaveBeenCalled();
    });

    it('animateClose calls el.animate when available, adds closing class, removes open on finish', () => {
        const { sidebar } = setupDom();
        const so = new SortOptions(CONFIGS, makeListing(), sidebar);
        const details = sidebar.querySelector('details') as HTMLDetailsElement;
        details.setAttribute('open', '');
        const anim = mockAnimate(details);
        (so as any).animateClose(details);
        expect(details.animate).toHaveBeenCalled();
        expect(details.classList.contains('filter-group-closing')).toBe(true);
        anim.onfinish?.();
        expect(details.hasAttribute('open')).toBe(false);
        expect(details.classList.contains('filter-group-closing')).toBe(false);
        expect(anim.cancel).toHaveBeenCalled();
    });

    it('animateOpen uses 0 startHeight when details has no summary', () => {
        setupDom();
        const so = new SortOptions(CONFIGS, makeListing());
        const details = document.createElement('details');
        document.body.appendChild(details);
        const anim = mockAnimate(details);
        (so as any).animateOpen(details);
        expect(details.animate).toHaveBeenCalledWith(
            [{ height: '0px' }, { height: '0px' }],
            expect.any(Object)
        );
        anim.onfinish?.();
        expect(anim.cancel).toHaveBeenCalled();
    });

    it('animateClose uses 0 endHeight when details has no summary', () => {
        setupDom();
        const so = new SortOptions(CONFIGS, makeListing());
        const details = document.createElement('details');
        details.setAttribute('open', '');
        document.body.appendChild(details);
        const anim = mockAnimate(details);
        (so as any).animateClose(details);
        expect(details.animate).toHaveBeenCalled();
        anim.onfinish?.();
        expect(details.hasAttribute('open')).toBe(false);
    });
});

// ─── modal (mobile) ──────────────────────────────────────────────────────────

describe('SortOptions modal', () => {
    it('mobile button opens the modal and moves the list into the modal body', () => {
        const { sidebar, buttonContainer, overlay, body } = setupDom();
        new SortOptions(CONFIGS, makeListing(), sidebar, buttonContainer);
        const btn = buttonContainer.querySelector('button.listing-sort-button') as HTMLButtonElement;
        btn.click();
        expect(overlay.classList.contains('sort-modal-overlay-open')).toBe(true);
        expect(body.querySelector('ul.listing-sort-options-list')).not.toBeNull();
        expect(document.body.style.overflow).toBe('hidden');
        expect(document.body.style.position).toBe('fixed');
    });

    it('close button closes the modal and restores scroll, returning the list to the details', () => {
        vi.useFakeTimers();
        const { sidebar, buttonContainer, overlay, body, close } = setupDom();
        new SortOptions(CONFIGS, makeListing(), sidebar, buttonContainer);
        (buttonContainer.querySelector('button.listing-sort-button') as HTMLButtonElement).click();
        close.click();
        expect(overlay.classList.contains('sort-modal-overlay-open')).toBe(false);
        expect(document.body.style.overflow).toBe('');
        expect(window.scrollTo).toHaveBeenCalled();
        vi.advanceTimersByTime(300);
        expect(sidebar.querySelector('ul.listing-sort-options-list')).not.toBeNull();
        expect(body.querySelector('ul.listing-sort-options-list')).toBeNull();
    });

    it('clicking the overlay backdrop closes the modal', () => {
        const { sidebar, buttonContainer, overlay } = setupDom();
        new SortOptions(CONFIGS, makeListing(), sidebar, buttonContainer);
        (buttonContainer.querySelector('button.listing-sort-button') as HTMLButtonElement).click();
        overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(overlay.classList.contains('sort-modal-overlay-open')).toBe(false);
    });

    it('clicking inside the modal (not the backdrop) does not close it', () => {
        const { sidebar, buttonContainer, overlay, body } = setupDom();
        new SortOptions(CONFIGS, makeListing(), sidebar, buttonContainer);
        (buttonContainer.querySelector('button.listing-sort-button') as HTMLButtonElement).click();
        body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(overlay.classList.contains('sort-modal-overlay-open')).toBe(true);
    });

    it('selecting an option from the modal closes it', () => {
        vi.useFakeTimers();
        const { sidebar, buttonContainer, overlay, body } = setupDom();
        new SortOptions(CONFIGS, makeListing(), sidebar, buttonContainer);
        (buttonContainer.querySelector('button.listing-sort-button') as HTMLButtonElement).click();
        const optionButtons = body.querySelectorAll('button.listing-sort-options-list-item-button');
        (optionButtons[2] as HTMLButtonElement).click();
        expect(overlay.classList.contains('sort-modal-overlay-open')).toBe(false);
        vi.advanceTimersByTime(300);
        expect(sidebar.querySelector('ul.listing-sort-options-list')).not.toBeNull();
    });

    it('selecting an option from the modal scrolls to top after close', () => {
        vi.useFakeTimers();
        const { sidebar, buttonContainer, body } = setupDom();
        new SortOptions(CONFIGS, makeListing(), sidebar, buttonContainer);
        (buttonContainer.querySelector('button.listing-sort-button') as HTMLButtonElement).click();
        const optionButtons = body.querySelectorAll('button.listing-sort-options-list-item-button');
        (optionButtons[2] as HTMLButtonElement).click();
        expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    });

    it('closeModal is a no-op when modal is already closed', () => {
        const { sidebar, buttonContainer, overlay } = setupDom();
        const so = new SortOptions(CONFIGS, makeListing(), sidebar, buttonContainer);
        (so as any).closeModal();
        expect(overlay.classList.contains('sort-modal-overlay-open')).toBe(false);
        expect(window.scrollTo).not.toHaveBeenCalled();
    });

    it('openModal is a no-op when the list was never rendered (no sidebar container)', () => {
        const { overlay } = setupDom();
        const so = new SortOptions(CONFIGS, makeListing());
        (so as any).openModal();
        expect(overlay.classList.contains('sort-modal-overlay-open')).toBe(false);
        expect(window.scrollTo).not.toHaveBeenCalled();
    });

    it('closeModal does not throw when there is no list/details to restore', () => {
        vi.useFakeTimers();
        setupDom();
        const so = new SortOptions(CONFIGS, makeListing());
        (so as any).modalOpen = true;
        expect(() => {
            (so as any).closeModal();
            vi.advanceTimersByTime(300);
        }).not.toThrow();
    });
});

// ─── clear() ─────────────────────────────────────────────────────────────────

describe('SortOptions with single option (UI not rendered)', () => {
    it('updateCurrentOption with no details does not throw', () => {
        const so = new SortOptions([CONFIGS[0]], makeListing(), setupDom().sidebar);
        const option = (so as any).options[0];
        expect(() => so.updateCurrentOption(option)).not.toThrow();
    });

    it('clear() with no rendered UI does not throw', () => {
        const so = new SortOptions([CONFIGS[0]], makeListing(), setupDom().sidebar);
        expect(() => so.clear()).not.toThrow();
    });
});

describe('SortOptions.clear()', () => {
    it('removes the mobile button and its click listener', () => {
        const { sidebar, buttonContainer, overlay } = setupDom();
        const so = new SortOptions(CONFIGS, makeListing(), sidebar, buttonContainer);
        const btn = buttonContainer.querySelector('button.listing-sort-button') as HTMLButtonElement;
        so.clear();
        expect(buttonContainer.querySelector('button.listing-sort-button')).toBeNull();
        btn.click();
        expect(overlay.classList.contains('sort-modal-overlay-open')).toBe(false);
    });

    it('removes the summary click listener after clear()', () => {
        const { sidebar } = setupDom();
        const so = new SortOptions(CONFIGS, makeListing(), sidebar);
        const summary = sidebar.querySelector('summary') as HTMLElement;
        const spy = vi.spyOn(summary, 'removeEventListener');
        so.clear();
        expect(spy).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('removes item click listeners after clear()', () => {
        const listing = makeListing();
        const { sidebar, buttonContainer } = setupDom();
        const so = new SortOptions(CONFIGS, listing, sidebar, buttonContainer);
        so.clear();
        const itemBtn = sidebar.querySelectorAll(
            'button.listing-sort-options-list-item-button'
        )[2] as HTMLButtonElement;
        itemBtn.click();
        expect(listing.onSortUpdate).not.toHaveBeenCalled();
    });

    it('does not throw on clear() when the modal DOM elements are absent', () => {
        const sidebar = document.createElement('div');
        document.body.appendChild(sidebar);
        const so = new SortOptions(CONFIGS, makeListing(), sidebar);
        expect(() => so.clear()).not.toThrow();
    });

    it('removes the modal overlay/close listeners after clear()', () => {
        const { sidebar, buttonContainer, overlay, close } = setupDom();
        const so = new SortOptions(CONFIGS, makeListing(), sidebar, buttonContainer);
        so.clear();
        (so as any).openModal();
        close.click();
        expect(overlay.classList.contains('sort-modal-overlay-open')).toBe(true);
    });
});
