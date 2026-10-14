// Genera out/catalog.txt: el texto que lee el LLM (descripción de la herramienta `render`).
// Debe ser estable byte a byte entre ejecuciones para aprovechar la caché de prompt:
// sin fechas, sin orden de Map/Set no determinista, sin nada que dependa del entorno.
import { join } from 'node:path';
import { DEFS } from '../src/defs';
import { NAMES } from './icons';
import type { ComponentDef, PropDef } from '../src/types';

const ROOT = join(import.meta.dir, '../../..');
/** Ejemplos completos del prompt: salen de bench/cases para no tener dos copias. */
export const EXAMPLES = ['01-cuenta', '04-reserva'] as const;

function typeSig(name: string, p: PropDef): string {
  if (p.sig) return p.sig;
  const t = p.t;
  switch (t.k) {
    case 'num': return t.min !== undefined && t.max !== undefined ? `${t.min}-${t.max}` : 'n';
    case 'str': case 'tpl': return 's';
    case 'enum': return t.v.join('|');
    case 'cols': return 'col,…';
    case 'expr': return '{expr}';
    case 'icon': case 'action': case 'url': return '';
    default: return t.k === name ? '' : t.k; // `data:data` → `data`
  }
}

function propSig(name: string, p: PropDef): string {
  const optional = p.req ? '' : '?';
  const ts = typeSig(name, p);
  const def = p.def !== undefined && !(p.sig?.includes('=')) ? `=${p.def}` : '';
  return `${name}${optional}${ts ? ':' + ts : ''}${def}`;
}

export function signature(d: ComponentDef): string {
  const props = Object.entries(d.props).map(([n, p]) => propSig(n, p)).join(', ');
  const ct = d.content;
  const content = ct === 'none' ? '' : ct === 'text' ? ` [${d.textAs ?? 'text'}]` : ct === 'nodes' ? ' [nodes]' : ` [${ct.only.map((o) => o + '*').join(' ')}]`;
  return `${d.parentOnly ? '  ' : ''}${d.name}(${props})${content} — ${d.doc}`;
}

const RULES = `GUI-ML: answer with Markdown plus component tags. One tag per line, no indentation. Never use double quotes.
Values: bare (pad=3), single-quoted if they contain spaces (sub='Walk in the park') or an expression ({n*2}). Attribute without value = true.
Text goes as content: <button>Send</button>. Close with </name>, or write <x .../> when empty.
State: @state x = expr. Data: @data d: col1, col2 followed by rows | a | b. {expr} in text or values updates when state changes.
Actions: do={x = x + 1; y = 0} changes local state; send='text {x}' sends a chat message; link=https://… opens a link.
Style only through props, never CSS. Escape \\< \\{ \\| \\@ to use them as text.
Expr: + - * / % == != < <= > >= && || ! ?: 'text' [a,b] row.col. Functions: round(x,d) floor ceil abs min max clamp(x,a,b) fmt(x,d) money(x,'EUR') pct(x) time(secs) len(l) sum(d,'col') avg(d,'col') get(d,key,'col') has(l,v) upper lower join(l,sep)`;

export async function buildPrompt(): Promise<string> {
  const examples = await Promise.all(EXAMPLES.map((n) => Bun.file(join(ROOT, `bench/cases/${n}.gui`)).text()));
  return [
    RULES,
    '',
    'Components (? optional, =default, [content]):',
    ...DEFS.map(signature),
    '',
    `Icons: ${[...NAMES].sort().join(' ')}`,
    '',
    ...examples.flatMap((e, i) => [`Example ${i + 1}:`, e.trimEnd(), '']),
  ].join('\n');
}

export function catalogHash(text: string): string {
  return new Bun.CryptoHasher('sha256').update(text).digest('hex').slice(0, 8);
}

if (import.meta.main) {
  const txt = await buildPrompt();
  await Bun.write(join(import.meta.dir, '../out/catalog.txt'), txt);
  console.log(`catalog.txt: ${txt.length} caracteres, hash ${catalogHash(txt)}`);
}
