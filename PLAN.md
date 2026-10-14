# PLAN.md — Catálogo de UI generativa con Material 3 Expressive en Angular

Fecha del plan: 14 oct 2026. Ejecutor previsto: Claude Opus en sesiones separadas, sin acceso a la conversación original. Este documento es la única fuente de contexto. Si algo no está aquí, aplica la regla de decisión de la sección correspondiente y anota lo que decidas en el §2 (registro de decisiones), al final, con fecha.

## 0. Suposiciones sobre datos que faltaban

El encargo dejó tres datos sin rellenar. Ninguno bloquea el plan, así que se asume lo siguiente. Si el usuario los cambia, solo cambian las fases indicadas.

| Dato | Suposición | Si cambia, revisa |
|---|---|---|
| Runtime local | **llama.cpp `llama-server`** (release `v0.6.0`, 5 oct 2026), con API compatible con OpenAI. Modelo: cualquier instruct de unos 7–14 B en `Q4_K_M` con contexto ≥ 8k. El plan no depende del modelo concreto. | Fase 7. Con Ollama no hay GBNF: se usa sin gramática (ver D4). |
| Ubicación del servidor MCP | **Túnel desde el PC** con Cloudflare Tunnel (`cloudflared`). VPS opcional, mismo binario. | Fase 6 |
| Estado del repositorio | **Vacío** (comprobado el 14 oct 2026: directorio sin archivos y sin git). | Ninguna |

Entorno comprobado en la máquina del usuario: Linux (Arch), shell `fish`, Node `v26.11.1`, Bun `1.4.3`. No hay `llama-server`, `ollama` ni `lms` instalados.

---

## 1. Resumen (10 líneas)

1. Un monorepo TypeScript define una vez los 12 componentes de v1 en `packages/catalog`.
2. De esas definiciones salen el texto del catálogo para el LLM, la gramática GBNF y la documentación; el validador las lee directamente.
3. El LLM escribe **GUI-ML**: Markdown para el texto y etiquetas tipo HTML sin comillas dobles para los componentes, con `@state`, `@data` y `{expresiones}`.
4. `packages/lang` contiene un parser tolerante y seguro con salida parcial, con diagnósticos, y un evaluador de expresiones propio sin `eval`.
5. `apps/web` es un workspace Angular 22 (standalone, signals, zoneless) con el renderer y dos aplicaciones: `view` (la app MCP) y `chat` (la vía local).
6. Los componentes implementan M3 Expressive sobre Angular CDK, con tokens CSS propios, springs convertidos a `linear()`, morphing de formas y color dinámico.
7. `apps/server` es un servidor MCP en Bun con la herramienta `render` enlazada a `ui://gui/view.html`, que es la app `view` empaquetada en un solo HTML.
8. claude.ai se conecta al servidor por un túnel de Cloudflare; el resultado de `render` devuelve los diagnósticos al modelo.
9. Para modelos locales, el chat Angular habla con `llama-server` y el modelo escribe GUI-ML directamente en su respuesta, con gramática GBNF opcional.
10. Un benchmark de 10 interfaces mide tokens frente a JSON (objetivo: un ahorro ≥ 45 %) y la tasa de UIs válidas generadas.

---

## 2. Registro de decisiones

Formato: decisión, alternativas consideradas y motivo. Las decisiones D1–D9 venían tomadas en el encargo; aquí solo se anotan los matices. Las demás son nuevas.

**D1. Monorepo TS con una sola fuente de verdad.** Se mantiene. Matiz: solo se *genera código* para lo que no puede leerse en tiempo de ejecución, es decir, el prompt del catálogo, el GBNF y la documentación. El validador y los tipos TS de las props se derivan de las definiciones en tiempo de ejecución y por inferencia de tipos. Así hay menos archivos generados que puedan quedar desincronizados.

**D2. Bun para el servidor y Node para compilar Angular.** Se mantiene. Bun hace además de gestor de paquetes y de *workspaces* para todo el repo (`bun install`), y de runner de tests de los paquetes puros (`bun test`). Angular se compila con `ng build` sobre Node.

**D3. Etiquetas tipo HTML sin comillas dobles.** Se mantiene y se concreta en el §5. Se añade el valor entre comillas simples `'...'` para atributos con espacios: no se escapa dentro de JSON y los modelos lo conocen de HTML.

**D4. Vía para modelos locales: opción (b), chat Angular propio donde el modelo escribe GUI-ML en su respuesta.**
- (a) Chat Angular como host MCP Apps. Comparte el servidor, pero obliga a implementar un cliente MCP, el puente `AppBridge`, el iframe aislado y el reenvío de entradas parciales. Además, los modelos cuantizados pequeños fallan más al escribir textos largos de varias líneas escapados dentro del JSON de una llamada a herramienta, y la gramática no se puede aplicar dentro de los argumentos.
- (b) **Elegida.** El parser y el renderer, que son el 90 % del valor, se comparten al 100 % con la vía MCP. El streaming es nativo token a token. Se puede aplicar GBNF a toda la respuesta. El esfuerzo es menor: un `fetch` con SSE contra `/v1/chat/completions`. Todo es Angular y TS, así que el usuario puede mantenerlo.
- (c) Host existente (Goose soporta MCP Apps y modelos locales). Cuesta cero código y se usa como **prueba de humo gratuita** en la fase 7, pero no como vía principal: no controlamos el streaming parcial ni la gramática.

**D5. Markdown mezclado con etiquetas: sí.** Las líneas que no empiezan por `<`, `@` o `|` son Markdown (un subconjunto, ver §5.4). Motivos: los modelos lo escriben de forma natural, ahorra tokens frente a `<text>` en cada párrafo y la vía local (D4) necesita texto libre de todos modos. El Markdown se convierte en nodos propios y nunca en `innerHTML`.

**D6. Renderizado con un `@switch` estático en vez de `ViewContainerRef.createComponent`.** Esto cambia la decisión 5 del encargo, con motivo. Con 12 componentes conocidos en compilación, un componente `gui-outlet` con `@for (n of nodes(); track n.id) { @switch (n.t) { … } }` es AOT y tipado, tiene menos código y hace que `animate.enter` y `animate.leave` funcionen sin más, porque son elementos de plantilla. `createComponent` con `setInput` o `inputBinding()` queda como alternativa documentada si el catálogo supera unos 30 componentes o si hace falta cargar componentes de forma diferida.

**D7. Parseo en cliente y en servidor con el mismo paquete.** El servidor parsea la entrada de `render` para devolver diagnósticos al modelo. El cliente reparsea todo el texto acumulado en cada actualización. A diferencia de DIL, el servidor no compila ni envía un programa: el cliente solo recibe texto y pinta componentes conocidos. Es más simple y más seguro, porque no se ejecuta código generado.

**D8. El catálogo va en la `description` de la herramienta `render`.** No hay una herramienta `catalog` aparte. Es un texto estable y determinista, generado a partir de las definiciones, con lo que aprovecha la caché de prompt. Su versión (hash corto) va en `_meta` del resultado. Presupuesto: ≤ 1 300 tokens de Claude.

**D9. 12 componentes en v1 más 2 nodos de control.** Componentes: `card`, `stack`, `text`, `button`, `field`, `slider`, `choice` (con hijo `opt`), `toggle`, `list` (con hijo `item`), `table`, `chart` y `timer`. Nodos de control: `each` e `if`. Cubren los 10 casos del benchmark (ver §7). No hay `icon` como componente: es un atributo de `button` e `item`. No hay `progress`: `timer` lleva su propio indicador.

**D10. Iteración sobre datos con `@data` en formato de tabla con barras.** JSON dentro del texto costaría tokens y comillas dobles. Las filas `| a | b |` imitan las tablas Markdown, que los modelos conocen bien. Idea tomada de A2UI: separar el modelo de datos de la estructura.

**D11. Eventos.** Hay tres acciones, ninguna con JavaScript: `do={x = x + 1}` para estado local, `send='texto {x}'` para mandar un mensaje al modelo y `link=https://…` para abrir un enlace.
- En MCP, `send` usa `ui/message` y `link` usa `ui/open-link`.
- En el chat local, `send` añade un mensaje de usuario y vuelve a llamar al modelo.
- Además, en MCP el estado se comunica al modelo con `ui/update-model-context` (con *debounce* de 1 s), para que sepa lo que el usuario ajustó sin pedírselo.

**D12. Empaquetado en un solo HTML con un script propio de unas 30 líneas** (`apps/web/tools/inline.ts`). Este script mete `main.js` y `styles.css` dentro de `index.html`. Se descartan `vite-plugin-singlefile` (Angular no usa Vite para el build) y los *loaders* de terceros. Requisito: no usar rutas diferidas ni `import()` dinámico, y el script falla si encuentra más archivos `.js`.

**D13. Iconos como SVG embebido; fuente desde Google Fonts con alternativa.** Los iconos son un subconjunto de unos 60 símbolos tomados de `@material-symbols/svg-400` y generados como un mapa TS en compilación. Pesan poco, funcionan sin red y el catálogo lista sus nombres. Para la fuente, Roboto Flex se carga desde Google Fonts declarando `resourceDomains` en la CSP del recurso. Si el host la bloquea, se usa `system-ui` sin romper nada. Embeber Roboto Flex en base64 añadiría más de 1 MB.

**D14. Sin autenticación en v1.** La herramienta no tiene efectos laterales ni accede a datos. La ruta MCP lleva un segmento secreto (`/mcp/<token>`) para evitar uso casual. El riesgo está en el §9.

**D15. Ideas de A2UI.** Se adoptan la separación entre datos y estructura (D10), un identificador de versión del catálogo (D8) y la regla de que el cliente solo pinta tipos conocidos. Se descarta el formato JSON de mensajes por su coste en tokens (ver §7).

**D16. Vía local aplazada (14 oct 2026, decisión del usuario).** Al usuario le es indiferente el chat local, así que sale de v1: la fase 7 no se ejecuta, `gen/gbnf.ts` no se escribe y el benchmark solo mide con Claude. D4 queda como diseño de referencia si se retoma. El parser y el renderer no cambian, porque no dependen de la vía.

