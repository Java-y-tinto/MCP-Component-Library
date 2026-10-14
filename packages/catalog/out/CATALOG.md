# Catálogo GUI-ML v1

GENERADO por `packages/catalog/gen/docs.ts`. No editar: edita `src/defs.ts` y ejecuta `bun run gen`.

## `card`

Contenedor con fondo y esquinas

```
card(pad?:0-6=3, tone?:surface|primary|secondary|tertiary|error=surface, emphasis?:low|high=low) [nodos] — Contenedor con fondo y esquinas
```

| Prop | Tipo | Obligatoria | Por defecto | Descripción |
|---|---|---|---|---|
| `pad` | num 0…6 |  | 3 | Relleno interior |
| `tone` | `surface` \| `primary` \| `secondary` \| `tertiary` \| `error` |  | surface | Color del contenedor |
| `emphasis` | `low` \| `high` |  | low | high: color sólido y entrada marcada |

## `stack`

Apila hijos; row hace wrap

```
stack(dir?:row|col=col, gap?:0-6=2, align?:start|center|end|stretch|between=stretch) [nodos] — Apila hijos; row hace wrap
```

| Prop | Tipo | Obligatoria | Por defecto | Descripción |
|---|---|---|---|---|
| `dir` | `row` \| `col` |  | col | Dirección |
| `gap` | num 0…6 |  | 2 | Separación entre hijos |
| `align` | `start` \| `center` \| `end` \| `stretch` \| `between` |  | stretch | Alineación |

## `text`

Texto con estilo tipográfico

```
text(role?:display|headline|title|body|label=body, size?:s|m|l=m, tone?:default|muted|primary|secondary|tertiary|error=default, em?:bool, align?:start|center|end) [texto] — Texto con estilo tipográfico
```

| Prop | Tipo | Obligatoria | Por defecto | Descripción |
|---|---|---|---|---|
| `role` | `display` \| `headline` \| `title` \| `body` \| `label` |  | body | Nivel tipográfico |
| `size` | `s` \| `m` \| `l` |  | m | Tamaño dentro del nivel |
| `tone` | `default` \| `muted` \| `primary` \| `secondary` \| `tertiary` \| `error` |  | default | Color del texto |
| `em` | bool |  |  | Estilo enfatizado |
| `align` | `start` \| `center` \| `end` |  |  | Alineación |

## `button`

Botón; usa do, send o link

```
button(variant?:filled|tonal|outlined|text|elevated=filled, size?:xs|s|m|l|xl=s, shape?:round|square=round, icon?, do?, send?:s, link?) [etiqueta] — Botón; usa do, send o link
```

| Prop | Tipo | Obligatoria | Por defecto | Descripción |
|---|---|---|---|---|
| `variant` | `filled` \| `tonal` \| `outlined` \| `text` \| `elevated` |  | filled | Estilo |
| `size` | `xs` \| `s` \| `m` \| `l` \| `xl` |  | s | Tamaño |
| `shape` | `round` \| `square` |  | round | Forma en reposo |
| `icon` | icon |  |  | Icono inicial |
| `do` | action |  |  | Cambia estado local |
| `send` | tpl |  |  | Envía este mensaje al chat |
| `link` | url |  |  | Abre un enlace https |

## `field`

Campo de entrada

```
field(bind:state, type?:text|number|email|date|tel=text, min?:n, max?:n, step?:n, req?:bool) [etiqueta] — Campo de entrada
```

| Prop | Tipo | Obligatoria | Por defecto | Descripción |
|---|---|---|---|---|
| `bind` | state | sí |  | Estado enlazado |
| `type` | `text` \| `number` \| `email` \| `date` \| `tel` |  | text | Tipo de entrada |
| `min` | num |  |  | Mínimo (number) |
| `max` | num |  |  | Máximo (number) |
| `step` | num |  |  | Paso (number) |
| `req` | bool |  |  | Obligatorio; deshabilita send de la card |

## `slider`

Deslizador numérico

```
slider(bind:state, min:n, max:n, step?:n=1, unit?:s) [etiqueta] — Deslizador numérico
```

| Prop | Tipo | Obligatoria | Por defecto | Descripción |
|---|---|---|---|---|
| `bind` | state | sí |  | Estado enlazado |
| `min` | num | sí |  | Mínimo |
| `max` | num | sí |  | Máximo |
| `step` | num |  | 1 | Paso |
| `unit` | str |  |  | Unidad tras el valor |

