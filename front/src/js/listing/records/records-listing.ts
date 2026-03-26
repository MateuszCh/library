import { Listing } from '../listing';
import { RecordModel, type IRecordLibraryItem } from './record';

import { orderBy } from 'lodash-es';

export class RecordsListing extends Listing<RecordModel> {
    protected type = 'record';

    protected createModel(item: IRecordLibraryItem): RecordModel {
        return new RecordModel(item);
    }

    protected renderResultItem(model: RecordModel): HTMLElement {
        const resultItem = document.createElement('div');
        resultItem.classList.add('record-item');
        const recordItemLeft = document.createElement('div');
        recordItemLeft.classList.add('record-item-left');
        const cover = model.cover;
        if (cover) {
            const recordItemImage = document.createElement('img');
            recordItemImage.classList.add('record-item-image');
            recordItemImage.src = model.cover;
            recordItemLeft.appendChild(recordItemImage);
        }
        const backCover = model.backCover;
        if (backCover) {
            const recordItemImage = document.createElement('img');
            recordItemImage.classList.add('record-item-image-back');
            recordItemImage.src = model.backCover;
            recordItemLeft.appendChild(recordItemImage);
        }
        const recordItemRight = document.createElement('div');
        recordItemRight.classList.add('record-item-right');
        recordItemRight.innerHTML = `
            <h3 class="record-item-title">
                ${[model.artist, model.title].filter(Boolean).join(' - ')}
            </h3>
        `;

        if (model.genres) {
            recordItemRight.innerHTML += `
                <p class="record-item-genres">
                    ${model.genres}
                </p>
            `;
        }

        if (model.releaseDateFormatted) {
            recordItemRight.innerHTML += `
                <p class="record-item-date">
                    Release date: ${model.releaseDateFormatted}
                </p>
            `;
        }

        if (model.purchaseDateFormatted) {
            recordItemRight.innerHTML += `
                <p class="record-item-date">
                    Purchase date: ${model.purchaseDateFormatted}
                </p>
            `;
        }
        resultItem.appendChild(recordItemLeft);
        resultItem.appendChild(recordItemRight);
        return resultItem;
    }

    protected applySort(models: RecordModel[]): RecordModel[] {
        return orderBy(
            models,
            i => {
                const purchaseDate = i.purchaseDate;
                if (purchaseDate) {
                    return purchaseDate.getTime();
                }
                return 0;
            },
            'desc'
        );
    }

    protected applySearch(models: RecordModel[]): RecordModel[] {
        const searchValue = this.searchValue;
        if (searchValue && typeof searchValue === 'string') {
            return models.filter(model => {
                return (
                    model.title?.toLowerCase().includes(searchValue) ||
                    model.artist?.toLowerCase().includes(searchValue) ||
                    model.genres?.toLowerCase().includes(searchValue) ||
                    model.releaseYear?.toLowerCase().includes(searchValue)
                );
            });
        }
        return super.applySearch(models);
    }
}
