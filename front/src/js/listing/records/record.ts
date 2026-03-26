import { LibraryItemModel } from '../library-item/library-item';
import type { ILibraryItem } from '../library-item/library-item';

export interface IRecordLibraryItem extends ILibraryItem<IRecordData> {
    type: 'record';
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
    purchaseDate?: Date;
    purchaseDateFormatted?: string;
    releaseDate?: Date;
    releaseDateFormatted?: string;
    genres?: string;

    constructor(data: IRecordLibraryItem) {
        super(data);
        const purchaseDate = data?.data?.purchase_date;
        this.purchaseDate = purchaseDate ? new Date(purchaseDate) : undefined;
        this.purchaseDateFormatted = this.purchaseDate
            ? this.formatDate(this.purchaseDate)
            : undefined;
        const releaseDate = data?.data?.release_date;
        this.releaseDate = releaseDate ? new Date(releaseDate) : undefined;
        this.releaseDateFormatted = this.releaseDate
            ? this.formatDate(this.releaseDate)
            : undefined;
        this.genres = this.getFormattedGenres();
    }

    get cover(): string | undefined {
        return this.data?.data?.cover;
    }

    get title(): string | undefined {
        return this.data?.data?.title;
    }

    get artist(): string | undefined {
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