**D17. Todo lo que lee el modelo va en inglés (14 oct 2026, petición del usuario).** Afecta al prompt del catálogo, a las descripciones de componentes y props, a la documentación generada, a los mensajes de diagnóstico, al texto del resultado de `render` y al contexto de estado. El inglés gasta menos tokens que el español con el mismo contenido y es el idioma en que mejor siguen instrucciones los modelos. Los comentarios del código y este plan siguen en español, porque los lee el usuario. Los casos del benchmark que no aparecen en el prompt siguen en español, porque representan el uso real.

---

## 3. Arquitectura y estructura del repositorio

```
claude.ai ──(tool call render{ui})──► apps/server (Bun, MCP Streamable HTTP)
    │                                      │ parse() → diagnósticos al modelo
    │◄────── resources/read ui://gui/view.html (HTML único) ─┘
    │
    └─ iframe aislado: apps/web/view ── App (ext-apps) ── ontoolinputpartial / ontoolinput
                                         └─ <gui-render [source]> ── parse() ── gui-outlet → componentes M3E

llama-server ──(SSE /v1/chat/completions, grammar opcional)──► apps/web/chat
                                         └─ <gui-render [source]> (mismo renderer)
```

```
/
├─ package.json            # workspaces: ["packages/*", "apps/*"]; scripts raíz
├─ bunfig.toml
├─ tsconfig.base.json      # strict, paths @gui/catalog y @gui/lang → src/index.ts
├─ PLAN.md
├─ packages/
│  ├─ catalog/
│  │  ├─ src/defs.ts         # ÚNICA fuente: las 12 definiciones + opt/item/each/if
│  │  ├─ src/types.ts        # ComponentDef, PropDef… (§4)
│  │  ├─ src/icons.ts        # GENERADO: nombre → path SVG
│  │  ├─ src/index.ts
│  │  ├─ gen/prompt.ts       # → out/catalog.txt
│  │  ├─ gen/gbnf.ts         # → out/gui.gbnf
│  │  ├─ gen/docs.ts         # → out/CATALOG.md
│  │  ├─ gen/icons.ts        # → src/icons.ts
│  │  ├─ out/                # generados, versionados en git
│  │  └─ test/catalog.test.ts
│  └─ lang/
│     ├─ src/parse.ts        # parser por líneas → ParseResult
│     ├─ src/expr.ts         # lexer + Pratt parser + evaluador seguro
│     ├─ src/inline.ts       # Markdown en línea → Run[]
│     ├─ src/validate.ts     # aplica defs a nodos
│     ├─ src/index.ts
│     └─ test/*.test.ts
├─ apps/
│  ├─ web/                 # workspace Angular 22 (Node)
│  │  ├─ angular.json      # proyectos: view, chat
│  │  ├─ projects/renderer/  # carpeta compartida (no es librería ng-packagr)
│  │  │  ├─ render.ts, outlet.ts, scope.ts, theme.ts, motion.css, tokens.css
│  │  │  └─ components/{card,stack,text,button,field,slider,choice,toggle,list,table,chart,timer,markdown,each,if}.ts
│  │  ├─ projects/view/      # app MCP: main.ts + App de ext-apps
│  │  ├─ projects/chat/      # app de chat local
│  │  └─ tools/{inline.ts,springs.ts}
│  └─ server/
│     ├─ src/main.ts         # Bun.serve + createMcpHandler(factory)
│     └─ test/server.test.ts
└─ bench/
   ├─ cases/NN-nombre.gui   # 10 casos (§7)
   ├─ cases/01.json, 05.json  # equivalentes JSON escritos a mano (referencia de formato)
   ├─ to-json.ts            # árbol → JSON equivalente para los 10 casos
   ├─ measure.ts            # cuenta tokens (Anthropic + llama.cpp)
   ├─ gen-eval.ts           # tasa de UIs válidas generadas por el modelo
   └─ RESULTS.md
```

**Regla de imports.** `@gui/lang` y `@gui/catalog` son TS puro, sin dependencias de DOM ni de Bun. Angular los consume con `paths` del `tsconfig` que apuntan a `src`, sin compilarlos aparte. Bun los consume como *workspaces*.

**Explicación para el usuario (no Angular).** El servidor es un único archivo con unas 80 líneas. Recibe peticiones HTTP en `/mcp/<token>` y se las pasa al SDK oficial de MCP, que se encarga del protocolo. Registra una herramienta (`render`), que parsea el texto y devuelve avisos, y un recurso (`ui://gui/view.html`), que devuelve el HTML de la app Angular. No guarda estado.

---

## 4. Contratos

### 4.1 Definición de componente (`packages/catalog/src/types.ts`)

```ts
export type PropType =
  | { k: 'num'; min?: number; max?: number; int?: boolean }
  | { k: 'str' }                       // texto corto; admite plantilla con {expr}
  | { k: 'bool' }                      // atributo sin valor = true
  | { k: 'enum'; v: readonly string[] }
  | { k: 'state' }                     // nombre de un @state (bind)
  | { k: 'data' }                      // nombre de un @data
  | { k: 'cols' }                      // lista separada por comas de columnas
  | { k: 'icon' }                      // nombre del mapa de iconos
  | { k: 'action' }                    // {asignaciones}
  | { k: 'tpl' }                       // plantilla de texto ('Hola {x}')
  | { k: 'url' }                       // solo https:
  | { k: 'expr' };                     // {expr} obligatoria (if test)

export interface PropDef {
  t: PropType;
  req?: boolean;
  def?: string | number | boolean;     // por defecto, aplicado por validate()
  expr?: boolean;                      // admite {expr} reactiva (por defecto true salvo state/data/action/expr)
  sig?: string;                        // sustituye al tipo en la firma del prompt (p. ej. 'col')
  doc: string;                         // ≤ 8 palabras, va a la documentación, no al prompt
}

export interface ComponentDef {
  name: string;                        // minúsculas, ≤ 7 letras
  doc: string;                         // ≤ 12 palabras, va al prompt
  props: Record<string, PropDef>;
  content: 'none' | 'text' | 'nodes' | { only: readonly string[] }; // qué admite dentro
  textAs?: string;                     // qué significa el texto interior (p. ej. 'etiqueta')
  parentOnly?: string;                 // 'opt' solo dentro de 'choice'
  control?: boolean;                   // each, if: nodos de control, no visuales
}

export const defineComponent = <const D extends ComponentDef>(d: D) => d;
export type PropsOf<D extends ComponentDef> = { [K in keyof D['props']]: /* inferido de t */ unknown };
```

El ejecutor implementa `PropsOf` con tipos condicionales para que cada componente Angular tenga sus props tipadas sin generar código.

### 4.2 Nodos del árbol (`packages/lang/src/index.ts`)

```ts
export type Expr = { src: string; ast: ExprAst };   // ast del Pratt parser
export type Run =
  | { s: string; b?: true; i?: true; code?: true; href?: string }
  | { e: Expr };                                     // {expr} dentro de texto
export type Value = string | number | boolean | Expr | { tpl: Run[] } | { act: Assign[] };
export type Assign = { name: string; e: Expr };

export interface ElNode {
  k: 'el'; id: string;       // id = ruta estable "0.3.1" (índices entre hermanos)
  t: string;                 // nombre de componente o 'each'/'if'/'opt'/'item'
  p: Record<string, Value>;  // ya validadas y con valores por defecto
  c: Node[];                 // hijos
  text?: Run[];              // contenido de texto si content='text'
  line: number;
  open: boolean;             // true si aún no llegó el cierre (streaming)
}
export interface MdNode {
  k: 'md'; id: string; line: number;
  block: 'p' | 'h1' | 'h2' | 'h3' | 'li' | 'oli' | 'quote' | 'hr';
  n?: number;                // número en 'oli'
  runs: Run[];
}
export type Node = ElNode | MdNode;

export interface StateDecl { name: string; init: Expr; line: number }
export type Row = Record<string, string | number>;

export interface ParseResult {
  nodes: Node[];
  states: StateDecl[];
  data: Record<string, { cols: string[]; rows: Row[] }>;
  theme: { seed?: string; scheme?: 'expressive' | 'tonal' | 'vibrant' };
  diags: Diag[];
  complete: boolean;         // = opts.final
}
export function parse(src: string, opts: { final: boolean }): ParseResult;
```

### 4.3 Diagnósticos

```ts
export type DiagCode =
  | 'unknown_tag'     // se pinta la línea como texto
  | 'unknown_prop'    // se ignora
  | 'bad_value'       // se usa el valor por defecto
  | 'missing_prop'    // se omite el nodo; sus hijos suben al padre
  | 'bad_child'       // hijo no permitido: se omite
  | 'unclosed'        // solo con final=true: se cierra en EOF
  | 'stray_close'     // cierre sin apertura: se ignora
  | 'bad_expr'        // se muestra '—'
  | 'unknown_state'   // bind a estado no declarado: se autodeclara
  | 'unknown_data'    // se omite el nodo
  | 'bad_icon'        // se omite el icono
  | 'limit';          // se trunca la entrada
export interface Diag { code: DiagCode; line: number; sev: 'warn' | 'error'; msg: string }
// msg en inglés (lo lee el modelo, D17) y ≤ 80 caracteres:
// "L7 slider: missing bind (node dropped)"
```

Límites (constantes en `packages/lang/src/limits.ts`): entrada ≤ 20 000 caracteres, ≤ 400 nodos, ≤ 40 `@state`, ≤ 10 `@data` con ≤ 200 filas cada uno, expresión ≤ 300 caracteres y ≤ 10 000 pasos de evaluación.

### 4.4 Herramienta MCP `render`

Versiones: `@modelcontextprotocol/server` 2.3.1 y `@modelcontextprotocol/ext-apps` 2.0.3 (helpers `registerAppTool`, `registerAppResource` y la constante `RESOURCE_MIME_TYPE`, verificados en el `.d.ts` publicado).

