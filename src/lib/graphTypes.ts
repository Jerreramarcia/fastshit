export type NodeKind = "action" | "blocker" | "conditional" | "page" | "mejora" | "error" | "testing" | "ok";

/** Tipos cuyo cuerpo es una lista de lineas editables (`items`). */
export const LIST_KINDS: NodeKind[] = ["page", "mejora", "error", "testing", "ok"];

/** Tipos que representan el estado de un arreglo en curso. */
export const STATUS_KINDS: NodeKind[] = ["mejora", "error", "testing", "ok"];

export function hasItems(kind: NodeKind | undefined): boolean {
  return !!kind && LIST_KINDS.includes(kind);
}

export function isStatusKind(kind: NodeKind | undefined): boolean {
  return !!kind && STATUS_KINDS.includes(kind);
}

export interface Branch {
  id: string;
  label: string;
}

export interface FlowNodeData {
  label: string;
  branches?: Branch[];
  items?: string[];
}

export interface ExportedNode {
  id: string;
  type: NodeKind;
  label: string;
  position: { x: number; y: number };
  branches?: Branch[];
  items?: string[];
}

export interface ExportedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
}

export interface ExportedSheet {
  id: string;
  name: string;
  nodes: ExportedNode[];
  edges: ExportedEdge[];
  links?: LinkRule[];
}

/** Convierte en enlace el texto que casa con `pattern`; en `url`, `$0`, `$1`... son la coincidencia y sus grupos. */
export interface LinkRule {
  pattern: string;
  url: string;
}

export interface ExportedBundle {
  sheets: ExportedSheet[];
}
