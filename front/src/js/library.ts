import { RecordsListing } from './listing/records/records-listing';

export class Library {
    private listingSearch: HTMLInputElement;
    private listingResults: HTMLDivElement;
    private listingSortOptions: HTMLDivElement;

    constructor() {
        this.listingSearch = document.getElementById(
            'listing-search'
        ) as HTMLInputElement;
        this.listingResults = document.getElementById(
            'listing-results'
        ) as HTMLDivElement;
        this.listingSortOptions = document.getElementById(
            'listing-sort-options'
        ) as HTMLDivElement;
    }

    async init() {
        this.initListing();
    }

    private async initListing(): Promise<void> {
        const listing = new RecordsListing(
            this.listingResults,
            this.listingSearch,
            this.listingSortOptions
        );
        await listing.init();
    }
}