```ts
// Esquema (zod 4.6.7)
// Siempre z.object(): la forma plana { campo: z.string() } está deprecada en ext-apps 2.0.3.
const inputSchema  = z.object({ ui: z.string().max(20000).describe('UI in GUI-ML') });
const outputSchema = z.object({ ok: z.boolean(), nodes: z.number(), diags: z.array(z.object({
                       line: z.number(), code: z.string(), msg: z.string() })) });

registerAppTool(server, 'render', {
  title: 'Render UI',
  description: CATALOG_TXT,              // packages/catalog/out/catalog.txt, estable
  inputSchema, outputSchema,
  annotations: { readOnlyHint: true, openWorldHint: false },
  _meta: { ui: { resourceUri: 'ui://gui/view.html' } },
}, handler);

// handler: parse(ui, {final:true}) → resultado
{ content: [{ type: 'text', text: diags.length
      ? `Rendered with ${diags.length} warnings. Fix them next time:\n` + diags.map(d => d.msg).join('\n')
      : 'Rendered with no warnings.' }],
  structuredContent: { ok: !diags.some(d => d.sev === 'error'), nodes, diags },
  _meta: { catalog: CATALOG_HASH } }

registerAppResource(server, 'GUI view', 'ui://gui/view.html', {
  mimeType: RESOURCE_MIME_TYPE,          // 'text/html;profile=mcp-app'
  _meta: { ui: { csp: { resourceDomains: ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'] } } },
}, async () => ({ contents: [{ uri: 'ui://gui/view.html', mimeType: RESOURCE_MIME_TYPE, text: VIEW_HTML }] }));
```

Transporte (verificado en la fase 1): `createMcpHandler(factory)` de `@modelcontextprotocol/server`. La `factory` recibe el contexto de la petición y devuelve un `McpServer` nuevo con la herramienta y el recurso registrados. `handler.fetch(request)` es la interfaz web estándar y se monta tal cual en `Bun.serve` para `/mcp/:token`. Sirve la revisión de protocolo 2026-07-28 y, por defecto, atiende a los clientes de 2025 en modo sin estado (`legacy: 'stateless'`): no hay sesiones que gestionar. El handler no valida `Host` ni `Origin`, así que delante va `hostHeaderValidationResponse(request, [PUBLIC_HOST, 'localhost'])`, con `PUBLIC_HOST` leído del entorno. `WebStandardStreamableHTTPServerTransport` existe, pero no hace falta.

### 4.5 Protocolo de la vista (`projects/view`)

La vista usa `App` de `@modelcontextprotocol/ext-apps`:
- `ontoolinputpartial`: si el host la envía, pasa `params.arguments.ui` (texto parcial) a `source` con `final=false`. Es **opcional**: la especificación dice que el host *MAY* enviarla.
- `ontoolinput`: fija `source` con `final=true`.
- `ontoolresult`: muestra un indicador discreto si hay errores (no los diagnósticos completos).
- `onhostcontextchanged`: `theme` claro u oscuro y se aplica el modo.
- Acciones: `send` llama a `app.sendMessage(...)`, `link` llama a `app.openLink(...)` y los cambios de estado llaman a `app.updateModelContext(...)` con *debounce* de 1 s y texto compacto en inglés `state: people=6, tip=15`.
- El tamaño lo notifica `App` (`ui/notifications/size-changed`). Si no se hace solo, se observa `document.body` con `ResizeObserver`.

---

## 5. Lenguaje GUI-ML

### 5.1 Reglas

1. **Orientado a líneas.** Cada línea es una directiva (`@…`), una fila de datos (`|…`), una etiqueta o Markdown. Se ignoran la sangría y las líneas vacías, salvo que una línea vacía separa párrafos.
2. **Una etiqueta por línea.** Se admite `<x …>texto</x>` en una sola línea para componentes de texto. No se admiten varias etiquetas de bloque en la misma línea; si aparecen, se emite `bad_child` y el resto de la línea se pinta como texto.
3. **Sin comillas dobles.** Los valores van sin comillas (`pad=3`), entre comillas simples (`sub='Paseo por el Retiro'`) o como expresión (`max={n*2}`). Si aparece `"`, se trata como carácter normal dentro de un valor sin comillas y se emite `bad_value`.
4. **El texto va como contenido.** Las etiquetas y textos de botones van entre la apertura y el cierre. Solo `item.sub`, `item.trail`, `choice.label` y las plantillas de acción admiten texto en atributos.
5. **Cierre.** `</nombre>`. Si el cierre no coincide, se cierran los nodos abiertos hasta encontrar ese nombre; si no existe, se ignora (`stray_close`). Al final del streaming se cierra todo (`unclosed`, solo si `final`).
6. **Salida parcial.** El parser procesa todas las líneas completas. La última línea, sin `\n`:
   - si es Markdown, se pinta lo que haya (efecto de escritura);
   - si empieza por `<`, `@` o `|`, se retiene hasta que llegue el salto de línea, o hasta `>` en el caso de una etiqueta. Una etiqueta de texto en línea sin cerrar muestra su texto parcial.
7. **Estado.** `@state nombre = expr` se evalúa una vez al crearse y produce `signal()`. Las declaraciones se elevan al principio: puedes usarlas antes de declararlas. Si se redeclara, gana la primera y se emite `dup_state` como `bad_value`.
8. **Escapes en texto:** `\<`, `\{`, `\}`, `\|`, `\@` y `\\`. Al principio de línea, `\<` evita que se interprete como etiqueta.
9. **Estilo solo con tokens:** `pad`/`gap` de 0 a 6, `tone`, `emphasis`, `size`, `shape`. No hay CSS, ni `style`, ni `class`.

### 5.2 EBNF

```ebnf
doc        = { line , NL } , [ line ] ;
line       = WS , ( directive | datarow | close | open | mdline | empty ) , WS ;

directive  = "@state" , SP , ident , WS , "=" , WS , expr
           | "@data"  , SP , ident , WS , ":" , WS , ident , { WS , "," , WS , ident }
           | "@theme" , { SP , attr } ;                 (* seed=6750A4 scheme=expressive *)
datarow    = "|" , cell , { "|" , cell } , [ "|" ] ;      (* tras el último @data; "|---|" se ignora *)
cell       = { CHAR - ( "|" | NL ) } ;                    (* recortada; si parece número, número *)

open       = "<" , name , { SP , attr } , WS , ( "/>" | ">" , [ inline , [ "</" , name , ">" ] ] ) ;
close      = "</" , name , ">" ;
attr       = ident , [ "=" , value ] ;                    (* sin valor ⇒ true *)
value      = squoted | brace | bare ;
bare       = 1*( CHAR - ( SP | ">" | "'" | "{" ) ) ;       (* "/" final seguido de ">" cierra la etiqueta *)
squoted    = "'" , { escape | brace | CHAR - "'" } , "'" ;  (* plantilla: admite {expr} *)
brace      = "{" , expr , "}" ;

mdline     = mdprefix , inline ;                          (* primer carácter ≠ "<" "@" "|" sin escapar *)
mdprefix   = [ ( "#" | "##" | "###" ) , SP | "- " | digit , ". " | "> " | "---" ] ;
inline     = { escape | brace | strong | em | code | link | CHAR - NL } ;
strong     = "**" , inline , "**" ;   em = "*" , inline , "*" ;   code = "`" , { CHAR - "`" } , "`" ;
link       = "[" , { CHAR - "]" } , "](https://" , { CHAR - ")" } , ")" ;
escape     = "\" , ( "<" | "{" | "}" | "|" | "@" | "\" ) ;

name       = "a".."z" , { "a".."z" } ;
ident      = LETTER , { LETTER | DIGIT | "_" } ;          (* LETTER = \p{L}; "_" se muestra como espacio en cabeceras *)

(* Expresiones: Pratt parser, de menor a mayor precedencia *)
expr       = assign_list | ternary ;                       (* assign_list solo en do={…} *)
assign_list= ident , "=" , ternary , { ";" , ident , "=" , ternary } ;
ternary    = or , [ "?" , ternary , ":" , ternary ] ;
or         = and , { "||" , and } ;     and = eq , { "&&" , eq } ;
eq         = cmp , { ( "==" | "!=" ) , cmp } ;
cmp        = add , { ( "<" | "<=" | ">" | ">=" ) , add } ;
add        = mul , { ( "+" | "-" ) , mul } ;  mul = unary , { ( "*" | "/" | "%" ) , unary } ;
unary      = [ "!" | "-" ] , postfix ;
postfix    = primary , { "." , ident | "[" , expr , "]" | "(" , [ expr , { "," , expr } ] , ")" } ;
primary    = number | "'" , { CHAR - "'" } , "'" | "true" | "false" | "[" , [ expr , { "," , expr } ] , "]"
           | ident | "(" , expr , ")" ;
```

**Funciones permitidas** (todas puras, en `expr.ts`):

| Función | Uso |
|---|---|
| `round(x,d=0)`, `floor`, `ceil`, `abs`, `min(...)`, `max(...)`, `clamp(x,a,b)` | aritmética |
| `fmt(x,d?)` | número con formato `es-ES` |
| `money(x,'EUR')` | `Intl.NumberFormat` con moneda |
| `pct(x,d=0)` | 0.25 → `25 %` |
| `time(s)` | 75 → `1:15` |
| `len(l)`, `sum(l,'col')`, `avg(l,'col')` | listas y datos |
| `get(datos, clave, 'col')` | busca la fila cuya primera columna es `clave` |
| `has(l, v)` | pertenencia (para `choice multi`) |
| `upper`, `lower`, `join(l, sep)` | texto |

**Seguridad del evaluador:**
- Se prohíben `__proto__`, `prototype` y `constructor` como miembros.
- Solo se accede a propiedades propias de filas y listas.
- No se puede llamar a valores: solo a nombres de la tabla de funciones.
- Las asignaciones solo afectan a `@state` existentes.
- La división por cero, `NaN` o un error producen `—` en texto y un diagnóstico `bad_expr` por expresión, sin repetirse.

### 5.3 Semántica de `bind`, `each` e `if`

- `bind=x` enlaza en ambos sentidos con el signal `x`. Si `x` no existe, se autodeclara con el valor neutro del componente (`slider`: `min`, `field`: `''`, `toggle`: `false`, `choice`: `''` o `[]` si es múltiple) y se emite `unknown_state`.
- `<each in=datos as=x>` repite sus hijos por cada fila. Si se omite `as`, vale `it`. Cada repetición crea un ámbito hijo con `x`. Los `id` de los hijos llevan el índice de la fila.
- `<if test={expr}>` pinta sus hijos si `expr` es verdadero. No hay `else` en v1: usa otro `if` o un ternario.
- Un `button` con `send` dentro de una `card` que contiene un `field req` vacío queda deshabilitado.

### 5.4 Markdown admitido

Encabezados `#`, `##` y `###`; párrafos; listas `-` y `1.`; citas `>`; separador `---`; y en línea `**negrita**`, `*cursiva*`, `` `código` `` y `[texto](https://…)`.
- Los enlaces solo admiten `https:` y se abren con la acción `link`.
- Las tablas Markdown no se admiten: usa `@data` y `table`. Si una línea empieza por `|` sin `@data` previo, se trata como texto.
- No se admiten imágenes ni HTML: `<img>` sería `unknown_tag` y se pinta como texto.

