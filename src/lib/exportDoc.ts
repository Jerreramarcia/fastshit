import type { Edge, Node } from "reactflow";
import { hasItems, type Branch, type ExportedBundle, type ExportedSheet, type NodeKind } from "./graphTypes";
import { KIND_SPECS } from "./nodeKinds";

export function toExportedSheet(sheet: { id: string; name: string; nodes: Node[]; edges: Edge[] }): ExportedSheet {
  return {
    id: sheet.id,
    name: sheet.name,
    nodes: sheet.nodes.map((n) => ({
      id: n.id,
      type: (n.type as NodeKind) ?? "action",
      label: (n.data?.label as string) ?? "",
      position: n.position,
      branches: n.type === "conditional" ? (n.data?.branches as Branch[] | undefined) : undefined,
      items: hasItems(n.type as NodeKind)
        ? (n.data?.items as string[] | undefined)?.filter((i) => i.trim() !== "")
        : undefined,
    })),
    edges: sheet.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
    })),
  };
}

function markdownForSheet(sheet: ExportedSheet): string[] {
  const byId = new Map(sheet.nodes.map((n) => [n.id, n]));
  const outgoing = new Map<string, typeof sheet.edges>();
  for (const e of sheet.edges) {
    if (!outgoing.has(e.source)) outgoing.set(e.source, []);
    outgoing.get(e.source)!.push(e);
  }

  const hasIncoming = new Set(sheet.edges.map((e) => e.target));
  const roots = sheet.nodes.filter((n) => !hasIncoming.has(n.id));

  const lines: string[] = [];
  const visited = new Set<string>();

  function labelFor(id: string): string {
    const n = byId.get(id);
    if (!n) return "?";
    // La accion es el tipo por defecto del flujo, no hace falta anunciarla.
    if (n.type === "action") return n.label;
    return `[${KIND_SPECS[n.type]?.tag ?? n.type.toUpperCase()}] ${n.label}`;
  }

  function branchLabel(sourceId: string, handle: string | null | undefined): string {
    if (!handle) return "";
    const n = byId.get(sourceId);
    const branch = n?.branches?.find((b) => b.id === handle);
    return branch ? `(${branch.label}) ` : "";
  }

  function walk(id: string, depth: number) {
    if (visited.has(id)) {
      lines.push(`${"  ".repeat(depth)}-> (ya visto) ${labelFor(id)}`);
      return;
    }
    visited.add(id);
    lines.push(`${"  ".repeat(depth)}${depth === 0 ? "" : "-> "}${labelFor(id)}`);
    const node = byId.get(id);
    if (node && hasItems(node.type) && node.items) {
      for (const item of node.items) {
        lines.push(`${"  ".repeat(depth + 1)}- ${item}`);
      }
    }
    const edges = outgoing.get(id) ?? [];
    for (const e of edges) {
      const branch = branchLabel(id, e.sourceHandle);
      if (branch) lines.push(`${"  ".repeat(depth + 1)}-> ${branch}`);
      walk(e.target, depth + 1);
    }
  }

  const startNodes = roots.length > 0 ? roots : sheet.nodes.slice(0, 1);
  for (const r of startNodes) walk(r.id, 0);
  for (const n of sheet.nodes) {
    if (!visited.has(n.id)) walk(n.id, 0);
  }

  return lines;
}

export function toMarkdown(bundle: ExportedBundle): string {
  const lines: string[] = ["# Flujo de usuario", ""];
  for (const sheet of bundle.sheets) {
    lines.push(`## Capa: ${sheet.name}`, "");
    lines.push(...markdownForSheet(sheet));
    lines.push("");
  }
  return lines.join("\n");
}
