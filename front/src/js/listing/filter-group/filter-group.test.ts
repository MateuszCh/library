import { describe, it, expect, vi } from 'vitest';
import { FilterGroup, type IFilterGroupConfig } from './filter-group';
import type { FilterGroups } from './filter-groups';
import type { LibraryItemModel } from '../library-item/library-item';

function makeFilterGroups(): FilterGroups<LibraryItemModel> {
    return {
        onFilterUpdate: vi.fn()
    } as unknown as FilterGroups<LibraryItemModel>;
}

function makeGroup(
    config: Partial<IFilterGroupConfig>
): FilterGroup<LibraryItemModel> {
    const defaults: IFilterGroupConfig = {
        label: 'Test',
        code: 'artist',
        type: 'string'
    };
    return new FilterGroup({ ...defaults, ...config }, makeFilterGroups());
}

function makeModel(data: Record<string, unknown>): LibraryItemModel {
    return {
        id: Math.random(),
        data: { data }
    } as unknown as LibraryItemModel;
}

// ─── filter — type: string ────────────────────────────────────────────────────

describe('FilterGroup.filter() — type: string', () => {
    it('returns all models when nothing selected', () => {
        const group = makeGroup({ code: 'artist', type: 'string' });
        const models = [makeModel({ artist: 'Pink Floyd' }), makeModel({ artist: 'The Beatles' })];
        expect(group.filter(models)).toHaveLength(2);
    });

    it('filters to matching models when one value selected', () => {
        const group = makeGroup({ code: 'artist', type: 'string' });
        group.setSelected(['Pink Floyd']);
        const models = [makeModel({ artist: 'Pink Floyd' }), makeModel({ artist: 'The Beatles' })];
        const result = group.filter(models);
        expect(result).toHaveLength(1);
        expect(result[0].data.data['artist']).toBe('Pink Floyd');
    });

    it('OR logic: returns models matching any selected value', () => {
        const group = makeGroup({ code: 'artist', type: 'string' });
        group.setSelected(['Pink Floyd', 'The Beatles']);
        const models = [
            makeModel({ artist: 'Pink Floyd' }),
            makeModel({ artist: 'The Beatles' }),
            makeModel({ artist: 'Led Zeppelin' })
        ];
        expect(group.filter(models)).toHaveLength(2);
    });

    it('excludes models with undefined field', () => {
        const group = makeGroup({ code: 'artist', type: 'string' });
        group.setSelected(['Pink Floyd']);
        const models = [makeModel({ artist: 'Pink Floyd' }), makeModel({})];
        expect(group.filter(models)).toHaveLength(1);
    });
});

// ─── filter — type: string[] ──────────────────────────────────────────────────

describe('FilterGroup.filter() — type: string[]', () => {
    it('returns all models when nothing selected', () => {
        const group = makeGroup({ code: 'genre', type: 'string[]' });
        const models = [makeModel({ genre: ['Rock'] }), makeModel({ genre: ['Jazz'] })];
        expect(group.filter(models)).toHaveLength(2);
    });

    it('filters models whose genre array contains selected value', () => {
        const group = makeGroup({ code: 'genre', type: 'string[]' });
        group.setSelected(['Rock']);
        const models = [
            makeModel({ genre: ['Rock', 'Pop'] }),
            makeModel({ genre: ['Jazz'] }),
            makeModel({ genre: ['Rock'] })
        ];
        const result = group.filter(models);
        expect(result).toHaveLength(2);
    });

    it('handles model with no genre field', () => {
        const group = makeGroup({ code: 'genre', type: 'string[]' });
        group.setSelected(['Rock']);
        const models = [makeModel({}), makeModel({ genre: ['Rock'] })];
        expect(group.filter(models)).toHaveLength(1);
    });

    it('handles non-array genre field gracefully', () => {
        const group = makeGroup({ code: 'genre', type: 'string[]' });
        group.setSelected(['Rock']);
        const models = [makeModel({ genre: 'Rock' as unknown as string[] })];
        expect(group.filter(models)).toHaveLength(0);
    });
});

// ─── filter — type: year ──────────────────────────────────────────────────────

