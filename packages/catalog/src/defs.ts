// ÚNICA fuente de verdad del catálogo v1 (PLAN.md §5.6).
// Para añadir un componente: defínelo aquí, añádelo a DEFS y ejecuta `bun run gen`.
import { defineComponent as c, type ComponentDef } from './types';

const space = { k: 'num', min: 0, max: 6, int: true } as const;
const cardTones = ['surface', 'primary', 'secondary', 'tertiary', 'error'] as const;
const textTones = ['default', 'muted', 'primary', 'secondary', 'tertiary', 'error'] as const;
// Acciones comunes a button e item.
const actions = {
  do: { t: { k: 'action' }, doc: 'Cambia estado local' },
  send: { t: { k: 'tpl' }, doc: 'Envía este mensaje al chat' },
  link: { t: { k: 'url' }, doc: 'Abre un enlace https' },
} as const;

export const card = c({
  name: 'card', doc: 'Contenedor con fondo y esquinas', content: 'nodes',
  props: {
    pad: { t: space, def: 3, doc: 'Relleno interior' },
    tone: { t: { k: 'enum', v: cardTones }, def: 'surface', doc: 'Color del contenedor' },
    emphasis: { t: { k: 'enum', v: ['low', 'high'] }, def: 'low', doc: 'high: color sólido y entrada marcada' },
  },
});

export const stack = c({
  name: 'stack', doc: 'Apila hijos; row hace wrap', content: 'nodes',
  props: {
    dir: { t: { k: 'enum', v: ['row', 'col'] }, def: 'col', doc: 'Dirección' },
    gap: { t: space, def: 2, doc: 'Separación entre hijos' },
    align: { t: { k: 'enum', v: ['start', 'center', 'end', 'stretch', 'between'] }, def: 'stretch', doc: 'Alineación' },
  },
});

export const text = c({
  name: 'text', doc: 'Texto con estilo tipográfico', content: 'text', textAs: 'texto',
  props: {
    role: { t: { k: 'enum', v: ['display', 'headline', 'title', 'body', 'label'] }, def: 'body', doc: 'Nivel tipográfico' },
    size: { t: { k: 'enum', v: ['s', 'm', 'l'] }, def: 'm', doc: 'Tamaño dentro del nivel' },
    tone: { t: { k: 'enum', v: textTones }, def: 'default', doc: 'Color del texto' },
    em: { t: { k: 'bool' }, doc: 'Estilo enfatizado' },
    align: { t: { k: 'enum', v: ['start', 'center', 'end'] }, doc: 'Alineación' },
  },
});

export const button = c({
  name: 'button', doc: 'Botón; usa do, send o link', content: 'text', textAs: 'etiqueta',
  props: {
    variant: { t: { k: 'enum', v: ['filled', 'tonal', 'outlined', 'text', 'elevated'] }, def: 'filled', doc: 'Estilo' },
    size: { t: { k: 'enum', v: ['xs', 's', 'm', 'l', 'xl'] }, def: 's', doc: 'Tamaño' },
    shape: { t: { k: 'enum', v: ['round', 'square'] }, def: 'round', doc: 'Forma en reposo' },
    icon: { t: { k: 'icon' }, doc: 'Icono inicial' },
    ...actions,
  },
});

export const field = c({
  name: 'field', doc: 'Campo de entrada', content: 'text', textAs: 'etiqueta',
  props: {
    bind: { t: { k: 'state' }, req: true, doc: 'Estado enlazado' },
    type: { t: { k: 'enum', v: ['text', 'number', 'email', 'date', 'tel'] }, def: 'text', doc: 'Tipo de entrada' },
    min: { t: { k: 'num' }, doc: 'Mínimo (number)' },
    max: { t: { k: 'num' }, doc: 'Máximo (number)' },
    step: { t: { k: 'num' }, doc: 'Paso (number)' },
    req: { t: { k: 'bool' }, doc: 'Obligatorio; deshabilita send de la card' },
  },
});

export const slider = c({
  name: 'slider', doc: 'Deslizador numérico', content: 'text', textAs: 'etiqueta',
  props: {
    bind: { t: { k: 'state' }, req: true, doc: 'Estado enlazado' },
    min: { t: { k: 'num' }, req: true, doc: 'Mínimo' },
    max: { t: { k: 'num' }, req: true, doc: 'Máximo' },
    step: { t: { k: 'num' }, def: 1, doc: 'Paso' },
    unit: { t: { k: 'str' }, doc: 'Unidad tras el valor' },
  },
});

