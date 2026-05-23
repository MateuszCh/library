import { describe, it, expect, afterEach } from 'vitest';
import { RecordsListing } from './records-listing';
import { RecordModel } from './record';

afterEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
});

describe('RecordsListing', () => {
    it('has type "record"', () => {
        const r = new RecordsListing();
        expect(r.type).toBe('record');
    });

    it('has title "Records"', () => {
        const r = new RecordsListing();
        expect((r as any).title).toBe('Records');
    });

    it('uses RecordModel as modelConstructor', () => {
        const r = new RecordsListing();
        expect((r as any).modelConstructor).toBe(RecordModel);
    });

    it('has 6 sort option configs', () => {
        const r = new RecordsListing();
        expect((r as any).sortOptionsConfigs).toHaveLength(6);
    });

    it('sort config labels are correct', () => {
        const r = new RecordsListing();
        const labels: string[] = (r as any).sortOptionsConfigs.map(
            (c: { label: string }) => c.label
        );
        expect(labels).toContain('Recent purchases');
        expect(labels).toContain('Oldest purchases');
        expect(labels).toContain('Newest');
        expect(labels).toContain('Oldest');
        expect(labels).toContain('A-Z');
        expect(labels).toContain('Z-A');
    });

    it('exactly one config is marked as default', () => {
        const r = new RecordsListing();
        const defaults = (r as any).sortOptionsConfigs.filter(
            (c: { default?: boolean }) => c.default
        );
        expect(defaults).toHaveLength(1);
        expect(defaults[0].label).toBe('Recent purchases');
    });
});