describe('FilterGroup.filter() — type: year', () => {
    it('returns all models when nothing selected', () => {
        const group = makeGroup({ code: 'release_date', type: 'year' });
        const models = [makeModel({ release_date: '1979-11-30' })];
        expect(group.filter(models)).toHaveLength(1);
    });

    it('filters by year extracted from ISO date string', () => {
        const group = makeGroup({ code: 'release_date', type: 'year' });
        group.setSelected(['1979']);
        const models = [
            makeModel({ release_date: '1979-11-30' }),
            makeModel({ release_date: '1987-09-07' })
        ];
        const result = group.filter(models);
        expect(result).toHaveLength(1);
        expect(result[0].data.data['release_date']).toBe('1979-11-30');
    });

    it('model with invalid date string does not match', () => {
        const group = makeGroup({ code: 'release_date', type: 'year' });
        group.setSelected(['1979']);
        const models = [makeModel({ release_date: 'not-a-date' })];
        expect(group.filter(models)).toHaveLength(0);
    });

    it('model with no date field does not match', () => {
        const group = makeGroup({ code: 'release_date', type: 'year' });
        group.setSelected(['1979']);
        const models = [makeModel({})];
        expect(group.filter(models)).toHaveLength(0);
    });
});

// ─── buildValues ──────────────────────────────────────────────────────────────

describe('FilterGroup.buildValues() — type: string', () => {
    it('extracts distinct sorted values from models', () => {
        const group = makeGroup({ code: 'artist', type: 'string' });
        const models = [
            makeModel({ artist: 'Pink Floyd' }),
            makeModel({ artist: 'The Beatles' }),
            makeModel({ artist: 'Pink Floyd' })
        ];
        group.buildValues(models);
        const el = group.getElement();
        const checkboxes = el?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
        const values = Array.from(checkboxes || []).map(c => c.value);
        expect(values).toEqual(['Pink Floyd', 'The Beatles']);
    });

    it('ignores models with undefined field', () => {
        const group = makeGroup({ code: 'artist', type: 'string' });
        const models = [makeModel({ artist: 'Pink Floyd' }), makeModel({})];
        group.buildValues(models);
        const el = group.getElement();
        const checkboxes = el?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
        expect(checkboxes?.length).toBe(1);
    });
});

describe('FilterGroup.buildValues() — type: string[]', () => {
    it('extracts all distinct values from array fields across models', () => {
        const group = makeGroup({ code: 'genre', type: 'string[]' });
        const models = [
            makeModel({ genre: ['Rock', 'Pop'] }),
            makeModel({ genre: ['Jazz', 'Rock'] })
        ];
        group.buildValues(models);
        const el = group.getElement();
        const checkboxes = el?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
        const values = Array.from(checkboxes || []).map(c => c.value);
        expect(values).toEqual(['Jazz', 'Pop', 'Rock']);
    });
});

describe('FilterGroup.buildValues() — type: year', () => {
    it('extracts year from ISO date, deduplicates', () => {
        const group = makeGroup({ code: 'release_date', type: 'year' });
        const models = [
            makeModel({ release_date: '1979-11-30' }),
            makeModel({ release_date: '1979-01-01' }),
            makeModel({ release_date: '1987-09-07' })
        ];
        group.buildValues(models);
        const el = group.getElement();
        const checkboxes = el?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
        const values = Array.from(checkboxes || []).map(c => c.value);
        expect(values).toEqual(['1979', '1987']);
    });

    it('groups into decades when more than 10 unique years', () => {
        const group = makeGroup({ code: 'release_date', type: 'year' });
        const years = ['1960','1962','1964','1966','1968','1970','1972','1974','1976','1978','1980'];
        group.buildValues(years.map(y => makeModel({ release_date: `${y}-01-01` })));
        const el = group.getElement();
        const checkboxes = el?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
        const values = Array.from(checkboxes || []).map(c => c.value);
        expect(values).toEqual(['1960', '1970', '1980']);
    });

    it('shows decade label e.g. 60s, 70s', () => {
        const group = makeGroup({ code: 'release_date', type: 'year' });
        const years = ['1960','1962','1964','1966','1968','1970','1972','1974','1976','1978','1980'];
        group.buildValues(years.map(y => makeModel({ release_date: `${y}-01-01` })));
        const el = group.getElement();
        const labels = el?.querySelectorAll('.filter-group-label');
        const texts = Array.from(labels || []).map(l => l.textContent?.trim());
        expect(texts).toContain('60s');
        expect(texts).toContain('70s');
        expect(texts).toContain('80s');
    });
});

