// Genera src/icons.ts: nombre → atributo `d` del path SVG (Material Symbols Rounded, peso 400).
// Para añadir un icono: añádelo a NAMES y ejecuta `bun run gen`.
import { dirname, join } from 'node:path';

export const NAMES = [
  'add', 'remove', 'check', 'close', 'edit', 'delete', 'search', 'info', 'warning', 'error', 'help', 'star', 'favorite', 'share',
  'event', 'schedule', 'timer', 'alarm', 'calendar_month', 'today', 'location_on', 'map', 'directions',
  'coffee', 'restaurant', 'local_bar', 'hotel', 'flight', 'train', 'tram', 'directions_car', 'directions_walk', 'museum', 'castle', 'beach_access', 'sunny', 'cloud', 'rainy',
  'shopping_cart', 'payments', 'euro', 'credit_card', 'receipt', 'sell',
  'person', 'group', 'mail', 'call', 'chat', 'send', 'link', 'open_in_new',
  'play_arrow', 'pause', 'restart_alt', 'replay', 'skip_next',
  'trending_up', 'trending_down', 'bar_chart', 'pie_chart', 'analytics',
  'lightbulb', 'celebration', 'thumb_up', 'thumb_down', 'bookmark',
] as const;

if (import.meta.main) {
  const dir = join(dirname(require.resolve('@material-symbols/svg-400/package.json')), 'rounded');
  const entries: string[] = [];
  for (const name of [...NAMES].sort()) {
    const file = Bun.file(join(dir, `${name}.svg`));
    if (!(await file.exists())) throw new Error(`Icono inexistente: ${name}`);
    const paths = [...(await file.text()).matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
    if (paths.length !== 1) throw new Error(`${name}: se esperaba 1 path y hay ${paths.length}`);
    entries.push(`  ${name}: '${paths[0]}',`);
  }
  const out = `// GENERADO por gen/icons.ts. No editar.\n// viewBox de todos los iconos: ICON_VIEWBOX.\nexport const ICON_VIEWBOX = '0 -960 960 960';\nexport const ICONS: Readonly<Record<string, string>> = {\n${entries.join('\n')}\n};\n`;
  await Bun.write(join(import.meta.dir, '../src/icons.ts'), out);
  console.log(`icons.ts: ${entries.length} iconos, ${out.length} bytes`);
}
