import { hasItems, type NodeKind } from "./graphTypes";

export interface KindSpec {
  kind: NodeKind;
  /** Tecla rapida: en la toolbar y en el menu que sale al soltar una flecha. */
  key: string;
  label: string;
  /** Etiqueta en mayusculas dentro del nodo. */
  tag: string;
  color: string;
  bg: string;
  titlePlaceholder: string;
  /** Placeholder de la lista de detalles (solo tipos con items). */
  itemPlaceholder?: string;
  /** Ancho de la caja: lo usa el nodo al pintar y `layout.ts` al medir. */
  minWidth: number;
  maxWidth: number;
  boldTitle: boolean;
  /** Pista corta para el tooltip de la toolbar. */
  hint?: string;
}

export const KIND_SPECS: Record<NodeKind, KindSpec> = {
  action: {
    kind: "action",
    key: "1",
    label: "Accion",
    tag: "ACCION",
    color: "var(--action)",
    bg: "var(--action-bg)",
    titlePlaceholder: "texto de la accion",
    minWidth: 160,
    maxWidth: 240,
    boldTitle: false,
  },
  blocker: {
    kind: "blocker",
    key: "2",
    label: "Bloqueante",
    tag: "BLOQUEANTE",
    color: "var(--blocker)",
    bg: "var(--blocker-bg)",
    titlePlaceholder: "texto del bloqueante",
    minWidth: 160,
    maxWidth: 240,
    boldTitle: false,
  },
  conditional: {
    kind: "conditional",
    key: "3",
    label: "Condicional",
    tag: "CONDICIONAL",
    color: "var(--conditional)",
    bg: "var(--conditional-bg)",
    titlePlaceholder: "pregunta del condicional",
    minWidth: 190,
    maxWidth: 260,
    boldTitle: false,
  },
  page: {
    kind: "page",
    key: "4",
    label: "Pagina",
    tag: "PAGINA",
    color: "var(--page)",
    bg: "var(--page-bg)",
    titlePlaceholder: "nombre de la pagina",
    itemPlaceholder: "agregar accion...",
    minWidth: 220,
    maxWidth: 300,
    boldTitle: true,
  },
  error: {
    kind: "error",
    key: "5",
    label: "Error",
    tag: "ERROR",
    color: "var(--error)",
    bg: "var(--error-bg)",
    titlePlaceholder: "que falla",
    itemPlaceholder: "donde se detecto...",
    minWidth: 200,
    maxWidth: 300,
    boldTitle: true,
    hint: "algo roto, con el detalle de donde se detecto",
  },
  testing: {
    kind: "testing",
    key: "6",
    label: "Testing",
    tag: "TESTING",
    color: "var(--testing)",
    bg: "var(--testing-bg)",
    titlePlaceholder: "que se esta probando",
    itemPlaceholder: "detalle de la prueba...",
    minWidth: 200,
    maxWidth: 300,
    boldTitle: true,
    hint: "arreglo en curso, pendiente de verificar",
  },
  mejora: {
    kind: "mejora",
    key: "8",
    label: "Mejora",
    tag: "MEJORA",
    color: "var(--mejora)",
    bg: "var(--mejora-bg)",
    titlePlaceholder: "que se quiere mejorar",
    itemPlaceholder: "que se quiere conseguir...",
    minWidth: 200,
    maxWidth: 300,
    boldTitle: true,
    hint: "cambio pedido sobre algo que ya funciona",
  },
  ok: {
    kind: "ok",
    key: "7",
    label: "OK",
    tag: "OK",
    color: "var(--ok)",
    bg: "var(--ok-bg)",
    titlePlaceholder: "que quedo resuelto",
    itemPlaceholder: "como se arreglo...",
    minWidth: 200,
    maxWidth: 300,
    boldTitle: true,
    hint: "verificado y cerrado",
  },
};

export const KIND_ORDER: NodeKind[] = ["action", "blocker", "conditional", "page", "mejora", "error", "testing", "ok"];

export const KIND_LIST: KindSpec[] = KIND_ORDER.map((k) => KIND_SPECS[k]);

export function specForKey(key: string): KindSpec | undefined {
  return KIND_LIST.find((s) => s.key === key);
}

export function specHasItems(kind: NodeKind): boolean {
  return hasItems(kind);
}
