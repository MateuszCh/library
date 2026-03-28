import { LibraryItemModel } from '../library-item/library-item';
import type { ILibraryItem } from '../library-item/library-item';

export interface IRecordLibraryItem extends ILibraryItem<IRecordData> {
    // type: 'record';
}

export interface IRecordData {
    artist?: string;
    back_cover?: string;
    cover?: string;
    genre?: string[];
    purchase_date?: string;
    release_date?: string;
    title?: string;
}

export class RecordModel extends LibraryItemModel<IRecordLibraryItem> {
    private _purchaseDate?: Date;
    private _releaseDate?: Date;
    private _genres?: string;

    private htmlElement?: HTMLElement;

    constructor(data: IRecordLibraryItem) {
        super(data);
    }

    search(searchValue: string): boolean {
        return !!(
            this.title?.toLowerCase().includes(searchValue) ||
            this.artist?.toLowerCase().includes(searchValue) ||
            this.genres?.toLowerCase().includes(searchValue) ||
            this.releaseYear?.toLowerCase().includes(searchValue)
        );
    }

    render(): HTMLElement {
        if (!this.htmlElement) {
            const resultItem = document.createElement('div');
            resultItem.classList.add('record-item');
            const recordItemLeft = document.createElement('div');
            recordItemLeft.classList.add('record-item-left');
            const cover = this.cover;
            if (cover) {
                const recordItemImage = document.createElement('img');
                recordItemImage.classList.add('record-item-image');
                recordItemImage.src = this.cover;
                recordItemLeft.appendChild(recordItemImage);
            }
            const backCover = this.backCover;
            if (backCover) {
                const recordItemImage = document.createElement('img');
                recordItemImage.classList.add('record-item-image-back');
                recordItemImage.src = this.backCover;
                recordItemLeft.appendChild(recordItemImage);
            }
            const recordItemRight = document.createElement('div');
            recordItemRight.classList.add('record-item-right');
            recordItemRight.innerHTML = `
            <h3 class="record-item-title">
                ${[this.artist, this.title].filter(Boolean).join(' - ')}
            </h3>
        `;

            if (this.genres) {
                recordItemRight.innerHTML += `
                <p class="record-item-genres">
                    ${this.genres}
                </p>
            `;
            }
            const releaseDateFormatted = this.releaseDate
                ? this.formatDate(this.releaseDate)
                : undefined;
            if (releaseDateFormatted) {
                recordItemRight.innerHTML += `
                <p class="record-item-date">
                    Release date: ${releaseDateFormatted}
                </p>
            `;
            }

            const purchaseDateFormatted = this.purchaseDate
                ? this.formatDate(this.purchaseDate)
                : undefined;
            if (purchaseDateFormatted) {
                recordItemRight.innerHTML += `
                <p class="record-item-date">
                    Purchase date: ${purchaseDateFormatted}
                </p>
            `;
            }
            resultItem.appendChild(recordItemLeft);
            resultItem.appendChild(recordItemRight);
            this.htmlElement = resultItem;
        }
        return this.htmlElement;
    }

    private get purchaseDate(): Date | undefined {
        if (!this._purchaseDate) {
            const purchaseDate = this.data?.data?.purchase_date;
            this._purchaseDate = purchaseDate
                ? new Date(purchaseDate)
                : undefined;
        }
        return this._purchaseDate;
    }

    private get genres(): string | undefined {
        if (!this._genres) {
            this._genres = this.getFormattedGenres();
        }
        return this._genres;
    }

    private get releaseDate(): Date | undefined {
        if (!this._releaseDate) {
            const releaseDate = this.data?.data?.release_date;
            this._releaseDate = releaseDate ? new Date(releaseDate) : undefined;
        }
        return this._releaseDate;
    }

    private get releaseYear(): string | undefined {
        return this.releaseDate?.getFullYear()?.toString();
    }

    private get cover(): string | undefined {
        return this.data?.data?.cover;
    }

    private get backCover(): string | undefined {
        return this.data?.data?.back_cover;
    }

    private get title(): string | undefined {
        return this.data?.data?.title;
    }

    private get artist(): string | undefined {
        return this.data?.data?.artist;
    }

    private formatDate(date: Date): string {
        return date.toLocaleDateString('pl-PL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    private getFormattedGenres(): string {
        const genres = this.data?.data?.genre;
        if (!genres?.length) {
            return '';
        }

        return genres
            .map(genre =>
                genre
                    .split(' ')
                    .map(word =>
                        word
                            ? `${word.charAt(0).toUpperCase()}${word.slice(1)}`
                            : word
                    )
                    .join(' ')
            )
            .join(', ');
    }
}
