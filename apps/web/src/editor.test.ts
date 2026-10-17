import { describe, expect, it } from 'vitest';
import { createProject, type Project } from '@roompilot/domain';
import { getMissingMetadata, parseProjectText, updateCeiling } from './editor';

const project = (): Project => createProject({ dataUrl: 'data:image/png;base64,AAAA', width: 100, height: 100 }, { rooms: [], ceilingHeightM: null, warnings: [] });

describe('editor metadata and imports', () => {
  it('explains every missing requirement for 3D', () => {
    expect(getMissingMetadata(project())).toEqual(['Добавьте комнаты', 'Задайте масштаб', 'Подтвердите высоту потолка']);
  });
  it('requires a new confirmation when a confirmed ceiling changes', () => {
    const current = { ...project(), ceilingHeightM: 2.8, ceilingHeightConfirmed: true };
    expect(updateCeiling(current, '3.1')).toMatchObject({ ceilingHeightM: 3.1, ceilingHeightConfirmed: false });
    expect(updateCeiling(current, '')).toMatchObject({ ceilingHeightM: null, ceilingHeightConfirmed: false });
  });
  it('round trips a project and rejects unsupported or oversized JSON', () => {
    const current = project();
    expect(parseProjectText(JSON.stringify(current))).toEqual(current);
    expect(() => parseProjectText(JSON.stringify({ ...current, schemaVersion: 3 }))).toThrow();
    expect(() => parseProjectText(' '.repeat(20 * 1024 * 1024 + 1))).toThrow(/20/);
  });
});
