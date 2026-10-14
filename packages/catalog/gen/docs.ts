// Genera out/CATALOG.md: referencia legible para humanos, una tabla por componente.
import { join } from 'node:path';
import { DEFS } from '../src/defs';
import type { PropDef } from '../src/types';
import { signature } from './prompt';

const typeText = (p: PropDef): string => {
  const t = p.t;
  if (t.k === 'enum') return t.v.map((v) => `\`${v}\``).join(' \\| ');
  if (t.k === 'num' && (t.min !== undefined || t.max !== undefined)) return `num ${t.min ?? ''}…${t.max ?? ''}`;
  return p.sig ? `\`${p.sig}\`` : t.k;
};

export function buildDocs(): string {
  const out = ['# Catálogo GUI-ML v1', '', 'GENERADO por `packages/catalog/gen/docs.ts`. No editar: edita `src/defs.ts` y ejecuta `bun run gen`.', ''];
  for (const d of DEFS) {
    out.push(`## \`${d.name}\``, '', d.doc + (d.parentOnly ? ` Solo dentro de \`${d.parentOnly}\`.` : ''), '', '```', signature(d).trim(), '```', '');
    const props = Object.entries(d.props);
    if (props.length) {
      out.push('| Prop | Tipo | Obligatoria | Por defecto | Descripción |', '|---|---|---|---|---|');
      for (const [n, p] of props) out.push(`| \`${n}\` | ${typeText(p)} | ${p.req ? 'sí' : ''} | ${p.def ?? ''} | ${p.doc} |`);
      out.push('');
    }
  }
  return out.join('\n');
}

if (import.meta.main) {
  const md = buildDocs();
  await Bun.write(join(import.meta.dir, '../out/CATALOG.md'), md);
  console.log(`CATALOG.md: ${md.length} caracteres`);
}
