import type { Edge, Node } from "reactflow";

export const THREAD_COLORS = [
  "#e15759",
  "#4e79a7",
  "#59a14f",
  "#f28e2b",
  "#b07aa1",
  "#76b7b2",
  "#edc949",
  "#ff9da7",
  "#9c755f",
  "#bab0ac",
];

/**
 * Colorea cada cable segun el hilo al que pertenece: los cables que salen de un
 * mismo nodo raiz mantienen el mismo color a lo largo de la cadena, y cada
 * bifurcacion (nodo con varias salidas) arranca un color nuevo por rama.
 */
export function computeEdgeColors(nodes: Node[], edges: Edge[]): Record<string, string> {
  const outgoing = new Map<string, Edge[]>();
  const incomingCount = new Map<string, number>();
  nodes.forEach((n) => {
    outgoing.set(n.id, []);
    incomingCount.set(n.id, 0);
  });
  edges.forEach((e) => {
    outgoing.get(e.source)?.push(e);
    incomingCount.set(e.target, (incomingCount.get(e.target) ?? 0) + 1);
  });

  const colors: Record<string, string> = {};
  let paletteIdx = 0;
  const nextColor = () => THREAD_COLORS[paletteIdx++ % THREAD_COLORS.length];

  const roots = nodes.filter((n) => (incomingCount.get(n.id) ?? 0) === 0);
  const queue: { nodeId: string; color: string | null }[] = roots.map((n) => ({ nodeId: n.id, color: null }));
  const visitedNodes = new Set<string>();

  while (queue.length) {
    const { nodeId, color } = queue.shift()!;
    if (visitedNodes.has(nodeId)) continue;
    visitedNodes.add(nodeId);
    const outs = outgoing.get(nodeId) ?? [];
    const branching = outs.length > 1;
    outs.forEach((e) => {
      if (colors[e.id]) return;
      const edgeColor = branching || !color ? nextColor() : color;
      colors[e.id] = edgeColor;
      queue.push({ nodeId: e.target, color: edgeColor });
    });
  }
  return colors;
}
