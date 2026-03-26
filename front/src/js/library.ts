import { RecordsListing } from './listing/records/records-listing';

export class Library {
    private listingSearch: HTMLInputElement;
    private listingResults: HTMLDivElement;

    constructor() {
        this.listingSearch = document.getElementById(
            'listing-search'
        ) as HTMLInputElement;
        this.listingResults = document.getElementById(
            'listing-results'
        ) as HTMLDivElement;
    }

    async init() {
        this.initListing();
    }

    private async initListing(): Promise<void> {
        const listing = new RecordsListing(
            this.listingResults,
            this.listingSearch
        );
        await listing.init();
    }
}