### 5.5 Cinco ejemplos completos

Son los casos 1, 3, 4, 7 y 8 del benchmark. Están escritos tal y como debe aceptarlos el parser sin diagnósticos.

**E1. Calculadora: dividir la cuenta** (en inglés, porque es ejemplo del prompt)
```
@state bill = 84
@state tip = 10
@state people = 4
<card>
## Split the bill
<field bind=bill type=number min=0>Amount (€)</field>
<slider bind=tip min=0 max=25 unit=%>Tip</slider>
<slider bind=people min=1 max=12>People</slider>
<text role=display tone=primary>{money(bill*(1+tip/100)/people,'EUR')}</text>
<text tone=muted>per person · total {money(bill*(1+tip/100),'EUR')}</text>
</card>
```

**E2. Receta con temporizador**
```
@state hechos = []
## Tortilla de patatas
<text tone=muted>4 raciones · 45 min</text>
<card tone=secondary>
### Ingredientes
<choice bind=hechos mode=check>
<opt>4 huevos</opt>
<opt>600 g de patatas</opt>
<opt>1 cebolla</opt>
<opt>Aceite de oliva y sal</opt>
</choice>
<text role=label>{len(hechos)}/4 listos</text>
</card>
1. Pela y corta las patatas en láminas finas.
2. Fríelas a fuego medio con la cebolla.
<timer secs=1200>Pochar patatas</timer>
3. Bate los huevos, mezcla y cuaja por cada lado.
<timer secs=180>Cuajar cada lado</timer>
```

**E3. Formulario de reserva** (en inglés, porque es ejemplo del prompt)
```
@state name = ''
@state date = ''
@state people = 2
@state slot = 'dinner'
@state terrace = false
<card>
## Book a table
<field bind=name req>Name</field>
<field bind=date type=date req>Date</field>
<choice bind=slot mode=segmented>
<opt v=lunch>Lunch</opt>
<opt v=dinner>Dinner</opt>
</choice>
<slider bind=people min=1 max=10>People</slider>
<toggle bind=terrace>Terrace</toggle>
<button icon=event send='Booking: {name}, {date}, {slot}, {people} people, terrace {terrace ? 'yes' : 'no'}'>Confirm</button>
</card>
```

**E4. Conversor de divisas**
```
@state cant = 100
@state de = 'EUR'
@state a = 'USD'
@data r: m, v
| EUR | 1
| USD | 1.09
| GBP | 0.85
| JPY | 162
<card>
<field bind=cant type=number>Cantidad</field>
<stack dir=row>
<choice bind=de from=r mode=select label=De/>
<choice bind=a from=r mode=select label=A/>
</stack>
<text role=display tone=primary>{fmt(cant/get(r,de,'v')*get(r,a,'v'),2)} {a}</text>
<text tone=muted>1 {de} = {fmt(get(r,a,'v')/get(r,de,'v'),4)} {a}</text>
</card>
```

**E5. Pregunta de quiz**
```
@state r = ''
<card>
### ¿Cuál es el planeta más grande del sistema solar?
<choice bind=r mode=radio>
<opt>Saturno</opt>
<opt>Júpiter</opt>
<opt>Neptuno</opt>
</choice>
<if test={r == 'Júpiter'}>
<text tone=primary>Correcto: su diámetro es 11 veces el de la Tierra.</text>
</if>
<if test={r != '' && r != 'Júpiter'}>
<text tone=error>No. Prueba otra vez.</text>
</if>
<button variant=text send='Otra pregunta de astronomía'>Siguiente</button>
</card>
```

### 5.6 Catálogo v1 (contenido de `defs.ts`, en forma de firma)

Esta es la forma exacta que debe producir `gen/prompt.ts` para cada componente: `?` marca lo opcional y `=` el valor por defecto. Tonos de `card`: `surface|primary|secondary|tertiary|error`. Tonos de `text`: `default|muted|primary|secondary|tertiary|error`.

```
card(pad?:0-6=3, tone?:surface|primary|secondary|tertiary|error=surface, emphasis?:low|high=low) [nodos]
stack(dir?:row|col=col, gap?:0-6=2, align?:start|center|end|stretch|between=stretch) [nodos]  # row hace wrap
text(role?:display|headline|title|body|label=body, size?:s|m|l=m, tone?=default, em?:bool, align?:start|center|end) [texto]
button(variant?:filled|tonal|outlined|text|elevated=filled, size?:xs|s|m|l|xl=s, shape?:round|square=round, icon?, do?, send?, link?) [etiqueta]
field(bind:state, type?:text|number|email|date|tel=text, min?:n, max?:n, step?:n, req?:bool) [etiqueta]
slider(bind:state, min:n, max:n, step?:n=1, unit?:s) [etiqueta]
choice(bind:state, mode?:chips|segmented|radio|select|check=chips, multi?:bool, from?:data, label?:s) [opt*]  # check ⇒ multi
  opt(v?:s=texto) [texto]
toggle(bind:state, kind?:switch|check=switch) [etiqueta]
list(divider?:bool) [item*]
  item(icon?, sub?:s, trail?:s, do?, send?, link?) [titular]
table(data, cols?:col,col…, best?:col:min|max,…) []
chart(type:bar|line|pie|donut, data, x:col, y:col,col…, unit?:s) []
timer(secs:n, auto?:bool) [etiqueta]
each(in:data, as?:id=it) [nodos]    if(test:{expr}) [nodos]
```

---

## 6. Sistema de diseño (M3 Expressive)

Todos los tokens son variables CSS en `projects/renderer/tokens.css`, con el prefijo `--md-sys-*` para seguir la nomenclatura de M3. Los componentes solo usan variables, nunca valores literales. Valores verificados el 14 oct 2026 contra el código fuente de Compose Material 3 (`androidx-main`: `ExpressiveMotionTokens.kt`, `ShapeTokens.kt`, `TypeScaleTokens.kt` y `Button*Tokens.kt`). Si cambian, se corrige aquí y en `tokens.css`.

### 6.1 Color

- Se genera con `@material/material-color-utilities` 0.4.0 en tiempo de ejecución, a partir de `seed` (`@theme seed=…`, por defecto `#6750A4`).
- Variante: `expressive`, o `tonal` si `scheme=tonal`. Llamada verificada: `new SchemeExpressive(Hct.fromInt(argbFromHex(seed)), isDark, 0, '2025', 'phone')` y los roles con `new MaterialDynamicColors()[rol]().getArgb(scheme)`. Expone 53 roles; se emiten los de la lista siguiente.
- Se emiten todos los roles como `--md-sys-color-<rol>` para el modo claro y el oscuro: primary, on-primary, primary-container, on-primary-container (y lo mismo para secondary, tertiary y error), surface, on-surface, on-surface-variant, surface-container-{lowest,low,,high,highest}, outline, outline-variant, inverse-surface, inverse-on-surface e inverse-primary.
- El modo oscuro sigue `host-context.theme` en MCP; si no hay, `prefers-color-scheme`. Se cambia con `[data-theme]` en la raíz.
- Mapeo de `tone` en `card`:

| tone | emphasis=low | emphasis=high |
|---|---|---|
| surface | `surface-container-low` + borde `outline-variant` | `surface-container-highest` |
| primary, secondary, tertiary, error | `*-container` / `on-*-container` | `*` / `on-*` |

### 6.2 Tipografía

Fuente: Roboto Flex (eje `wght`, y `wdth` en `display`), con `system-ui` como alternativa. Escala base M3 (tamaño/interlineado en px, peso):

| role | l | m | s |
|---|---|---|---|
| display | 57/64 400 | 45/52 400 | 36/44 400 |
| headline | 32/40 400 | 28/36 400 | 24/32 400 |
| title | 22/28 400 | 16/24 500 | 14/20 500 |
| body | 16/24 400 | 14/20 400 | 12/16 400 |
| label | 14/20 500 | 12/16 500 | 11/16 500 |

`em` aplica el estilo **enfatizado** de M3 Expressive, que sube un nivel el peso (400 → 500, 500 → 700; en `label`, `title` m y `title` s pasa a 700). Mapeo del Markdown: `#` = headline m, `##` = title l, `###` = title m em y párrafo = body l. `text role=display` usa números tabulares (`font-variant-numeric: tabular-nums`) para que no salten al cambiar.

### 6.3 Forma

Esquinas: `none` 0, `xs` 4, `s` 8, `m` 12, `l` 16, `l-inc` 20, `xl` 28, `xl-inc` 32, `xxl` 48 y `full` 9999 px.

- `card`: `l`.
- `button`: `shape=round` usa `full`. La forma al pulsar no depende de `shape`, sino del tamaño, y es la misma tanto si el botón es redondo como cuadrado:

| size | altura | shape=square | al pulsar |
|---|---|---|---|
| xs | 32 | m (12) | s (8) |
| s | 40 | m (12) | s (8) |
| m | 56 | l (16) | m (12) |
| l | 96 | xl (28) | l (16) |
| xl | 136 | xl (28) | l (16) |

