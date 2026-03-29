import { orderBy, difference } from 'lodash-es';
import type { LibraryItemModel } from '../library-item/library-item';
import type { SortOptions } from './sort-options';

export interface ISortOptionConfig {
    label: string;
    codes: string[];
    order: 'asc' | 'desc';
    default?: boolean;
    type: 'date' | 'string';
}

export class SortOption<T extends LibraryItemModel> {
    private button?: HTMLButtonElement;

    config: ISortOptionConfig;
    protected sortOptions: SortOptions<T>;

    private onClick = () => {
        this.sortOptions.updateCurrentOption(this);
    };

    constructor(config: ISortOptionConfig, sortOptions: SortOptions<T>) {
        this.config = config;
        this.sortOptions = sortOptions;
    }

    get isDefault(): boolean {
        return this.config.default || false;
    }

    get label(): string {
        return this.config.label;
    }

    applySort<T extends LibraryItemModel>(models: T[]): T[] {
        const modelsWithDefinedValue = models.filter(
            model => typeof this.getSortValue(model) !== 'undefined'
        );
        const modelsWithUndefinedValue = difference(
            models,
            modelsWithDefinedValue
        );
        return [
            ...orderBy(
                modelsWithDefinedValue,
                i => this.getSortValue(i),
                this.config.order
            ),
            ...modelsWithUndefinedValue
        ];
    }

    render(): HTMLElement {
        const sortOptionItem = document.createElement('li');
        sortOptionItem.classList.add('listing-sort-options-list-item');
        const sortOptionItemButton = document.createElement('button');
        sortOptionItemButton.type = 'button';
        this.button = sortOptionItemButton;
        this.button.addEventListener('click', this.onClick);
        sortOptionItemButton.classList.add(
            'listing-sort-options-list-item-button'
        );
        sortOptionItemButton.innerHTML = this.label;
        sortOptionItem.appendChild(sortOptionItemButton);
        return sortOptionItem;
    }

    private get type(): 'date' | 'string' {
        return this.config.type;
    }

    private get codes(): string[] {
        return this.config.codes;
    }

    private getSortValue(model: LibraryItemModel): string | number | undefined {
        const values = this.codes
            .map(code => {
                return model.data?.data?.[code];
            })
            .filter(i => !!(i || typeof i === 'number'));
        if (values.length) {
            switch (this.type) {
                case 'date':
                    const date = new Date(values[0]);
                    return date instanceof Date ? date.getTime() : undefined;
                case 'string':
                    return values.map(i => i.toString()).join(' ');
            }
        }
        return undefined;
    }

    clear(): void {
        if (this.button) {
            this.button.removeEventListener('click', this.onClick);
        }
    }

    updateActiveState(): void {
        if (this.button) {
            this.button.classList.toggle(
                'listing-sort-options-list-item-button-active',
                this.isActive
            );
        }
    }

    private get isActive(): boolean {
        return this.sortOptions.isActive(this);
    }
}
