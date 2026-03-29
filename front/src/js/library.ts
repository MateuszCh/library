import { RecordsListing } from './listing/records/records-listing';

export class Library {
    constructor() {}

    async init() {
        this.initListing();
    }

    private async initListing(): Promise<void> {
        const listing = new RecordsListing();
        await listing.init();
    }
}