- `choice mode=segmented|chips`: la opción seleccionada pasa de `full` a `m`.
- `toggle kind=switch`: el pulgar crece al pulsar.
- `timer`: el indicador hace morph entre polígonos redondeados (6.6).

### 6.4 Espaciado y tamaños

`pad` y `gap` de 0 a 6 equivalen a 0, 4, 8, 12, 16, 24 y 32 px. Alturas de botón: ver la tabla del §6.3. El objetivo táctil mínimo es 48 px, con área extendida mediante un pseudoelemento en `xs` y `s`.

### 6.5 Movimiento

Los springs de M3 Expressive, con amortiguación ζ y rigidez k (masa 1), se convierten a CSS con `apps/web/tools/springs.ts`, que genera `motion.css`:
- `--md-sys-motion-<familia>-<vel>: linear(…)`, con unos 40 puntos muestreados de la solución analítica del oscilador amortiguado.
- `--md-sys-motion-<familia>-<vel>-dur: <ms>`, el tiempo hasta |x−1| < 0,001.

| Token | ζ | k | Uso |
|---|---|---|---|
| spatial-fast | 0.6 | 800 | morph de botones y chips |
| spatial-default | 0.8 | 380 | entrada de nodos, tamaño |
| spatial-slow | 0.8 | 200 | `timer` y gráficos |
| effects-fast | 1 | 3800 | state layers |
| effects-default | 1 | 1600 | opacidad de entrada |
| effects-slow | 1 | 800 | color de tema |

Reglas:
- **Spatial** (posición, escala y forma) puede rebotar. **Effects** (color y opacidad) nunca rebota.
- **Entrada en streaming.** Cada elemento nuevo usa `animate.enter="m3-enter"`, que va de `translateY(8px) scale(.98)` y opacidad 0 al reposo con spatial-default para el transform y effects-default para la opacidad. Los nodos que solo se actualizan no se animan; se garantiza con `track n.id`.
- **`emphasis=high`** usa spatial-slow con `scale(.94)` inicial.
- **`prefers-reduced-motion: reduce`**: los transforms y morphs se anulan y solo queda opacidad con 100 ms lineales. Se implementa redefiniendo las variables en una media query; los componentes no tienen lógica propia para esto.
- Para los gráficos, las barras y líneas crecen desde 0 con spatial-slow al aparecer y al cambiar los datos.

### 6.6 State layers, foco y morph

- **State layer:** un `::before` con `background: currentColor` y opacidad 0,08 en *hover*, 0,10 en *focus*, 0,10 en *pressed* y 0,16 en *dragged*, con transición effects-fast. No hay *ripple* en v1.
- **Foco:** `FocusMonitor` del CDK. El anillo de 3 px `secondary` con desplazamiento de 2 px solo aparece con teclado.
- **Morph del `timer`:** polígonos redondeados con el mismo número de vértices (círculo, 8 lóbulos y 4 lóbulos), generados como `path()` SVG e interpolados con `d` en una animación CSS. Se activa cuando el temporizador corre y se para con reduced motion.

### 6.7 Accesibilidad (criterios fijos)

- Se usan elementos nativos siempre que se pueda: `<button>`, `<input type=range>` estilizado, `<input>`, `<select>` y `role=radiogroup` con navegación por flechas mediante `ListKeyManager` del CDK.
- Todo control tiene nombre accesible a partir de su texto interior o de `label`.
- `chart` incluye una tabla `visually-hidden` con los datos.
- `timer` anuncia el final con `LiveAnnouncer` y el cambio de estado con `aria-live=polite`.
- El contraste lo garantiza el esquema de color. Se comprueba con axe en la fase 8.

---

## 7. Benchmark de tokens

### 7.1 Los 10 casos

Los casos 1, 3, 4, 7 y 8 son E1–E5 del §5.5. Se copian tal cual a `bench/cases/`.

| # | Archivo | Qué ejercita |
|---|---|---|
| 1 | `01-cuenta.gui` | E1: field, slider, expresiones |
| 2 | `02-portatiles.gui` | @data, table best, each, card |
| 3 | `03-receta.gui` | E2: choice check, timer, Markdown con lista numerada |
| 4 | `04-reserva.gui` | E3: formulario, req, send con plantilla |
| 5 | `05-ventas.gui` | chart bar, avg |
| 6 | `06-itinerario.gui` | list/item, iconos |
| 7 | `07-divisas.gui` | E4: choice from, get |
| 8 | `08-quiz.gui` | E5: if, radio |
| 9 | `09-kpis.gui` | stack row, each, tono por expresión, chart line |
| 10 | `10-mudanza.gui` | checklist, pct, if |

**02-portatiles.gui**
```
@data p: Modelo, Precio, Peso_kg, Autonomía_h, Nota
| Air 13 | 1199 | 1.24 | 18 | 4.6
| XPS 14 | 1499 | 1.68 | 13 | 4.4
| Zenbook 14 | 999 | 1.20 | 15 | 4.5
## Portátiles ligeros
<table data=p best=Precio:min,Peso_kg:min,Autonomía_h:max,Nota:max/>
<stack dir=row>
<each in=p as=x>
<card pad=2>
### {x.Modelo}
<text tone=muted>{money(x.Precio,'EUR')} · {x.Peso_kg} kg</text>
<button variant=tonal send='Más detalles del {x.Modelo}'>Detalles</button>
</card>
</each>
</stack>
```

**05-ventas.gui**
```
@data v: Mes, Ventas, Gastos
| Ene | 42 | 30
| Feb | 51 | 33
| Mar | 47 | 35
| Abr | 63 | 38
| May | 70 | 41
| Jun | 82 | 44
## Primer semestre 2026
<chart type=bar data=v x=Mes y=Ventas,Gastos unit=k€/>
<text tone=muted>Margen medio: {fmt(avg(v,'Ventas')-avg(v,'Gastos'),1)} k€</text>
```

**06-itinerario.gui**
```
## Lisboa en 2 días
### Sábado
<list>
<item icon=coffee trail=09:00 sub='Pastéis de Belém'>Desayuno</item>
<item icon=museum trail=10:30 sub='Monasterio de los Jerónimos'>Belém</item>
<item icon=tram trail=15:00 sub='Tranvía 28 hasta Graça'>Alfama</item>
<item icon=restaurant trail=21:00 sub='Fado en Mouraria'>Cena</item>
</list>
### Domingo
<list>
<item icon=train trail=10:00 sub='Tren desde Rossio, 40 min'>Sintra</item>
<item icon=castle trail=11:30 sub='Palacio da Pena'>Visita</item>
<item icon=sunny trail=19:00 sub='Mirador de Santa Catarina'>Atardecer</item>
</list>
<button variant=tonal icon=map send='Hazme un mapa del itinerario'>Ver en mapa</button>
```

**09-kpis.gui**
```
@data k: Métrica, Valor, Cambio
| Usuarios | 12480 | 8.2
| Ingresos (k€) | 312 | -2.1
| Churn (%) | 3.4 | -0.6
@data s: Semana, Usuarios
| S1 | 10900
| S2 | 11350
| S3 | 11920
| S4 | 12480
<stack dir=row>
<each in=k as=m>
<card pad=2>
<text role=label tone=muted>{m.Métrica}</text>
<text role=headline>{fmt(m.Valor)}</text>
<text tone={m.Cambio >= 0 ? 'primary' : 'error'}>{m.Cambio >= 0 ? '▲' : '▼'} {abs(m.Cambio)} %</text>
</card>
</each>
</stack>
<chart type=line data=s x=Semana y=Usuarios/>
```

**10-mudanza.gui**
```
@state hecho = []
## Mudanza: checklist
<choice bind=hecho mode=check>
<opt>Contratar camión</opt>
<opt>Dar de baja la luz</opt>
<opt>Cambiar dirección en el banco</opt>
<opt>Empaquetar cocina</opt>
<opt>Entregar llaves</opt>
</choice>
<text role=title>{len(hecho)} de 5 · {pct(len(hecho)/5)}</text>
<if test={len(hecho) == 5}>
<button icon=celebration send='¡He terminado la mudanza! ¿Qué hago ahora?'>Terminado</button>
</if>
```

### 7.2 JSON equivalente

**Cambio sobre el encargo, con motivo.** Escribir a mano 10 JSON equivalentes produce desviaciones difíciles de detectar. Por eso se escriben a mano solo `01.json` y `05.json`, que fijan el formato, y los otros 8 se generan con `bench/to-json.ts` a partir del árbol parseado. Un test comprueba que `to-json` aplicado a los casos 01 y 05 coincide con los JSON escritos a mano. Así la equivalencia queda garantizada.

El formato JSON es compacto y razonable, comparable con A2UI pero sin su envoltorio. Las claves cortas favorecen al JSON y hacen la comparación más honesta.

**01.json** (se mide minificado)
```json
{"state":{"bill":84,"tip":10,"people":4},
 "ui":[{"t":"card","c":[
  {"t":"md","v":"## Split the bill"},
  {"t":"field","p":{"bind":"bill","type":"number","min":0},"text":"Amount (€)"},
  {"t":"slider","p":{"bind":"tip","min":0,"max":25,"unit":"%"},"text":"Tip"},
  {"t":"slider","p":{"bind":"people","min":1,"max":12},"text":"People"},
  {"t":"text","p":{"role":"display","tone":"primary"},"text":"{money(bill*(1+tip/100)/people,'EUR')}"},
  {"t":"text","p":{"tone":"muted"},"text":"per person · total {money(bill*(1+tip/100),'EUR')}"}]}]}
```

**05.json**
```json
{"data":{"v":{"cols":["Mes","Ventas","Gastos"],"rows":[["Ene",42,30],["Feb",51,33],["Mar",47,35],["Abr",63,38],["May",70,41],["Jun",82,44]]}},
 "ui":[{"t":"md","v":"## Primer semestre 2026"},
  {"t":"chart","p":{"type":"bar","data":"v","x":"Mes","y":["Ventas","Gastos"],"unit":"k€"}},
  {"t":"text","p":{"tone":"muted"},"text":"Margen medio: {fmt(avg(v,'Ventas')-avg(v,'Gastos'),1)} k€"}]}
```

