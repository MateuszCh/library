export interface ILibraryItem<
    T extends { [key: string]: any } = { [key: string]: any }
> {
    created: number;
    title: string;
    type: string;
    _id: string;
    id: number;
    data: T;
}

export abstract class LibraryItemModel<T extends ILibraryItem = ILibraryItem> {
    readonly data: T;

    constructor(data: T) {
        this.data = data;
    }

    get id(): number {
        return this.data.id;
    }

    abstract render(): HTMLElement;

    abstract search(searchValue: string): boolean;
}
