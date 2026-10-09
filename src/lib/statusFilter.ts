import type { Node } from "reactflow";
import type { Sheet } from "./bundle";
import { isStatusKind, type NodeKind } from "./graphTypes";

/**
 * Deja solo las cadenas de estado cuyo ultimo nodo es de uno de los tipos
 * pedidos, con todo lo que cuelga por encima de ellas (la fase, los nodos
 * previos de la cadena). Una pestaña sin nodos de estado se muestra entera.
 */
export function filterByStatus(sheet: Sheet, kinds: ReadonlySet<NodeKind>): Sheet {
  if (!sheet.nodes.some((n) => isStatusKind(n.type as NodeKind))) return sheet;

  const incoming = new Map<string, string[]>();
  for (const e of sheet.edges) incoming.set(e.target, [...(incoming.get(e.target) ?? []), e.source]);

  const leaves = chainEnds(sheet);
  const keep = new Set<string>();
  const stack = leaves.filter((n) => kinds.has(n.type as NodeKind)).map((n) => n.id);
  while (stack.length) {
    const id = stack.pop()!;
    if (keep.has(id)) continue;
    keep.add(id);
    stack.push(...(incoming.get(id) ?? []));
  }

  const nodes = compact(sheet.nodes.filter((n) => keep.has(n.id)), sheet);
  const edges = sheet.edges.filter((e) => keep.has(e.source) && keep.has(e.target));
  return { ...sheet, nodes, edges };
}

/** Ultimo nodo de cada cadena de estado: el que da su estado, asi un KO tras un OK cuenta como error. */
export function chainEnds(sheet: Sheet): Node[] {
  const kindOf = new Map(sheet.nodes.map((n) => [n.id, n.type as NodeKind]));
  const statusOut = new Set(sheet.edges.filter((e) => isStatusKind(kindOf.get(e.target))).map((e) => e.source));
  return sheet.nodes.filter((n) => isStatusKind(n.type as NodeKind) && !statusOut.has(n.id));
}

/**
 * Cierra los huecos verticales que dejan las filas ocultas. Un nodo que en el
 * original estaba a la altura de su primer hijo (la cabecera de fase) sigue
 * a la altura de su primer hijo visible.
 */
function compact(nodes: Node[], sheet: Sheet): Node[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const original = new Map(sheet.nodes.map((n) => [n.id, n]));
  const children = new Map<string, string[]>();
  for (const e of sheet.edges) children.set(e.source, [...(children.get(e.source) ?? []), e.target]);

  const anchored = new Set(nodes.filter((n) => isAnchor(n, children, original)).map((n) => n.id));

  // Cada fila conserva el alto que tenia en el original hasta la siguiente; medir
  // el nodo no vale, porque el texto de los items parte en mas lineas de las estimadas.
  const rowsOf = (list: Node[]) => [...new Set(list.map((n) => n.position.y))].sort((a, b) => a - b);
  const allRows = rowsOf(sheet.nodes.filter((n) => !isAnchor(n, children, original)));
  const slot = new Map(allRows.map((y, i) => [y, (allRows[i + 1] ?? y) - y]));
  const newRowY = new Map<number, number>();
  let cursor = allRows[0] ?? 0;
  for (const y of rowsOf(nodes.filter((n) => !anchored.has(n.id)))) {
    newRowY.set(y, cursor);
    cursor += slot.get(y) ?? 0;
  }
  const newY = new Map<string, number>();
  for (const n of nodes) if (!anchored.has(n.id)) newY.set(n.id, newRowY.get(n.position.y) ?? n.position.y);

  // Las cabeceras se resuelven de abajo arriba por si una cuelga de otra.
  const anchorY = (id: string, seen = new Set<string>()): number | undefined => {
    if (newY.has(id)) return newY.get(id);
    if (seen.has(id)) return undefined;
    seen.add(id);
    const ys = (children.get(id) ?? []).filter((k) => byId.has(k)).map((k) => anchorY(k, seen));
    const y = Math.min(...ys.filter((v): v is number => v !== undefined));
    if (Number.isFinite(y)) newY.set(id, y);
    return newY.get(id);
  };
  anchored.forEach((id) => anchorY(id));

  return nodes.map((n) => ({ ...n, position: { x: n.position.x, y: newY.get(n.id) ?? n.position.y } }));
}

function isAnchor(n: Node, children: Map<string, string[]>, original: Map<string, Node>): boolean {
  const kids = (children.get(n.id) ?? []).map((id) => original.get(id)).filter((k): k is Node => !!k);
  return kids.length > 0 && Math.abs(Math.min(...kids.map((k) => k.position.y)) - n.position.y) < 1;
}