### 7.3 Método de medición (`bench/measure.ts`)

Se mide **lo que viaja de verdad**. GUI-ML se mide como `JSON.stringify({ui: texto})`, porque es el argumento de la herramienta e incluye el escapado de `\n`. JSON se mide como `JSON.stringify(objeto)` minificado, porque en ese diseño sería el argumento directo.

1. **Claude.** `POST https://api.anthropic.com/v1/messages/count_tokens` con las cabeceras `x-api-key`, `anthropic-version: 2023-06-01` y `content-type: application/json`, y el cuerpo `{"model":"claude-sonnet-5-5","messages":[{"role":"user","content":<texto>}]}`. Al resultado se le resta el de una base con `content:"."` y se suma 1. La clave se lee de `ANTHROPIC_API_KEY` y nunca se escribe en archivos.
2. **Modelo local.** `POST http://localhost:8080/tokenize` con `{"content":<texto>}` contra `llama-server` con el modelo elegido. Se cuenta `tokens.length`.
3. Se mide también el **catálogo** (`out/catalog.txt`) con ambos tokenizadores.
4. La salida es una tabla en `bench/RESULTS.md` con caso, tokens de GUI-ML, tokens de JSON y ratio, por tokenizador, más el total y la fecha.

**Objetivos (criterio de aceptación de la fase 8):**

| Métrica | Objetivo |
|---|---|
| Σ GUI-ML / Σ JSON (Claude) | ≤ 0,55 |
| Σ GUI-ML / Σ JSON (llama.cpp) | ≤ 0,60 (aplazado por D16) |
| Caso más largo en GUI-ML (Claude) | ≤ 350 tokens |
| Catálogo (Claude) | ≤ 1 300 tokens |
| Diagnósticos de los 10 casos | 0 |

**Si no se alcanza un objetivo de tokens**, no se cambia el lenguaje sin más. Se anota el resultado en `RESULTS.md` y se proponen cambios concretos en el §2, por ejemplo nombres más cortos.

### 7.4 Calidad de generación (`bench/gen-eval.ts`)

Se usan 10 peticiones en lenguaje natural, una por caso ("Hazme una calculadora para dividir una cuenta de 84 € con propina"). Para cada modelo se genera la UI con el catálogo como prompt y se parsea con `final=true`.

- **Válida:** 0 diagnósticos de nivel `error` y, como mucho, 2 de nivel `warn`.
- **Objetivos:** Claude ≥ 9/10 y modelo local ≥ 7/10 con gramática.
- También se registra el resultado del modelo local sin gramática.

---

## 8. Fases

Convenciones para todas las fases:
- Al terminar una fase, el ejecutor marca la fase como hecha en este archivo (`✅ fecha`) y anota en el §2 las decisiones nuevas.
- Comando de verificación global, que debe pasar al cerrar cada fase a partir de la 2: `bun run check`, que ejecuta `bun test` en los paquetes, `tsc --noEmit` y, a partir de la 4, `ng build` de las dos apps.
- No se añaden dependencias fuera de la tabla de versiones sin anotarlo en el §2 con su motivo.
- Usa `git` desde la fase 2 y haz un commit al cerrar cada fase.

### Fase 1. Verificar el ecosistema — ✅ 14 oct 2026

**Resultado.** Todo verificado. Cambios aplicados al plan: TypeScript 6.0.3 en vez de 7.0.2, `createMcpHandler` en vez del transporte manual (§4.4), esquemas con `z.object()` (§4.4) y forma de botón al pulsar según el tamaño (§6.3). Detalle en el anexo A. Proyecto de prueba: `@angular/cli new` crea un proyecto zoneless por defecto (sin `zone.js`), con Vitest 5 y jsdom (`@angular/build:unit-test`). Un `@for`/`@switch` recursivo con `animate.enter` compila y su test confirma que el DOM existente se conserva al añadir nodos. Bundle mínimo con router: 208 kB (57 kB gzip).


**Objetivo.** Confirmar las versiones y las API sobre las que se apoya el plan, y corregir el plan donde difiera.

**Tareas:**
1. Comprobar las versiones con `npm view <paquete> version` y actualizar la tabla de abajo con la fecha.
2. Crear un proyecto desechable en `/tmp` con `bunx @angular/cli@22.2.2 new spike --style=css --ssr=false --skip-git` y comprobar:
   - que compila una plantilla con `animate.enter`;
   - que en la versión 22 los proyectos nuevos son zoneless por defecto y se usa Vitest para tests;
   - que `ViewContainerRef.createComponent` con `inputBinding` existe (solo se anota, porque se usa `@switch`).
3. Ejecutar `npm pack @modelcontextprotocol/ext-apps@2.0.3`, leer `dist/src/app.d.ts` y `dist/src/server/index.d.ts`, y anotar las firmas de `App` (constructor, `connect`, `ontoolinput`, `ontoolinputpartial`, `ontoolresult`, `onhostcontextchanged`, `sendMessage`, `openLink`, `updateModelContext`) y de `registerAppTool` y `registerAppResource`.
4. Ejecutar `npm pack @modelcontextprotocol/server@2.3.1` y anotar el constructor de `WebStandardStreamableHTTPServerTransport` y cómo se activa el modo sin estado.
5. Verificar en `@material/material-color-utilities@0.4.0` cómo se crea un esquema expresivo (`SchemeExpressive` o `DynamicScheme` con variante y versión de especificación).
6. Verificar los valores ⚠ del §6 en m3.material.io y en el código de Compose Material 3 (`MotionScheme.expressive()`, tamaños de `ButtonDefaults`).
7. Comprobar si el repositorio `modelcontextprotocol/ext-apps` incluye un host de ejemplo (`examples/basic-host` o similar) que sirva para probar la vista en local.

**Archivos:** solo `PLAN.md`.

**Criterios de aceptación:** la tabla tiene la fecha de verificación, cada ⚠ está resuelto o anotado como "no verificable" y las firmas están copiadas en el anexo A.

**Verificación:**
```sh
npm view @angular/core version; npm view @modelcontextprotocol/server version; npm view @modelcontextprotocol/ext-apps version; bun --version; node --version
```

**Tabla de versiones** (consultada en el registro de npm y en GitHub el 14 oct 2026):

| Paquete | Versión |
|---|---|
| `@angular/core`, `@angular/cdk`, `@angular/cli`, `@angular/build` | 22.2.2 |
| `typescript` | 6.0.3 (`@angular/build@22.2.2` exige `>=6.0 <6.1`; la 7.0.2 no es compatible) |
| `vitest` | 5.x (lo instala `ng new`, runner `@angular/build:unit-test`) |
| `@modelcontextprotocol/server` | 2.3.1 |
| `@modelcontextprotocol/ext-apps` | 2.0.3 (especificación MCP Apps 2026-01-26, estable) |
| `@modelcontextprotocol/inspector` | 2.11.0 |
| `zod` | 4.6.7 |
| `@material/material-color-utilities` | 0.4.0 |
| `@material-symbols/svg-400` | 0.48.0 |
| Bun | 1.4.3 |
| Node | 26.11.1 (instalado) |
| llama.cpp | v0.6.0 (5 oct 2026) |
| Ollama (referencia) | v0.40.4 |
| `@material/web` | 2.5.0 (no se usa: está en mantenimiento y sin Expressive) |

### Fase 2. Monorepo, definiciones y generador del catálogo — ✅ 14 oct 2026

**Resultado.** `catalog.txt` ocupa 4 175 caracteres y la generación es determinista. Cambios respecto a lo previsto:
- `PropType` añade `{ k: 'expr' }` para `if test`, y `PropDef` añade `sig`, que sustituye al tipo en la firma cuando este no lo explica (`x:col`, `best:col:min|max,…`). `ComponentDef` añade `control` para `each` e `if`.
- `DEFS` está tipado como `readonly ComponentDef[]`. Los tipos literales se conservan en cada export individual (`slider`, `card`…), que es lo que usa `PropsOf`.
- Los imports van sin la extensión `.ts`, para que Angular pueda consumir los paquetes sin opciones extra.
- Los iconos usan la variante **Rounded**, que encaja mejor con Expressive. `insights` no existe y se sustituye por `analytics`.
- Los 10 casos de `bench/cases` se crean ya en esta fase, porque los ejemplos del prompt salen de ahí (`01-cuenta` y `04-reserva`).
- `CATALOG_HASH` no se guarda en un archivo: lo calcula `catalogHash(texto)`, exportada desde `gen/prompt.ts`.


**Objetivo.** Las 12 definiciones existen y se genera el texto del catálogo, el GBNF y la documentación.

**Tareas:**
1. `git init`. Crear `package.json` raíz con `workspaces`, `tsconfig.base.json`, `.gitignore` y el script `check`.
2. `packages/catalog/src/types.ts` según el §4.1, con `PropsOf` tipado.
3. `defs.ts` con los 12 componentes más `opt`, `item`, `each` e `if`, exactamente como en el §5.6.
4. `gen/icons.ts`: lee unos 60 SVG de `@material-symbols/svg-400` (lista en el anexo B) y escribe `src/icons.ts` con `Record<string,string>` de `d` de path.
5. `gen/prompt.ts` escribe `out/catalog.txt`. Estructura fija, sin fecha ni nada variable:
   - (a) cinco líneas de reglas del formato;
   - (b) funciones de expresión en una línea;
   - (c) firmas del §5.6;
   - (d) iconos en una línea;
   - (e) dos ejemplos completos (E1 y E3).
   Calcula además `CATALOG_HASH`, los 8 primeros caracteres del sha256.
6. *(Aplazada por D16, no ejecutar.)* `gen/gbnf.ts` escribe `out/gui.gbnf`:
   - `root ::= line*`, con una regla por etiqueta que enumera sus atributos permitidos y los valores de cada enum;
   - Markdown como `[^<@|\n] [^\n]*`;
   - expresiones como `"{" [^}\n]* "}"`.
