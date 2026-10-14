// Contrato de una definición de componente (PLAN.md §4.1).
// Todo lo demás (prompt, documentación, validador, tipos de props) sale de aquí.

export type PropType =
  | { k: 'num'; min?: number; max?: number; int?: boolean }
  | { k: 'str' }      // texto corto
  | { k: 'bool' }     // atributo sin valor = true
  | { k: 'enum'; v: readonly string[] }
  | { k: 'state' }    // nombre de un @state (bind)
  | { k: 'data' }     // nombre de un @data
  | { k: 'cols' }     // lista de columnas separada por comas
  | { k: 'icon' }     // nombre del mapa ICONS
  | { k: 'action' }   // {x = expr; y = expr}
  | { k: 'tpl' }      // plantilla de texto: 'Hola {x}'
  | { k: 'url' }      // solo https:
  | { k: 'expr' };    // {expr} obligatoria (p. ej. if test)

export interface PropDef {
  t: PropType;
  req?: boolean;
  def?: string | number | boolean;
  /** Si false, no admite {expr}. Por defecto: true salvo state/data/action/expr. */
  expr?: boolean;
  /** Sustituye al tipo en la firma del prompt cuando el tipo no lo explica (p. ej. 'col'). */
  sig?: string;
  /** ≤ 8 palabras. Solo va a la documentación. */
  doc: string;
}

export type Content = 'none' | 'text' | 'nodes' | { only: readonly string[] };

export interface ComponentDef {
  name: string;            // minúsculas, ≤ 7 letras
  doc: string;             // ≤ 12 palabras, va al prompt
  props: Readonly<Record<string, PropDef>>;
  content: Content;
  textAs?: string;         // qué significa el texto interior
  parentOnly?: string;     // solo válido dentro de este componente
  control?: boolean;       // nodo de control (each, if): no es un componente visual
}

export const defineComponent = <const D extends ComponentDef>(d: D): D => d;

// --- Props tipadas por inferencia (sin generar código) ---

type ValOf<T extends PropType> =
  T extends { k: 'num' } ? number :
  T extends { k: 'bool' } ? boolean :
  T extends { k: 'enum'; v: readonly (infer U)[] } ? U :
  T extends { k: 'cols' } ? string[] :
  T extends { k: 'action' } ? unknown :   // lo interpreta el renderer
  T extends { k: 'expr' } ? unknown :
  string;                                 // str, tpl, state, data, icon, url

type HasValue<P> = P extends { req: true } ? true : P extends { def: unknown } ? true : false;

/** Props de un componente tras validar: las obligatorias o con valor por defecto nunca faltan. */
export type PropsOf<D extends ComponentDef> = {
  -readonly [K in keyof D['props'] as HasValue<D['props'][K]> extends true ? K : never]: ValOf<D['props'][K]['t']>;
} & {
  -readonly [K in keyof D['props'] as HasValue<D['props'][K]> extends true ? never : K]?: ValOf<D['props'][K]['t']>;
};
