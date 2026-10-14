// ÚNICA fuente de verdad del catálogo v1 (PLAN.md §5.6).
// Para añadir un componente: defínelo aquí, añádelo a DEFS y ejecuta `bun run gen`.
import { defineComponent as c, type ComponentDef } from './types';

const space = { k: 'num', min: 0, max: 6, int: true } as const;
const cardTones = ['surface', 'primary', 'secondary', 'tertiary', 'error'] as const;
const textTones = ['default', 'muted', 'primary', 'secondary', 'tertiary', 'error'] as const;
// Acciones comunes a button e item.
const actions = {
  do: { t: { k: 'action' }, doc: 'Change local state' },
  send: { t: { k: 'tpl' }, doc: 'Send this message to the chat' },
  link: { t: { k: 'url' }, doc: 'Open an https link' },
} as const;

export const card = c({
  name: 'card', doc: 'Surface container', content: 'nodes',
  props: {
    pad: { t: space, def: 3, doc: 'Inner padding' },
    tone: { t: { k: 'enum', v: cardTones }, def: 'surface', doc: 'Container color' },
    emphasis: { t: { k: 'enum', v: ['low', 'high'] }, def: 'low', doc: 'high: solid color, bolder entrance' },
  },
});

export const stack = c({
  name: 'stack', doc: 'Stack children; row wraps', content: 'nodes',
  props: {
    dir: { t: { k: 'enum', v: ['row', 'col'] }, def: 'col', doc: 'Direction' },
    gap: { t: space, def: 2, doc: 'Space between children' },
    align: { t: { k: 'enum', v: ['start', 'center', 'end', 'stretch', 'between'] }, def: 'stretch', doc: 'Alignment' },
  },
});

export const text = c({
  name: 'text', doc: 'Styled text', content: 'text', textAs: 'text',
  props: {
    role: { t: { k: 'enum', v: ['display', 'headline', 'title', 'body', 'label'] }, def: 'body', doc: 'Type scale role' },
    size: { t: { k: 'enum', v: ['s', 'm', 'l'] }, def: 'm', doc: 'Size within role' },
    tone: { t: { k: 'enum', v: textTones }, def: 'default', doc: 'Text color' },
    em: { t: { k: 'bool' }, doc: 'Emphasized style' },
    align: { t: { k: 'enum', v: ['start', 'center', 'end'] }, doc: 'Alignment' },
  },
});

export const button = c({
  name: 'button', doc: 'Button; needs do, send or link', content: 'text', textAs: 'label',
  props: {
    variant: { t: { k: 'enum', v: ['filled', 'tonal', 'outlined', 'text', 'elevated'] }, def: 'filled', doc: 'Style' },
    size: { t: { k: 'enum', v: ['xs', 's', 'm', 'l', 'xl'] }, def: 's', doc: 'Size' },
    shape: { t: { k: 'enum', v: ['round', 'square'] }, def: 'round', doc: 'Resting shape' },
    icon: { t: { k: 'icon' }, doc: 'Leading icon' },
    ...actions,
  },
});

export const field = c({
  name: 'field', doc: 'Input field', content: 'text', textAs: 'label',
  props: {
    bind: { t: { k: 'state' }, req: true, doc: 'Bound state' },
    type: { t: { k: 'enum', v: ['text', 'number', 'email', 'date', 'tel'] }, def: 'text', doc: 'Input type' },
    min: { t: { k: 'num' }, doc: 'Minimum (number)' },
    max: { t: { k: 'num' }, doc: 'Maximum (number)' },
    step: { t: { k: 'num' }, doc: 'Step (number)' },
    req: { t: { k: 'bool' }, doc: 'Required; disables send in its card' },
  },
});

export const slider = c({
  name: 'slider', doc: 'Numeric slider', content: 'text', textAs: 'label',
  props: {
    bind: { t: { k: 'state' }, req: true, doc: 'Bound state' },
    min: { t: { k: 'num' }, req: true, doc: 'Minimum' },
    max: { t: { k: 'num' }, req: true, doc: 'Maximum' },
    step: { t: { k: 'num' }, def: 1, doc: 'Step' },
    unit: { t: { k: 'str' }, doc: 'Unit after the value' },
  },
});