7. `gen/docs.ts` escribe `out/CATALOG.md`, una tabla por componente con `doc` de cada prop.

**Archivos:** raíz, `packages/catalog/**`.

**Criterios de aceptación:**
- `bun run gen` es determinista: dos ejecuciones producen archivos idénticos.
- `catalog.txt` tiene ≤ 5 500 caracteres. Es una aproximación a 1 300 tokens; la cifra exacta se mide en la fase 8.
- El test comprueba que todo enum tiene un valor por defecto válido y que todo icono usado en `bench/cases` existe.

**Verificación:**
```sh
bun install && bun run gen && git diff --exit-code packages/catalog/out && bun test packages/catalog
```

### Fase 3. Parser en streaming con tests

**Objetivo.** `parse()` y el evaluador cumplen el §5 y son seguros con la salida parcial.

**Tareas:**
1. `expr.ts`: lexer, Pratt parser, evaluador con la tabla de funciones, límites y prohibiciones del §5.2, y asignaciones para `do`.
2. `inline.ts`: Markdown en línea a `Run[]`, con escapes.
3. `parse.ts`: máquina de estados por líneas con una pila de nodos abiertos. Asigna `id` por ruta. Aplica `validate.ts` con `defs`.
4. `validate.ts`: tipos, enums, obligatorias, hijos permitidos y valores por defecto, con los diagnósticos del §4.3.
5. Tests:
   - Los 10 casos de `bench/cases` dan 0 diagnósticos.
   - **Prefijos.** Para cada caso y cada corte `i` en `0..len`, `parse(src.slice(0,i), {final:false})` no lanza excepciones, y los `id` de los nodos completos en el corte `i` siguen existiendo con el mismo `t` en el corte `i+1`. Esta propiedad es la que garantiza un streaming sin parpadeos.
   - Un test por cada `DiagCode` con su entrada mínima.
   - Seguridad: `{constructor}`, `{x.__proto__}`, `{this}`, `{alert(1)}` y una expresión de 301 caracteres dan `bad_expr` sin lanzar excepciones. `<script>` da `unknown_tag` y aparece como texto.
   - `{1/0}` da `—`.

**Archivos:** `packages/lang/**` y `bench/cases/*.gui` (los 10 casos del §5.5 y §7.1).

**Criterios de aceptación:** todos los tests pasan. Parsear el caso más largo 1 000 veces tarda < 1 s con `bun test` (reparseo completo en cada chunk, ver riesgo R5).

**Verificación:**
```sh
bun test packages/lang
```

### Fase 4. Renderer Angular con 3 componentes y la base de movimiento

**Objetivo.** La app `view`, en modo demo, pinta en streaming simulado `card`, `text`, `slider` y Markdown, con tokens M3E y movimiento.

**Tareas:**
1. En `apps/web`, ejecutar `bunx @angular/cli@22.2.2 new web --create-application=false --package-manager=bun`, y luego `ng g application view` y `ng g application chat`, sin router, zoneless y con CSS. Añadir `@angular/cdk`.
2. `tools/springs.ts` genera `motion.css` según el §6.5. `tokens.css` contiene forma, espaciado y tipografía. `theme.ts` contiene el color dinámico (`seed` y modo claro u oscuro) y escribe las variables en `:root`.
3. `render.ts` (`gui-render`): inputs `source` y `final`; `parsed = computed(...)`; provee `Scope`.
4. `scope.ts`: `Map<string, WritableSignal>`. Crea los signals solo para estados nuevos y nunca reinicia los que ya existen al reparsear. `eval(expr)` lee los signals, así que es reactivo dentro de `computed`. Tiene un ámbito hijo para `each`.
5. `outlet.ts`: `@for` con `track n.id` y `@switch` sobre `n.t`, con `animate.enter="m3-enter"` en cada nodo.
6. Componentes `markdown`, `card`, `text` y `slider`, con state layer, foco y reduced motion.
7. Modo demo en `view`: si no hay host MCP (`window.parent === window`), o con `?demo`, se muestra un selector de casos de `bench/cases` importados como texto. Hay un botón "reproducir", que añade 12 caracteres cada 60 ms, y un conmutador de tema claro u oscuro.
8. Test con Vitest: E1 se pinta y mover el slider cambia el texto calculado.

**Archivos:** `apps/web/**`.

**Criterios de aceptación:**
- `ng build view` sin avisos.
- En la demo, al reproducir E1, cada nodo aparece una sola vez con su animación; los existentes no se reaniman ni pierden el estado.
- Con *reduced motion* activada en las DevTools, no hay transformaciones.
- `grep -r innerHTML apps/web/projects` no devuelve nada.

**Verificación:**
```sh
cd apps/web && bunx ng build view && bunx ng test --watch=false && ! grep -rn "innerHTML\|bypassSecurityTrust" projects
```

### Fase 5. Servidor MCP con `render` y el recurso `ui://`

**Objetivo.** El servidor responde a `tools/list`, `resources/read` y `tools/call render`, y la vista funciona dentro de un host MCP Apps.

**Tareas:**
1. `apps/web/tools/inline.ts` (Bun):
   - lee `dist/view/browser/index.html`;
   - sustituye `<script src=X type=module>` por `<script type=module>contenido</script>` y `<link rel=stylesheet href=Y>` por `<style>contenido</style>`;
   - falla si quedan otros `.js` en `dist`;
   - escribe `dist/view.html` y muestra el tamaño con gzip.
   Requisitos de `angular.json`: `outputHashing: none` y sin rutas diferidas.
2. `projects/view/main.ts`: conecta `App` y aplica el §4.5.
3. `apps/server/src/main.ts`:
   - `McpServer` y registro de la herramienta y el recurso como en el §4.4;
   - `const handler = createMcpHandler(() => buildServer())`, donde `buildServer()` crea el `McpServer` y registra la herramienta y el recurso; `Bun.serve` pasa `/mcp/:token` a `handler.fetch(req)` tras validar el `Host`;
   - el HTML se importa con `import html from '../../web/dist/view.html' with { type: 'text' }`;
   - la ruta `/mcp/:token` usa la variable de entorno `MCP_TOKEN` y responde 404 si no coincide;
   - `GET /health` devuelve `ok`;
   - CORS abierto solo para la ruta MCP.
4. Test del servidor en proceso: `tools/list` contiene `render` con `_meta.ui.resourceUri`; `resources/read` devuelve `text/html;profile=mcp-app`; `render` con un caso con errores devuelve los diagnósticos en el texto.
5. Probarlo con el inspector, y, si en la fase 1 se encontró, con el host de ejemplo de ext-apps.

**Archivos:** `apps/server/**`, `apps/web/tools/inline.ts`, `projects/view/**`.

**Criterios de aceptación:**
- `view.html` ≤ 400 KB sin comprimir, sin peticiones de red salvo las de Google Fonts.
- Los tests del servidor pasan.
- El inspector muestra la herramienta y el resultado de `render`.

**Verificación:**
```sh
cd apps/web && bunx ng build view && bun tools/inline.ts
cd ../server && MCP_TOKEN=dev bun test && MCP_TOKEN=dev bun src/main.ts &
bunx @modelcontextprotocol/inspector@2.11.0   # transporte Streamable HTTP, URL http://localhost:3000/mcp/dev
```

### Fase 6. Túnel y conexión desde claude.ai

**Objetivo.** Usar `render` desde claude.ai y ver la UI.

**Tareas:**
1. Prueba rápida: `cloudflared tunnel --url http://localhost:3000`, que da una URL `https://*.trycloudflare.com` temporal.
2. Para una URL estable, crear un túnel con nombre y documentar los comandos en `apps/server/README.md`: `cloudflared tunnel login`, `create gui` y `route dns`. Hace falta un dominio en Cloudflare; si no hay, la prueba rápida basta.
3. En claude.ai, ir a Ajustes → Conectores → Añadir conector personalizado, con la URL `https://<host>/mcp/<MCP_TOKEN>` y sin autenticación. El plan gratuito permite un conector.
4. Probar E1, E3 y E5 con peticiones naturales. Comprobar `send`, `updateModelContext`, modo oscuro y tamaño.
5. **Registrar si claude.ai envía `tool-input-partial`.** Añadir un `console.debug` en la vista con el número de entradas parciales recibidas. Anotar el resultado en el §2 (D16): si llegan, ¿pinta la UI en streaming?
6. Opcional: `Dockerfile` de una etapa (`oven/bun:1.4.3`) para un VPS. Solo se hace si el usuario lo pide.

**Archivos:** `apps/server/README.md` y `PLAN.md`.

**Criterios de aceptación:**
- Una conversación en claude.ai muestra la UI interactiva de E1.
- Un caso con un error deliberado ("usa la prop `color`") muestra que el modelo recibe el aviso.
- El comportamiento del streaming parcial queda anotado.

**Verificación:** manual, con capturas guardadas en `docs/fase6/`.

### Fase 7. Vía local — APLAZADA (ver D16, no ejecutar)

**Objetivo.** El chat Angular con `llama-server` pinta GUI-ML en streaming.

**Tareas:**
1. Instalar llama.cpp (`yay -S llama.cpp` o binario de la release v0.6.0) y descargar un modelo GGUF `Q4_K_M` con `hf download …` (lo elige el usuario). Arrancar con `llama-server -m modelo.gguf -c 8192 --port 8080 --jinja`.
2. En `projects/chat`:
   - ajustes guardados en `localStorage`: URL del endpoint, gramática sí o no, temperatura y "desactivar razonamiento";
   - lista de mensajes; el mensaje del asistente se pinta con `gui-render` con `final=false` mientras llega y `true` al terminar;
   - el cliente SSE usa `fetch` y `ReadableStream` sobre `/v1/chat/completions` con `stream:true`, leyendo `choices[0].delta.content` y descartando `reasoning_content`;
   - el system prompt es `catalog.txt` más una línea: "Responde con Markdown y GUI-ML cuando una interfaz ayude.";
   - con gramática, se manda `grammar: <gui.gbnf>`, junto con `chat_template_kwargs:{enable_thinking:false}`;
   - `send` añade un mensaje de usuario y llama al modelo;
   - antes del siguiente turno se añade al mensaje del usuario una línea `estado: …` si cambió el estado;
   - si el último mensaje tuvo diagnósticos, se añaden como "Avisos de tu UI anterior: …".