describe('FilterGroup.filter() — decade mode', () => {
    function makeDecadeGroup() {
        const group = makeGroup({ code: 'release_date', type: 'year' });
        const years = ['1960','1962','1964','1966','1968','1970','1972','1974','1976','1978','1980'];
        group.buildValues(years.map(y => makeModel({ release_date: `${y}-01-01` })));
        return group;
    }

    it('matches model whose year falls in selected decade', () => {
        const group = makeDecadeGroup();
        group.setSelected(['1960']);
        const models = [
            makeModel({ release_date: '1965-06-01' }),
            makeModel({ release_date: '1975-06-01' })
        ];
        const result = group.filter(models);
        expect(result).toHaveLength(1);
        expect(result[0].data.data['release_date']).toBe('1965-06-01');
    });

    it('does not match model whose year is outside selected decade', () => {
        const group = makeDecadeGroup();
        group.setSelected(['1970']);
        const models = [makeModel({ release_date: '1965-01-01' })];
        expect(group.filter(models)).toHaveLength(0);
    });
});

// ─── getElement / render ──────────────────────────────────────────────────────

describe('FilterGroup.getElement()', () => {
    it('returns undefined before buildValues()', () => {
        const group = makeGroup({});
        expect(group.getElement()).toBeUndefined();
    });

    it('returns a details element after buildValues()', () => {
        const group = makeGroup({ code: 'artist', type: 'string' });
        group.buildValues([makeModel({ artist: 'Pink Floyd' })]);
        const el = group.getElement();
        expect(el?.tagName.toLowerCase()).toBe('details');
    });

    it('has a summary with the label', () => {
        const group = makeGroup({ label: 'Artist', code: 'artist', type: 'string' });
        group.buildValues([makeModel({ artist: 'Pink Floyd' })]);
        const summary = group.getElement()?.querySelector('summary');
        expect(summary?.textContent).toBe('Artist');
    });

    it('checkbox checked state reflects setSelected() values', () => {
        const group = makeGroup({ code: 'artist', type: 'string' });
        group.setSelected(['Pink Floyd']);
        group.buildValues([makeModel({ artist: 'Pink Floyd' }), makeModel({ artist: 'Led Zeppelin' })]);
        const el = group.getElement();
        const pf = el?.querySelector<HTMLInputElement>('input[value="Pink Floyd"]');
        const lz = el?.querySelector<HTMLInputElement>('input[value="Led Zeppelin"]');
        expect(pf?.checked).toBe(true);
        expect(lz?.checked).toBe(false);
    });

    it('opens details when group is active', () => {
        const group = makeGroup({ code: 'artist', type: 'string' });
        group.setSelected(['Pink Floyd']);
        group.buildValues([makeModel({ artist: 'Pink Floyd' })]);
        expect(group.getElement()?.hasAttribute('open')).toBe(true);
    });

    it('does not open details when group is inactive', () => {
        const group = makeGroup({ code: 'artist', type: 'string' });
        group.buildValues([makeModel({ artist: 'Pink Floyd' })]);
        expect(group.getElement()?.hasAttribute('open')).toBe(false);
    });
});

// ─── setValueChecked ──────────────────────────────────────────────────────────

describe('FilterGroup.setValueChecked()', () => {
    it('adds value to selectedValues when checked=true', () => {
        const group = makeGroup({ code: 'artist', type: 'string' });
        group.buildValues([makeModel({ artist: 'Pink Floyd' })]);
        group.setValueChecked('Pink Floyd', true);
        expect(group.selected).toContain('Pink Floyd');
    });

    it('removes value from selectedValues when checked=false', () => {
        const group = makeGroup({ code: 'artist', type: 'string' });
        group.setSelected(['Pink Floyd']);
        group.buildValues([makeModel({ artist: 'Pink Floyd' })]);
        group.setValueChecked('Pink Floyd', false);
        expect(group.selected).not.toContain('Pink Floyd');
    });

    it('syncs checkbox DOM state', () => {
        const group = makeGroup({ code: 'artist', type: 'string' });
        group.buildValues([makeModel({ artist: 'Pink Floyd' })]);
        group.setValueChecked('Pink Floyd', true);
        const checkbox = group
            .getElement()
            ?.querySelector<HTMLInputElement>('input[value="Pink Floyd"]');
        expect(checkbox?.checked).toBe(true);
    });

    it('does not throw when panelElement is undefined', () => {
        const group = makeGroup({ code: 'artist', type: 'string' });
        expect(() => group.setValueChecked('Pink Floyd', true)).not.toThrow();
    });
});

