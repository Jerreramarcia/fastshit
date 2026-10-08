import type { Edge, Node } from "reactflow";
import { hasItems, type ExportedBundle, type NodeKind } from "./graphTypes";
import { toExportedSheet } from "./exportDoc";

export interface Sheet {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
}

/** Bundle exportado -> estado interno del canvas. Lo usan importar y el visor. */
export function bundleToSheets(bundle: ExportedBundle): Sheet[] {
  return (bundle.sheets ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    nodes: (s.nodes ?? []).map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: {
        label: n.label,
        ...(n.branches ? { branches: n.branches } : {}),
        ...(hasItems(n.type as NodeKind) ? { items: n.items ?? [] } : {}),
      },
    })),
    edges: (s.edges ?? []).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
    })),
  }));
}

export function sheetsToBundle(sheets: Sheet[]): ExportedBundle {
  return { sheets: sheets.map((s) => toExportedSheet(s)) };
}
