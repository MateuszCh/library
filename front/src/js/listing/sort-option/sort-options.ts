import type { LibraryItemModel } from '../library-item/library-item';
import type { Listing } from '../listing';
import { SortOption, type ISortOptionConfig } from './sort-option';

const LIST_VISIBLE_CLASS = 'listing-sort-options-list-visible';
const BUTTON_ACTIVE_CLASS = 'listing-sort-options-button-active';

const ICON = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M11 5h10M11 9h7M11 13h4M3 17l3 3 3-3M6 18V4"/>
</svg>
`;

export class SortOptions<T extends LibraryItemModel> {
    private configs: ISortOptionConfig[] = [];

    private button?: HTMLButtonElement;
    private container?: HTMLElement;
    private list?: HTMLElement;

    private listVisible = false;

    private options: SortOption<T>[] = [];

    private currentOption?: SortOption<T>;
    private listing: Listing<T>;

    private onButtonClick = () => {
        this.toggle();
    };

    private onClickOutside = (event: PointerEvent) => {
        const isClickInside = this.list?.contains(event.target as Node);
        const isClickButn = this.button?.contains(event.target as Node);
        if (!isClickInside && !isClickButn) {
            this.toggle(false);
        }
    };

    constructor(
        configs: ISortOptionConfig[],
        listing: Listing<T>,
        container?: HTMLElement
    ) {
        this.container = container;
        this.configs = configs;
        this.listing = listing;
        this.configs.forEach(config => {
            this.options.push(new SortOption(config, this));
        });

        this.currentOption = this.getDefaultOption();

        if (this.container && this.options.length > 1) {
            this.render(this.container, this.options);
        }
        this.updateActiveState();
    }

    private toggle(to = !this.listVisible): void {
        this.listVisible = to;
        if (this.button) {
            this.button.classList.toggle(BUTTON_ACTIVE_CLASS, to);
        }
        if (this.list) {
            this.list.classList.toggle(LIST_VISIBLE_CLASS, to);
        }
    }

    clear(): void {
        this.options.forEach(option => {
            option.clear();
        });
        if (this.button) {
            this.button.removeEventListener('click', this.onButtonClick);
        }
        document.removeEventListener('click', this.onClickOutside);
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
        }
        this.toggle(false);
        this.updateActiveState();
    }

    isActive(option: SortOption<T>): boolean {
        return this.currentOption === option;
    }

    private render(
        sortContainer: HTMLElement,
        sortOptions: SortOption<T>[]
    ): void {
        sortContainer.innerHTML = '';
        const sortOptionsbutton = document.createElement('button');
        sortOptionsbutton.type = 'button';
        sortOptionsbutton.classList.add('listing-sort-options-button');
        this.button = sortOptionsbutton;
        this.button.innerHTML = ICON;
        this.button.setAttribute('aria-label', 'Sort options');
        this.button.addEventListener('click', this.onButtonClick);
        document.addEventListener('click', this.onClickOutside);
        sortContainer.appendChild(sortOptionsbutton);
        const list = document.createElement('ul');
        this.list = list;
        list.classList.add('listing-sort-options-list');
        sortOptions.forEach(option => {
            list.appendChild(option.render());
        });
        sortContainer.appendChild(list);
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
                            option.config.code === config.code &&
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