3. Proxy de desarrollo (`proxy.conf.json`) de `/v1` a `http://localhost:8080`, para evitar CORS.
4. Prueba de humo con la opción (c): conectar Goose al servidor de la fase 5 con un modelo local y anotar si pinta la vista. No se arregla nada de Goose.

**Archivos:** `apps/web/projects/chat/**` y `PLAN.md`.

**Criterios de aceptación:**
- Pedir "una calculadora para dividir una cuenta" produce una UI interactiva que aparece progresivamente.
- Con la gramática activada, 0 diagnósticos `unknown_tag` y `unknown_prop` en 5 peticiones.
- El resultado de Goose queda anotado.

**Verificación:**
```sh
cd apps/web && bunx ng serve chat --proxy-config proxy.conf.json
curl -s localhost:8080/v1/chat/completions -d '{"messages":[{"role":"user","content":"hola"}],"grammar":"root ::= \"ok\""}'
```

### Fase 8. Ampliar el catálogo y pasar el benchmark

**Objetivo.** Los 12 componentes están implementados y se cumplen los objetivos del §7.

**Tareas:**
1. Componentes restantes:
   - `stack`;
   - `button`, con morph de forma y tamaños;
   - `field`;
   - `choice`, en los modos chips, segmented, radio, select y check;
   - `toggle`;
   - `list` e `item`;
   - `table`, con resaltado `best` en `primary-container`;
   - `chart`, en SVG propio sin librería: barras, líneas y sectores, con ejes simples, leyenda y tabla oculta;
   - `timer`, con iniciar, pausar y reiniciar, anillo de progreso, morph y anuncio final;
   - `each` e `if`.
2. Demo: los 10 casos se pintan sin diagnósticos en modo claro y oscuro.
3. `bench/to-json.ts` y su test contra `01.json` y `05.json`.
4. `bench/measure.ts`, que escribe en `RESULTS.md`.
5. `bench/gen-eval.ts` con Claude (Messages API, `claude-sonnet-5-5` con el catálogo como herramienta `render`) y con el modelo local, con y sin gramática.
6. Accesibilidad: ejecutar `@axe-core/cli` sobre la demo de cada caso. Añadirlo solo como `bunx`, no como dependencia.

**Criterios de aceptación:**
- Se cumplen los objetivos del §7.3 y §7.4, o hay una propuesta anotada en el §2 si alguno no se cumple.
- axe no informa de infracciones `serious` ni `critical`.
- `view.html` ≤ 500 KB.

**Verificación:**
```sh
bun run check && bun bench/measure.ts && bun bench/gen-eval.ts && cat bench/RESULTS.md
```

---

## 9. Riesgos y mitigaciones

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | claude.ai no envía `tool-input-partial` y la UI aparece de golpe al terminar | Aceptable en v1: la animación de entrada sigue funcionando. Se anota en la fase 6. La vía local sí tiene streaming completo. |
| R2 | El host bloquea Google Fonts | Alternativa `system-ui`. Los iconos son SVG embebidos. |
| R3 | Los valores de M3 Expressive cambian (verificados contra Compose el 14 oct 2026) | Los tokens están centralizados en `tokens.css` y `motion.css`: cambiarlos es editar una tabla. |
| R4 | La gramática GBNF empeora la calidad del modelo local o choca con el razonamiento | Gramática opcional, razonamiento desactivado al usarla y medición con y sin gramática en la fase 8. |
| R5 | Reparsear todo el texto en cada chunk es O(n²) | Con ≤ 20 000 caracteres son milisegundos; el test de la fase 3 lo vigila. `// ponytail:` en `parse.ts`: si hace falta, parseo incremental desde la última línea cerrada. |
| R6 | Cualquiera con la URL usa el conector | La ruta lleva un token, la herramienta no tiene efectos y se puede rotar `MCP_TOKEN`. Usar OAuth si se publica. |
| R7 | El modelo inventa props o componentes | Parser tolerante, diagnósticos devueltos en el resultado y GBNF en local. |
| R8 | Las API del SDK v2 o de ext-apps cambian | Versiones exactas fijadas y firmas copiadas en el anexo A. |
| R9 | Fallo del evaluador de expresiones (bucle, prototipo) | No hay `eval`, hay límite de pasos, lista blanca de funciones y tests de seguridad en la fase 3. |
| R10 | El bundle de Angular excede el tamaño razonable para `ui://` | Sin `@angular/animations`, sin `forms` (signals con eventos nativos), solo `@angular/cdk/a11y`. Límite comprobado en las fases 5 y 8. |
| R11 | El usuario no sabe mantener la parte no Angular | El servidor tiene unas 80 líneas con comentarios. El parser está guiado por tests. Cada `README` de paquete explica cómo añadir un componente (ver anexo C). |

---

## 10. Fuera de alcance de v1

- Vía de escape tipo AppBlock (HTML, CSS y JS libres en un iframe).
- `else`, bucles anidados más allá de un nivel de `each` (permitidos, pero no probados), formularios con validación compleja y llamadas de red desde la UI.
- Actualizar una UI ya pintada desde una llamada posterior (cada `render` es una UI nueva).
- Persistencia del estado entre recargas.
- OAuth, multiusuario y despliegue gestionado.
- *Ripple*, transiciones de contenedor compartidas y gestos de arrastre.
- Chat local, gramática GBNF y medición con llama.cpp (D16).
- Host MCP propio (opción a) y soporte de herramientas MCP en el chat local.
- Internacionalización: la UI sigue el idioma del modelo y los formatos usan `es-ES` por defecto.

---

## Anexo A. Firmas verificadas

Verificado en la fase 1 (14 oct 2026) en los paquetes publicados:
- `@modelcontextprotocol/ext-apps@2.0.3` exporta `./`, `./server`, `./app-bridge`, `./react` y `./app-with-deps`.
- `./server` exporta `registerAppTool`, `registerAppResource`, `getUiCapability` y `EXTENSION_ID`.
- `App` tiene `connect`, `ontoolinput`, `ontoolinputpartial`, `ontoolresult`, `onhostcontextchanged`, `sendMessage`, `openLink` y `updateModelContext`.
- `RESOURCE_MIME_TYPE` vale `text/html;profile=mcp-app`.
- `@modelcontextprotocol/server@2.3.1` exporta `McpServer`, `createMcpHandler`, `hostHeaderValidationResponse`, `WebStandardStreamableHTTPServerTransport` y `StdioServerTransport`.
- `createMcpHandler(factory: (ctx) => McpServer | Server | Promise<…>, options?: { legacy?: 'stateless' | 'reject', … }): McpHttpHandler`, con `handler.fetch(request: Request): Promise<Response>`.
- `new App(appInfo: { name, version }, capabilities?, options?: { autoResize?: boolean })`, `await app.connect()` y `app.getHostContext()`.
- Callbacks por asignación: `app.ontoolinput = (p) => …`, igual para `ontoolinputpartial`, `ontoolresult`, `ontoolcancelled` y `onhostcontextchanged`. La entrada parcial llega en `p.arguments?: Record<string, unknown>`.
- `app.sendMessage({ role: 'user', content: [{ type: 'text', text }] })`, `app.openLink({ url })` y `app.updateModelContext({ content: [{ type: 'text', text }] })` devuelven promesas.
- `registerAppTool(server, name, config & { inputSchema?: z.object(...), outputSchema? }, cb)` y `registerAppResource(server, name, uri, config, readCallback)`.
- `@modelcontextprotocol/ext-apps@2.0.3` declara como *peer* a `@modelcontextprotocol/server`, `client` y `core` `^2.0.0`, y a `zod ^4.2.0`. React es opcional (solo para `./react`).
- Host de prueba local: `examples/basic-host` en el repositorio `modelcontextprotocol/ext-apps`.
- `@material/material-color-utilities@0.4.0`: `SpecVersion = '2021' | '2025'` y `Platform = 'phone' | 'watch'`.
- La especificación MCP Apps 2026-01-26 define `_meta.ui.resourceUri` (la clave plana `ui/resourceUri` está deprecada), `_meta.ui.visibility`, `_meta.ui.csp.{connectDomains,resourceDomains,frameDomains,baseUriDomains}` y las notificaciones `ui/notifications/tool-input-partial` (opcional para el host), `tool-input`, `tool-result`, `tool-cancelled`, `host-context-changed` y `size-changed`.

## Anexo B. Iconos v1 (≈60)

```
add remove check close edit delete search info warning error help star favorite share
event schedule timer alarm calendar_month today location_on map directions
coffee restaurant local_bar hotel flight train tram directions_car directions_walk museum castle beach_access sunny cloud rainy
shopping_cart payments euro credit_card receipt sell
person group mail call chat send link open_in_new
play_arrow pause restart_alt replay skip_next
trending_up trending_down bar_chart pie_chart analytics
lightbulb celebration thumb_up thumb_down bookmark
```

`insights` no existe en el paquete y se sustituyó por `analytics` en la fase 2. Variante usada: `rounded`.

Si un nombre no existe en `@material-symbols/svg-400@0.48.0`, `gen/icons.ts` falla y lo indica. Se sustituye por el más cercano y se actualiza esta lista.

## Anexo C. Cómo añadir un componente (para el usuario)

1. Añade su definición en `packages/catalog/src/defs.ts`.
2. Ejecuta `bun run gen` para regenerar el prompt, el GBNF y la documentación.
3. Crea `projects/renderer/components/<nombre>.ts`, con `node = input.required<ElNode>()` y props con `PropsOf<typeof defs.<nombre>>`.
4. Añade un `@case` en `outlet.ts`.
5. Añade un ejemplo a `bench/cases` si cubre un caso nuevo.
6. Ejecuta `bun run check`. El test del catálogo falla si falta el `@case`, porque recorre `defs` y busca cada nombre en `outlet.ts`.
