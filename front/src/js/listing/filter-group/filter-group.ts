import type { LibraryItemModel } from '../library-item/library-item';
import type { FilterGroups } from './filter-groups';

export type FilterGroupType = 'string' | 'string[]' | 'year';

export interface IFilterGroupConfig {
    label: string;
    code: string;
    type: FilterGroupType;
}

export class FilterGroup<T extends LibraryItemModel> {
    readonly config: IFilterGroupConfig;
    private selectedValues: Set<string> = new Set();
    private filterGroups: FilterGroups<T>;
    private checkboxListeners: Array<{ el: HTMLInputElement; fn: EventListener }> =
        [];
    private panelElement?: HTMLElement;
    private usesDecades: boolean = false;

    constructor(config: IFilterGroupConfig, filterGroups: FilterGroups<T>) {
        this.config = config;
        this.filterGroups = filterGroups;
    }

    get label(): string {
        return this.config.label;
    }

    get code(): string {
        return this.config.code;
    }

    get type(): FilterGroupType {
        return this.config.type;
    }

    get isActive(): boolean {
        return this.selectedValues.size > 0;
    }

    get selected(): string[] {
        return Array.from(this.selectedValues);
    }

    getValueLabel(value: string): string {
        if (this.usesDecades) {
            return `${String(parseInt(value) % 100).padStart(2, '0')}s`;
        }
        return value;
    }

    buildValues(models: T[]): void {
        const values = this.extractValues(models);
        this.clear();
        this.panelElement = this.renderPanel(values);
    }

    getElement(): HTMLElement | undefined {
        return this.panelElement;
    }

    filter(models: T[]): T[] {
        if (this.selectedValues.size === 0) return models;
        return models.filter(model => this.modelMatchesAny(model));
    }

    setSelected(values: string[]): void {
        this.selectedValues = new Set(values);
    }

    setValueChecked(value: string, checked: boolean): void {
        if (checked) {
            this.selectedValues.add(value);
        } else {
            this.selectedValues.delete(value);
        }
        const checkboxes =
            this.panelElement?.querySelectorAll<HTMLInputElement>(
                'input[type="checkbox"]'
            ) ?? [];
        const checkbox = Array.from(checkboxes).find(c => c.value === value);
        if (checkbox) {
            checkbox.checked = checked;
        }
    }

    updateAvailableValues(models: T[]): void {
        const available = new Set(this.extractValuesInCurrentMode(models));
        this.selectedValues.forEach(v => {
            if (!available.has(v)) this.selectedValues.delete(v);
        });
        const list = this.panelElement?.querySelector('.filter-group-list');
        if (!list) return;
        list.querySelectorAll<HTMLElement>('.filter-group-item').forEach(item => {
            const checkbox = item.querySelector<HTMLInputElement>('input[type="checkbox"]');
            if (!checkbox) return;
            const visible = available.has(checkbox.value);
            item.style.display = visible ? '' : 'none';
            if (!visible) checkbox.checked = false;
        });
    }

    clearAll(): void {
        this.selectedValues.clear();
        this.panelElement
            ?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
            .forEach(cb => { cb.checked = false; });
    }

    clear(): void {
        this.checkboxListeners.forEach(({ el, fn }) => {
            el.removeEventListener('change', fn);
        });
        this.checkboxListeners = [];
        this.panelElement = undefined;
    }

    private extractValuesInCurrentMode(models: T[]): string[] {
        const set = new Set<string>();
        models.forEach(model => {
            const raw = model.data?.data?.[this.code];
            this.normalizeToStrings(raw).forEach(v => set.add(v));
        });
        if (this.usesDecades) {
            const decadeSet = new Set<string>();
            set.forEach(year => decadeSet.add(String(Math.floor(parseInt(year) / 10) * 10)));
            return Array.from(decadeSet);
        }
        return Array.from(set);
    }

    private extractValues(models: T[]): string[] {
        const set = new Set<string>();
        models.forEach(model => {
            const raw = model.data?.data?.[this.code];
            this.normalizeToStrings(raw).forEach(v => set.add(v));
        });
        const values = Array.from(set).sort();

        if (this.type === 'year' && values.length > 10) {
            this.usesDecades = true;
            const decadeSet = new Set<string>();
            values.forEach(year => {
                decadeSet.add(String(Math.floor(parseInt(year) / 10) * 10));
            });
            return Array.from(decadeSet).sort();
        }

        this.usesDecades = false;
        return values;
    }

    private normalizeToStrings(raw: unknown): string[] {
        switch (this.type) {
            case 'string':
                return typeof raw === 'string' && raw ? [raw] : [];
            case 'string[]':
                return Array.isArray(raw)
                    ? raw.filter(v => typeof v === 'string' && v)
                    : [];
            case 'year': {
                const d = new Date(raw as string);
                const y = d.getFullYear();
                return !isNaN(y) ? [String(y)] : [];
            }
        }
    }

    private modelMatchesAny(model: T): boolean {
        const raw = model.data?.data?.[this.code];
        const values = this.normalizeToStrings(raw);
        if (this.usesDecades) {
            return values.some(year => {
                const decade = String(Math.floor(parseInt(year) / 10) * 10);
                return this.selectedValues.has(decade);
            });
        }
        return values.some(v => this.selectedValues.has(v));
    }

    private renderPanel(values: string[]): HTMLElement {
        const details = document.createElement('details');
        details.classList.add('filter-group');

        const summary = document.createElement('summary');
        summary.classList.add('filter-group-summary');
        summary.textContent = this.label;
        details.appendChild(summary);

        const list = document.createElement('ul');
        list.classList.add('filter-group-list');

        values.forEach(value => {
            const li = document.createElement('li');
            li.classList.add('filter-group-item');

            const label = document.createElement('label');
            label.classList.add('filter-group-label');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.classList.add('filter-group-checkbox');
            checkbox.value = value;
            checkbox.checked = this.selectedValues.has(value);

            const listener: EventListener = () => {
                if (checkbox.checked) {
                    this.selectedValues.add(value);
                } else {
                    this.selectedValues.delete(value);
                }
                this.filterGroups.onFilterUpdate(this);
            };
            checkbox.addEventListener('change', listener);
            this.checkboxListeners.push({ el: checkbox, fn: listener });

            const displayLabel = this.usesDecades
                ? `${String(parseInt(value) % 100).padStart(2, '0')}s`
                : value;
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(` ${displayLabel}`));
            li.appendChild(label);
            list.appendChild(li);
        });

        details.appendChild(list);
        return details;
    }
}