// ─── isActive ─────────────────────────────────────────────────────────────────

describe('FilterGroup.isActive', () => {
    it('returns false when selectedValues is empty', () => {
        const group = makeGroup({});
        expect(group.isActive).toBe(false);
    });

    it('returns true when at least one value is selected', () => {
        const group = makeGroup({});
        group.setSelected(['Rock']);
        expect(group.isActive).toBe(true);
    });
});

// ─── clear ────────────────────────────────────────────────────────────────────

describe('FilterGroup.clear()', () => {
    it('getElement() returns undefined after clear()', () => {
        const group = makeGroup({ code: 'artist', type: 'string' });
        group.buildValues([makeModel({ artist: 'Pink Floyd' })]);
        group.clear();
        expect(group.getElement()).toBeUndefined();
    });

    it('does not throw when called before buildValues()', () => {
        const group = makeGroup({});
        expect(() => group.clear()).not.toThrow();
    });

    it('removes checkbox event listeners', () => {
        const filterGroups = makeFilterGroups();
        const group = new FilterGroup(
            { label: 'Artist', code: 'artist', type: 'string' },
            filterGroups
        );
        group.buildValues([makeModel({ artist: 'Pink Floyd' })]);
        const checkbox = group
            .getElement()!
            .querySelector<HTMLInputElement>('input')!;
        group.clear();
        checkbox.dispatchEvent(new Event('change'));
        expect(filterGroups.onFilterUpdate).not.toHaveBeenCalled();
    });
});

// ─── checkbox event → onFilterUpdate ─────────────────────────────────────────

describe('FilterGroup checkbox interaction', () => {
    it('calls filterGroups.onFilterUpdate when checkbox changes', () => {
        const filterGroups = makeFilterGroups();
        const group = new FilterGroup(
            { label: 'Artist', code: 'artist', type: 'string' },
            filterGroups
        );
        group.buildValues([makeModel({ artist: 'Pink Floyd' })]);
        const checkbox = group
            .getElement()!
            .querySelector<HTMLInputElement>('input')!;
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));
        expect(filterGroups.onFilterUpdate).toHaveBeenCalledWith(group);
    });

    it('updates selectedValues when checkbox is checked', () => {
        const group = makeGroup({ code: 'artist', type: 'string' });
        group.buildValues([makeModel({ artist: 'Pink Floyd' })]);
        const checkbox = group
            .getElement()!
            .querySelector<HTMLInputElement>('input')!;
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));
        expect(group.selected).toContain('Pink Floyd');
    });

    it('updates selectedValues when checkbox is unchecked', () => {
        const group = makeGroup({ code: 'artist', type: 'string' });
        group.setSelected(['Pink Floyd']);
        group.buildValues([makeModel({ artist: 'Pink Floyd' })]);
        const checkbox = group
            .getElement()!
            .querySelector<HTMLInputElement>('input')!;
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event('change'));
        expect(group.selected).not.toContain('Pink Floyd');
    });
});

// ─── setSelected + buildValues interaction ────────────────────────────────────

describe('FilterGroup.setSelected() + buildValues() interaction', () => {
    it('pre-restored values show as checked after buildValues', () => {
        const group = makeGroup({ code: 'artist', type: 'string' });
        group.setSelected(['Pink Floyd']);
        group.buildValues([
            makeModel({ artist: 'Pink Floyd' }),
            makeModel({ artist: 'Led Zeppelin' })
        ]);
        const pf = group
            .getElement()
            ?.querySelector<HTMLInputElement>('input[value="Pink Floyd"]');
        expect(pf?.checked).toBe(true);
    });

    it('values not in model set are ignored (no checkbox rendered)', () => {
        const group = makeGroup({ code: 'artist', type: 'string' });
        group.setSelected(['Unknown Artist']);
        group.buildValues([makeModel({ artist: 'Pink Floyd' })]);
        const unknown = group
            .getElement()
            ?.querySelector<HTMLInputElement>('input[value="Unknown Artist"]');
        expect(unknown).toBeNull();
    });
});
