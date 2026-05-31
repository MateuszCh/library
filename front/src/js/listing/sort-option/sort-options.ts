import type { LibraryItemModel } from '../library-item/library-item';
import type { Listing } from '../listing';
import { SortOption, type ISortOptionConfig } from './sort-option';

const SORT_MODAL_OVERLAY_ID = 'sort-modal-overlay';
const SORT_MODAL_BODY_ID = 'sort-modal-body';
const SORT_MODAL_CLOSE_ID = 'sort-modal-close';
const MODAL_OPEN_CLASS = 'sort-modal-overlay-open';

const ICON = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M11 5h10M11 9h7M11 13h4M3 17l3 3 3-3M6 18V4"/>
</svg>
`;

export class SortOptions<T extends LibraryItemModel> {
    private configs: ISortOptionConfig[] = [];

    private sidebarContainer?: HTMLElement;
    private buttonContainer?: HTMLElement;
    private list?: HTMLElement;
    private details?: HTMLDetailsElement;
    private summaryEl?: HTMLElement;
    private summaryListener?: EventListener;

    private options: SortOption<T>[] = [];

    private currentOption?: SortOption<T>;
    private listing: Listing<T>;

    private savedScrollY = 0;
    private modalOpen = false;

    private modalOverlay?: HTMLElement;
    private modalBody?: HTMLElement;
    private modalCloseButton?: HTMLElement;
    private mobileSortButton?: HTMLButtonElement;

    private onMobileButtonClick = () => this.openModal();
    private onModalOverlayClick = (e: MouseEvent) => {
        if (e.target === this.modalOverlay) {
            this.closeModal();
        }
    };
    private onModalClose = () => this.closeModal();

    constructor(
        configs: ISortOptionConfig[],
        listing: Listing<T>,
        sidebarContainer?: HTMLElement,
        buttonContainer?: HTMLElement
    ) {
        this.sidebarContainer = sidebarContainer;
        this.buttonContainer = buttonContainer;
        this.configs = configs;
        this.listing = listing;
        this.configs.forEach(config => {
            this.options.push(new SortOption(config, this));
        });

        this.currentOption = this.getDefaultOption();

        this.modalOverlay =
            document.getElementById(SORT_MODAL_OVERLAY_ID) || undefined;
        this.modalBody =
            document.getElementById(SORT_MODAL_BODY_ID) || undefined;
        this.modalCloseButton =
            document.getElementById(SORT_MODAL_CLOSE_ID) || undefined;

        if (this.options.length > 1) {
            this.renderSidebarList();
            this.renderMobileButton();
            this.bindModalEvents();
        }
        this.updateActiveState();
    }

    clear(): void {
        this.options.forEach(option => {
            option.clear();
        });
        this.mobileSortButton?.removeEventListener(
            'click',
            this.onMobileButtonClick
        );
        if (this.mobileSortButton) {
            this.mobileSortButton.remove();
            this.mobileSortButton = undefined;
        }
        if (this.summaryListener && this.summaryEl) {
            this.summaryEl.removeEventListener('click', this.summaryListener);
        }
        this.modalOverlay?.removeEventListener('click', this.onModalOverlayClick);
        this.modalCloseButton?.removeEventListener('click', this.onModalClose);
    }

    sort(models: T[]): T[] {
        const current = this.currentOption;
        if (current) {
            return current.applySort(models);
        }
        return models;
    }

    updateCurrentOption(option: SortOption<T>): void {
        if (this.currentOption !== option) {
            this.currentOption = option;
            window.localStorage.setItem(
                this.storageKey,
                JSON.stringify(option.config)
            );
            this.listing.onSortUpdate();
            if (this.modalOpen) {
                this.savedScrollY = 0;
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
        this.updateActiveState();
        if (this.modalOpen) {
            this.closeModal();
        } else if (this.details?.open) {
            this.animateClose(this.details);
        }
    }

    isActive(option: SortOption<T>): boolean {
        return this.currentOption === option;
    }

    private renderSidebarList(): void {
        if (!this.sidebarContainer) return;
        this.sidebarContainer.innerHTML = '';

        const details = document.createElement('details');
        details.classList.add('filter-group');
        this.details = details;

        const summary = document.createElement('summary');
        summary.classList.add('filter-group-summary');
        summary.textContent = 'Sort by';
        this.summaryEl = summary;
        details.appendChild(summary);

        const fn: EventListener = (e: Event) => {
            e.preventDefault();
            if (details.open) {
                this.animateClose(details);
            } else {
                details.setAttribute('open', '');
                this.animateOpen(details);
            }
        };
        summary.addEventListener('click', fn);
        this.summaryListener = fn;

        const list = document.createElement('ul');
        this.list = list;
        list.classList.add('listing-sort-options-list');
        this.options.forEach(option => {
            list.appendChild(option.render());
        });
        details.appendChild(list);
        this.sidebarContainer.appendChild(details);
    }

    private renderMobileButton(): void {
        if (!this.buttonContainer) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.classList.add('listing-sort-button');
        btn.setAttribute('aria-label', 'Sort options');
        btn.innerHTML = ICON;
        btn.addEventListener('click', this.onMobileButtonClick);
        this.mobileSortButton = btn;
        this.buttonContainer.appendChild(btn);
    }

    private bindModalEvents(): void {
        this.modalOverlay?.addEventListener('click', this.onModalOverlayClick);
        this.modalCloseButton?.addEventListener('click', this.onModalClose);
    }

    private openModal(): void {
        if (!this.modalBody || !this.list) return;
        this.modalBody.appendChild(this.list);
        this.modalOverlay?.classList.add(MODAL_OPEN_CLASS);
        this.modalOpen = true;
        this.savedScrollY = window.scrollY;
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${this.savedScrollY}px`;
        document.body.style.width = '100%';
    }

    private closeModal(): void {
        if (!this.modalOpen) return;
        this.modalOpen = false;
        this.modalOverlay?.classList.remove(MODAL_OPEN_CLASS);
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, this.savedScrollY);
        const list = this.list;
        const target = this.details ?? this.sidebarContainer;
        setTimeout(() => {
            if (list && target) {
                target.appendChild(list);
            }
        }, 300);
    }

    private animateOpen(el: HTMLDetailsElement): void {
        if (typeof el.animate !== 'function') return;
        const summary = el.querySelector<HTMLElement>('summary');
        const startHeight = summary ? summary.offsetHeight : 0;
        const endHeight = el.scrollHeight;
        const anim = el.animate(
            [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
            { duration: 200, easing: 'ease', fill: 'backwards' }
        );
        anim.onfinish = () => { anim.cancel(); };
    }

    private animateClose(el: HTMLDetailsElement): void {
        const summary = el.querySelector<HTMLElement>('summary');
        const finish = () => {
            el.classList.remove('filter-group-closing');
            el.removeAttribute('open');
        };
        if (typeof el.animate !== 'function') { finish(); return; }
        el.classList.add('filter-group-closing');
        const startHeight = el.offsetHeight;
        const endHeight = summary ? summary.offsetHeight : 0;
        const anim = el.animate(
            [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
            { duration: 200, easing: 'ease', fill: 'forwards' }
        );
        anim.onfinish = () => { finish(); anim.cancel(); };
    }

    private get storageKey(): string {
        return 'listing-sort-options-' + this.listing.type;
    }

    private getDefaultOption(): SortOption<T> {
        const storage = window.localStorage.getItem(this.storageKey);
        if (storage) {
            try {
                const config = JSON.parse(storage) as ISortOptionConfig;
                if (typeof config === 'object') {
                    const option = this.options.find(
                        option =>
                            option.config.codes.toString() ===
                                config.codes.toString() &&
                            option.config.order === config.order
                    );
                    if (option) {
                        return option;
                    }
                }
            } catch (e) {}
        }
        return this.options.find(option => option.isDefault) || this.options[0];
    }

    private updateActiveState(): void {
        this.options.forEach(option => {
            option.updateActiveState();
        });
    }
}
