import { expect, test } from 'bun:test';
import { join } from 'node:path';
import { DEFS, DEF_BY_NAME, ICONS, slider, type PropsOf } from '../src/index';
import { NAMES } from '../gen/icons';
import { buildPrompt } from '../gen/prompt';
import { buildDocs } from '../gen/docs';

const out = (f: string) => Bun.file(join(import.meta.dir, '../out', f)).text();

test('los archivos generados están al día (ejecuta `bun run gen` si falla)', async () => {
  expect(await out('catalog.txt')).toBe(await buildPrompt());
  expect(await out('CATALOG.md')).toBe(buildDocs());
  expect(Object.keys(ICONS).sort()).toEqual([...NAMES].sort());
});

test('el catálogo cabe en el presupuesto (≈1 300 tokens)', async () => {
  expect((await buildPrompt()).length).toBeLessThanOrEqual(5500);
});

test('definiciones coherentes', () => {
  for (const d of DEFS) {
    expect(d.name).toMatch(/^[a-z]{1,7}$/);
    expect(d.doc.split(/\s+/).length).toBeLessThanOrEqual(12);
    if (typeof d.content === 'object') for (const c of d.content.only) expect(DEF_BY_NAME.get(c)?.parentOnly).toBe(d.name);
    if (d.parentOnly) expect((DEF_BY_NAME.get(d.parentOnly)?.content as { only?: readonly string[] }).only).toContain(d.name);
    for (const [n, p] of Object.entries(d.props)) {
      const where = `${d.name}.${n}`;
      expect(p.doc.split(/\s+/).length, where).toBeLessThanOrEqual(8);
      if (p.req) expect(p.def, `${where}: obligatoria y con valor por defecto`).toBeUndefined();
      if (p.def === undefined) continue;
      if (p.t.k === 'enum') expect(p.t.v, where).toContain(p.def as string);
      if (p.t.k === 'num') {
        expect(typeof p.def, where).toBe('number');
        if (p.t.min !== undefined) expect(p.def as number, where).toBeGreaterThanOrEqual(p.t.min);
        if (p.t.max !== undefined) expect(p.def as number, where).toBeLessThanOrEqual(p.t.max);
      }
    }
  }
});

test('los iconos usados en bench/cases existen', async () => {
  const dir = join(import.meta.dir, '../../../bench/cases');
  for (const f of new Bun.Glob('*.gui').scanSync(dir)) {
    for (const [, icon] of (await Bun.file(join(dir, f)).text()).matchAll(/\bicon=(\w+)/g)) {
      expect(ICONS, `${f}: ${icon}`).toHaveProperty(icon!);
    }
  }
});

// Comprobación de tipos: si PropsOf deja de inferir bien, `tsc --noEmit` falla.
const ok: PropsOf<typeof slider> = { bind: 'x', min: 1, max: 9, step: 1 };
// @ts-expect-error falta bind, que es obligatoria
const missing: PropsOf<typeof slider> = { min: 1, max: 9, step: 1 };
void ok; void missing;
