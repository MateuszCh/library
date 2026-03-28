import { Listing } from '../listing';
import { RecordModel } from './record';
import type { ISortOptionConfig } from '../sort-option/sort-option';

export class RecordsListing extends Listing<RecordModel> {
    type = 'record';

    protected modelConstructor = RecordModel;

    protected sortOptionsConfigs: ISortOptionConfig[] = [
        {
            label: 'Recent purchases',
            code: 'purchase_date',
            order: 'desc',
            type: 'date',
            default: true
        },
        {
            label: 'Oldest purchases',
            code: 'purchase_date',
            order: 'asc',
            type: 'date'
        },
        {
            label: 'Newest',
            code: 'release_date',
            order: 'desc',
            type: 'date'
        },
        {
            label: 'Oldest',
            code: 'release_date',
            order: 'asc',
            type: 'date'
        },
        { label: 'A-Z', code: 'artist', order: 'asc', type: 'string' },
        { label: 'Z-A', code: 'artist', order: 'desc', type: 'string' }
    ];
}
