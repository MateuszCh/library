import { Listing } from '../listing';
import { RecordModel } from './record';
import type { ISortOptionConfig } from '../sort-option/sort-option';

export class RecordsListing extends Listing<RecordModel> {
    type = 'record';
    protected title = 'Records';

    protected modelConstructor = RecordModel;

    protected sortOptionsConfigs: ISortOptionConfig[] = [
        {
            label: 'Recent purchases',
            codes: ['purchase_date'],
            order: 'desc',
            type: 'date',
            default: true
        },
        {
            label: 'Oldest purchases',
            codes: ['purchase_date'],
            order: 'asc',
            type: 'date'
        },
        {
            label: 'Newest',
            codes: ['release_date'],
            order: 'desc',
            type: 'date'
        },
        {
            label: 'Oldest',
            codes: ['release_date'],
            order: 'asc',
            type: 'date'
        },
        {
            label: 'A-Z',
            codes: ['artist', 'title'],
            order: 'asc',
            type: 'string'
        },
        {
            label: 'Z-A',
            codes: ['artist', 'title'],
            order: 'desc',
            type: 'string'
        }
    ];
}
