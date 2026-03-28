import type {
    ILibraryItem,
    LibraryItemModel
} from './library-item/library-item';
import { type ISortOptionConfig } from './sort-option/sort-option';
import { SortOptions } from './sort-option/sort-options';

const SEARCH_STORAGE_KEY = 'listing-search-value';

export abstract class Listing<T extends LibraryItemModel<ILibraryItem>> {
    abstract type: string;
    private resultsContainer: HTMLElement;
    private search: HTMLInputElement;
    private sortOptionsContainer?: HTMLElement;
    private searchEventListener?: EventListener;

    protected sortOptionsConfigs: ISortOptionConfig[] = [];

    private models: T[] = [];
    private allModels: T[] = [];
    private sortOptions?: SortOptions<T>;

    protected abstract modelConstructor: new (data: ILibraryItem) => T;

    constructor(
        resultsContainer: HTMLElement,
        search: HTMLInputElement,
        sortOptionsContainer?: HTMLElement
    ) {
        this.resultsContainer = resultsContainer;
        this.search = search;
        this.sortOptionsContainer = sortOptionsContainer;
        if (search) {
            const searchValue = window.localStorage.getItem(SEARCH_STORAGE_KEY);
            if (searchValue) {
                search.value = searchValue;
            }
            search.focus();
            const eventListener = () => {
                window.localStorage.setItem(
                    SEARCH_STORAGE_KEY,
                    this.searchValue
                );
                this.updateResults();
            };
            search.addEventListener('input', eventListener);
            this.searchEventListener = eventListener;
        }
    }

    async init() {
        this.sortOptions = new SortOptions(
            this.sortOptionsConfigs,
            this,
            this.sortOptionsContainer
        );
        const items = await this.loadItems();
        this.allModels = items.map(i => this.createModel(i));
        this.updateResults();
    }

    onSortUpdate(): void {
        this.updateResults();
    }

    clear(): void {
        if (this.search && this.searchEventListener) {
            this.search.removeEventListener('input', this.searchEventListener);
            this.searchEventListener = undefined;
        }
        this.sortOptions?.clear();
    }

    private updateResults(): void {
        const models = this.applySort(this.applyFilters(this.allModels));
        const newModelsId = models.map(m => m.id).join(',');
        const oldModelsId = this.models.map(m => m.id).join(',');
        if (newModelsId !== oldModelsId) {
            this.models = models;
            this.renderResults();
        }
    }

    private applySearch(models: T[]): T[] {
        const searchValue = this.searchValue?.trim()?.toLowerCase();
        if (searchValue && typeof searchValue === 'string') {
            return models.filter(m => m.search(searchValue));
        }
        return models;
    }

    private applyFilters(models: T[]): T[] {
        return this.applySearch(models);
    }

    private applySort(models: T[]): T[] {
        return this.sortOptions?.sort(models) || models;
    }

    private renderResults(): void {
        this.clearResults();
        const listingResults = this.resultsContainer;
        if (listingResults) {
            this.models.forEach(model => {
                const listingResultsItem = document.createElement('li');
                listingResultsItem.classList.add('listing-results-item');
                listingResultsItem.appendChild(model.render());
                listingResults.appendChild(listingResultsItem);
            });
        }
    }

    private createModel(item: ILibraryItem): T {
        return new this.modelConstructor(item);
    }

    private async loadItems(): Promise<ILibraryItem[]> {
        try {
            const items = await (await fetch(`/api/type/${this.type}`)).json();
            return items;
        } catch (error) {
            return [];
        }
    }

    private clearResults(): void {
        this.resultsContainer.innerHTML = '';
    }

    private get searchValue(): string {
        return (this.search?.value?.trim() || '').toLowerCase();
    }
}