export const choice = c({
  name: 'choice', doc: 'Elegir opciones; check ⇒ varias', content: { only: ['opt'] },
  props: {
    bind: { t: { k: 'state' }, req: true, doc: 'Estado: valor, o lista si multi' },
    mode: { t: { k: 'enum', v: ['chips', 'segmented', 'radio', 'select', 'check'] }, def: 'chips', doc: 'Presentación' },
    multi: { t: { k: 'bool' }, doc: 'Selección múltiple' },
    from: { t: { k: 'data' }, doc: 'Opciones desde la primera columna' },
    label: { t: { k: 'str' }, doc: 'Etiqueta accesible' },
  },
});

export const opt = c({
  name: 'opt', doc: 'Opción de choice', content: 'text', textAs: 'texto', parentOnly: 'choice',
  props: {
    v: { t: { k: 'str' }, sig: 's=texto', doc: 'Valor; por defecto, el texto' },
  },
});

export const toggle = c({
  name: 'toggle', doc: 'Interruptor o casilla', content: 'text', textAs: 'etiqueta',
  props: {
    bind: { t: { k: 'state' }, req: true, doc: 'Estado booleano' },
    kind: { t: { k: 'enum', v: ['switch', 'check'] }, def: 'switch', doc: 'Presentación' },
  },
});

export const list = c({
  name: 'list', doc: 'Lista de elementos', content: { only: ['item'] },
  props: {
    divider: { t: { k: 'bool' }, doc: 'Separadores entre elementos' },
  },
});

export const item = c({
  name: 'item', doc: 'Elemento de lista', content: 'text', textAs: 'titular', parentOnly: 'list',
  props: {
    icon: { t: { k: 'icon' }, doc: 'Icono inicial' },
    sub: { t: { k: 'tpl' }, sig: 's', doc: 'Texto de apoyo' },
    trail: { t: { k: 'tpl' }, sig: 's', doc: 'Texto final (hora, precio)' },
    ...actions,
  },
});

export const table = c({
  name: 'table', doc: 'Tabla de un @data', content: 'none',
  props: {
    data: { t: { k: 'data' }, req: true, doc: 'Datos' },
    cols: { t: { k: 'cols' }, doc: 'Columnas visibles' },
    best: { t: { k: 'str' }, sig: 'col:min|max,…', doc: 'Resalta el mejor valor por columna' },
  },
});

export const chart = c({
  name: 'chart', doc: 'Gráfico de un @data', content: 'none',
  props: {
    type: { t: { k: 'enum', v: ['bar', 'line', 'pie', 'donut'] }, req: true, doc: 'Tipo' },
    data: { t: { k: 'data' }, req: true, doc: 'Datos' },
    x: { t: { k: 'str' }, req: true, sig: 'col', doc: 'Columna de categorías' },
    y: { t: { k: 'cols' }, req: true, doc: 'Columnas de series' },
    unit: { t: { k: 'str' }, doc: 'Unidad de los valores' },
  },
});

export const timer = c({
  name: 'timer', doc: 'Temporizador con controles', content: 'text', textAs: 'etiqueta',
  props: {
    secs: { t: { k: 'num', min: 1, int: true }, req: true, doc: 'Duración en segundos' },
    auto: { t: { k: 'bool' }, doc: 'Arranca solo' },
  },
});

export const each = c({
  name: 'each', doc: 'Repite hijos por fila', content: 'nodes', control: true,
  props: {
    in: { t: { k: 'data' }, req: true, doc: 'Datos a recorrer' },
    as: { t: { k: 'str' }, def: 'it', expr: false, sig: 'id', doc: 'Nombre de la fila' },
  },
});

export const if_ = c({
  name: 'if', doc: 'Muestra hijos si test es verdadero', content: 'nodes', control: true,
  props: {
    test: { t: { k: 'expr' }, req: true, doc: 'Condición' },
  },
});

/** Orden = orden en el prompt y en la documentación. */
export const DEFS: readonly ComponentDef[] = [card, stack, text, button, field, slider, choice, opt, toggle, list, item, table, chart, timer, each, if_];
export const DEF_BY_NAME: ReadonlyMap<string, ComponentDef> = new Map(DEFS.map((d) => [d.name, d]));