export const choice = c({
  name: 'choice', doc: 'Pick options; check = multiple', content: { only: ['opt'] },
  props: {
    bind: { t: { k: 'state' }, req: true, doc: 'State: value, or list if multi' },
    mode: { t: { k: 'enum', v: ['chips', 'segmented', 'radio', 'select', 'check'] }, def: 'chips', doc: 'Presentation' },
    multi: { t: { k: 'bool' }, doc: 'Multiple selection' },
    from: { t: { k: 'data' }, doc: 'Options from first column' },
    label: { t: { k: 'str' }, doc: 'Accessible label' },
  },
});

export const opt = c({
  name: 'opt', doc: 'Choice option', content: 'text', textAs: 'text', parentOnly: 'choice',
  props: {
    v: { t: { k: 'str' }, sig: 's=text', doc: 'Value; defaults to the text' },
  },
});

export const toggle = c({
  name: 'toggle', doc: 'Switch or checkbox', content: 'text', textAs: 'label',
  props: {
    bind: { t: { k: 'state' }, req: true, doc: 'Boolean state' },
    kind: { t: { k: 'enum', v: ['switch', 'check'] }, def: 'switch', doc: 'Presentation' },
  },
});

export const list = c({
  name: 'list', doc: 'List of items', content: { only: ['item'] },
  props: {
    divider: { t: { k: 'bool' }, doc: 'Dividers between items' },
  },
});

export const item = c({
  name: 'item', doc: 'List item', content: 'text', textAs: 'headline', parentOnly: 'list',
  props: {
    icon: { t: { k: 'icon' }, doc: 'Leading icon' },
    sub: { t: { k: 'tpl' }, sig: 's', doc: 'Supporting text' },
    trail: { t: { k: 'tpl' }, sig: 's', doc: 'Trailing text (time, price)' },
    ...actions,
  },
});

export const table = c({
  name: 'table', doc: 'Table of a @data', content: 'none',
  props: {
    data: { t: { k: 'data' }, req: true, doc: 'Data' },
    cols: { t: { k: 'cols' }, doc: 'Visible columns' },
    best: { t: { k: 'str' }, sig: 'col:min|max,…', doc: 'Highlight best value per column' },
  },
});

export const chart = c({
  name: 'chart', doc: 'Chart of a @data', content: 'none',
  props: {
    type: { t: { k: 'enum', v: ['bar', 'line', 'pie', 'donut'] }, req: true, doc: 'Type' },
    data: { t: { k: 'data' }, req: true, doc: 'Data' },
    x: { t: { k: 'str' }, req: true, sig: 'col', doc: 'Category column' },
    y: { t: { k: 'cols' }, req: true, doc: 'Series columns' },
    unit: { t: { k: 'str' }, doc: 'Value unit' },
  },
});

export const timer = c({
  name: 'timer', doc: 'Countdown timer with controls', content: 'text', textAs: 'label',
  props: {
    secs: { t: { k: 'num', min: 1, int: true }, req: true, doc: 'Duration in seconds' },
    auto: { t: { k: 'bool' }, doc: 'Start automatically' },
  },
});

export const each = c({
  name: 'each', doc: 'Repeat children per row', content: 'nodes', control: true,
  props: {
    in: { t: { k: 'data' }, req: true, doc: 'Data to iterate' },
    as: { t: { k: 'str' }, def: 'it', expr: false, sig: 'id', doc: 'Row variable name' },
  },
});

export const if_ = c({
  name: 'if', doc: 'Show children if test is true', content: 'nodes', control: true,
  props: {
    test: { t: { k: 'expr' }, req: true, doc: 'Condition' },
  },
});

/** Orden = orden en el prompt y en la documentación. */
export const DEFS: readonly ComponentDef[] = [card, stack, text, button, field, slider, choice, opt, toggle, list, item, table, chart, timer, each, if_];
export const DEF_BY_NAME: ReadonlyMap<string, ComponentDef> = new Map(DEFS.map((d) => [d.name, d]));
