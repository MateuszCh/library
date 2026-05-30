import type { LibraryItemModel } from '../library-item/library-item';
import type { Listing } from '../listing';
import { FilterGroup, type IFilterGroupConfig } from './filter-group';

const FILTER_MODAL_OVERLAY_ID = 'filter-modal-overlay';
const FILTER_MODAL_BODY_ID = 'filter-modal-body';
const FILTER_MODAL_CLOSE_ID = 'filter-modal-close';
const MODAL_OPEN_CLASS = 'filter-modal-overlay-open';

const FILTER_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="4" y1="6" x2="20" y2="6"/>
  <line x1="8" y1="12" x2="16" y2="12"/>
  <line x1="12" y1="18" x2="12" y2="18" stroke-linecap="round"/>
</svg>
`;

export class FilterGroups<T extends LibraryItemModel> {
    private groups: FilterGroup<T>[] = [];
    private listing: Listing<T>;
    private sidebarContainer?: HTMLElement;
    private buttonContainer?: HTMLElement;

    private modalOverlay?: HTMLElement;
    private modalBody?: HTMLElement;
    private modalCloseButton?: HTMLElement;
    private mobileFilterButton?: HTMLButtonElement;

    private onModalOverlayClick = (e: MouseEvent) => {
        if (e.target === this.modalOverlay) {
            this.closeModal();
        }
    };
    private onModalClose = () => this.closeModal();
    private onMobileButtonClick = () => this.openModal();

    constructor(
        configs: IFilterGroupConfig[],
        listing: Listing<T>,
        sidebarContainer?: HTMLElement,
        buttonContainer?: HTMLElement
    ) {
        this.listing = listing;
        this.sidebarContainer = sidebarContainer;
        this.buttonContainer = buttonContainer;

        this.modalOverlay =
            document.getElementById(FILTER_MODAL_OVERLAY_ID) || undefined;
        this.modalBody =
            document.getElementById(FILTER_MODAL_BODY_ID) || undefined;
        this.modalCloseButton =
            document.getElementById(FILTER_MODAL_CLOSE_ID) || undefined;

        this.groups = configs.map(config => new FilterGroup(config, this));
        this.restoreFromStorage();
        this.renderMobileButton();
        this.bindModalEvents();
    }

    buildValues(models: T[]): void {
        this.groups.forEach(group => group.buildValues(models));
        this.renderSidebar();
    }

    onFilterUpdate(_group: FilterGroup<T>): void {
        this.saveToStorage();
        this.listing.onFilterUpdate();
    }

    filter(models: T[]): T[] {
        return this.groups.reduce((acc, group) => group.filter(acc), models);
    }

    clear(): void {
        this.groups.forEach(g => g.clear());
        this.modalOverlay?.removeEventListener('click', this.onModalOverlayClick);
        this.modalCloseButton?.removeEventListener('click', this.onModalClose);
        this.mobileFilterButton?.removeEventListener(
            'click',
            this.onMobileButtonClick
        );
        if (this.mobileFilterButton) {
            this.mobileFilterButton.remove();
            this.mobileFilterButton = undefined;
        }
    }

    private renderSidebar(): void {
        if (!this.sidebarContainer) return;
        this.sidebarContainer.innerHTML = '';
        this.groups.forEach(group => {
            const el = group.getElement();
            if (el) {
                this.sidebarContainer!.appendChild(el);
            }
        });
    }

    private renderMobileButton(): void {
        if (!this.buttonContainer) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.classList.add('listing-filter-button');
        btn.setAttribute('aria-label', 'Filter options');
        btn.innerHTML = FILTER_ICON;
        btn.addEventListener('click', this.onMobileButtonClick);
        this.mobileFilterButton = btn;
        this.buttonContainer.appendChild(btn);
    }

    private bindModalEvents(): void {
        this.modalOverlay?.addEventListener('click', this.onModalOverlayClick);
        this.modalCloseButton?.addEventListener('click', this.onModalClose);
    }

    private openModal(): void {
        if (!this.modalBody || !this.sidebarContainer) return;
        this.modalBody.appendChild(this.sidebarContainer);
        this.modalOverlay?.classList.add(MODAL_OPEN_CLASS);
    }

    private closeModal(): void {
        const filterSidebar = document.getElementById('filter-sidebar');
        if (this.sidebarContainer && filterSidebar) {
            filterSidebar.appendChild(this.sidebarContainer);
        }
        this.modalOverlay?.classList.remove(MODAL_OPEN_CLASS);
    }

    private get storageKey(): string {
        return 'listing-filter-groups-' + this.listing.type;
    }

    private saveToStorage(): void {
        const state: Record<string, string[]> = {};
        this.groups.forEach(g => {
            state[g.code] = g.selected;
        });
        window.localStorage.setItem(this.storageKey, JSON.stringify(state));
    }

    private restoreFromStorage(): void {
        const raw = window.localStorage.getItem(this.storageKey);
        if (!raw) return;
        try {
            const state = JSON.parse(raw) as Record<string, string[]>;
            if (typeof state === 'object' && state !== null) {
                this.groups.forEach(g => {
                    const saved = state[g.code];
                    if (Array.isArray(saved)) {
                        g.setSelected(saved);
                    }
                });
            }
        } catch (_e) {}
    }
}