## `choice`

Elegir opciones; check ⇒ varias

```
choice(bind:state, mode?:chips|segmented|radio|select|check=chips, multi?:bool, from?:data, label?:s) [opt*] — Elegir opciones; check ⇒ varias
```

| Prop | Tipo | Obligatoria | Por defecto | Descripción |
|---|---|---|---|---|
| `bind` | state | sí |  | Estado: valor, o lista si multi |
| `mode` | `chips` \| `segmented` \| `radio` \| `select` \| `check` |  | chips | Presentación |
| `multi` | bool |  |  | Selección múltiple |
| `from` | data |  |  | Opciones desde la primera columna |
| `label` | str |  |  | Etiqueta accesible |

## `opt`

Opción de choice Solo dentro de `choice`.

```
opt(v?:s=texto) [texto] — Opción de choice
```

| Prop | Tipo | Obligatoria | Por defecto | Descripción |
|---|---|---|---|---|
| `v` | `s=texto` |  |  | Valor; por defecto, el texto |

## `toggle`

Interruptor o casilla

```
toggle(bind:state, kind?:switch|check=switch) [etiqueta] — Interruptor o casilla
```

| Prop | Tipo | Obligatoria | Por defecto | Descripción |
|---|---|---|---|---|
| `bind` | state | sí |  | Estado booleano |
| `kind` | `switch` \| `check` |  | switch | Presentación |

## `list`

Lista de elementos

```
list(divider?:bool) [item*] — Lista de elementos
```

| Prop | Tipo | Obligatoria | Por defecto | Descripción |
|---|---|---|---|---|
| `divider` | bool |  |  | Separadores entre elementos |

## `item`

Elemento de lista Solo dentro de `list`.

```
item(icon?, sub?:s, trail?:s, do?, send?:s, link?) [titular] — Elemento de lista
```

| Prop | Tipo | Obligatoria | Por defecto | Descripción |
|---|---|---|---|---|
| `icon` | icon |  |  | Icono inicial |
| `sub` | `s` |  |  | Texto de apoyo |
| `trail` | `s` |  |  | Texto final (hora, precio) |
| `do` | action |  |  | Cambia estado local |
| `send` | tpl |  |  | Envía este mensaje al chat |
| `link` | url |  |  | Abre un enlace https |

## `table`

Tabla de un @data

```
table(data, cols?:col,…, best?:col:min|max,…) — Tabla de un @data
```

| Prop | Tipo | Obligatoria | Por defecto | Descripción |
|---|---|---|---|---|
| `data` | data | sí |  | Datos |
| `cols` | cols |  |  | Columnas visibles |
| `best` | `col:min|max,…` |  |  | Resalta el mejor valor por columna |

## `chart`

Gráfico de un @data

```
chart(type:bar|line|pie|donut, data, x:col, y:col,…, unit?:s) — Gráfico de un @data
```

| Prop | Tipo | Obligatoria | Por defecto | Descripción |
|---|---|---|---|---|
| `type` | `bar` \| `line` \| `pie` \| `donut` | sí |  | Tipo |
| `data` | data | sí |  | Datos |
| `x` | `col` | sí |  | Columna de categorías |
| `y` | cols | sí |  | Columnas de series |
| `unit` | str |  |  | Unidad de los valores |

## `timer`

Temporizador con controles

```
timer(secs:n, auto?:bool) [etiqueta] — Temporizador con controles
```

| Prop | Tipo | Obligatoria | Por defecto | Descripción |
|---|---|---|---|---|
| `secs` | num 1… | sí |  | Duración en segundos |
| `auto` | bool |  |  | Arranca solo |

## `each`

Repite hijos por fila

```
each(in:data, as?:id=it) [nodos] — Repite hijos por fila
```

| Prop | Tipo | Obligatoria | Por defecto | Descripción |
|---|---|---|---|---|
| `in` | data | sí |  | Datos a recorrer |
| `as` | `id` |  | it | Nombre de la fila |

## `if`

Muestra hijos si test es verdadero

```
if(test:{expr}) [nodos] — Muestra hijos si test es verdadero
```

| Prop | Tipo | Obligatoria | Por defecto | Descripción |
|---|---|---|---|---|
| `test` | expr | sí |  | Condición |
