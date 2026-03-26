export interface ILibraryItem<T extends {} = {}> {
    created: number;
    title: string;
    type: string;
    _id: string;
    id: number;
    data: T;
}

export abstract class LibraryItemModel<T extends ILibraryItem> {
    protected data: T;

    constructor(data: T) {
        this.data = data;
    }

    get id(): number {
        return this.data.id;
    }
}
