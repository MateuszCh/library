import type {
    ILibraryItem,
    LibraryItemModel
} from './library-item/library-item';

const STORAGE_KEY = 'listing-search-value';

export abstract class Listing<T extends LibraryItemModel<ILibraryItem>> {
    protected abstract type: string;
    private resultsContainer: HTMLElement;
    private search: HTMLInputElement;
    private searchEventListener?: EventListener;

    protected models: T[] = [];
    private allModels: T[] = [];

    constructor(resultsContainer: HTMLElement, search: HTMLInputElement) {
        this.resultsContainer = resultsContainer;
        this.search = search;
        if (search) {
            const searchValue = window.localStorage.getItem(STORAGE_KEY);
            if (searchValue) {
                search.value = searchValue;
            }
            search.focus();
            const eventListener = () => {
                window.localStorage.setItem(STORAGE_KEY, this.searchValue);
                this.updateResults();
            };
            search.addEventListener('input', eventListener);
            this.searchEventListener = eventListener;
        }
    }

    async init() {
        const items = await this.loadItems();
        this.allModels = items.map(i => this.createModel(i));
        this.updateResults();
    }

    clear(): void {
        if (this.search && this.searchEventListener) {
            this.search.removeEventListener('input', this.searchEventListener);
            this.searchEventListener = undefined;
        }
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

    protected applySearch(models: T[]): T[] {
        return [...models];
    }

    private applyFilters(models: T[]): T[] {
        return this.applySearch(models);
    }

    protected applySort(models: T[]): T[] {
        return [...models];
    }

    protected renderResults(): void {
        this.clearResults();
        const listingResults = this.resultsContainer;
        if (listingResults) {
            this.models.forEach(model => {
                const listingResultsItem = document.createElement('li');
                listingResultsItem.classList.add('listing-results-item');
                listingResultsItem.appendChild(this.renderResultItem(model));
                listingResults.appendChild(listingResultsItem);
            });
        }
    }

    protected abstract renderResultItem(model: T): HTMLElement;

    protected abstract createModel(item: ILibraryItem): T;

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

    protected get searchValue(): string {
        return (this.search?.value?.trim() || '').toLowerCase();
    }
}
