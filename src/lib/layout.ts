import dagre from "dagre";
import type { Edge, Node } from "reactflow";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 90;

export type LayoutMode = "horizontal" | "vertical" | "compact";

const MODE_CONFIG: Record<LayoutMode, { rankdir: "LR" | "TB"; nodesep: number; ranksep: number }> = {
  horizontal: { rankdir: "LR", nodesep: 60, ranksep: 110 },
  vertical: { rankdir: "TB", nodesep: 60, ranksep: 100 },
  compact: { rankdir: "LR", nodesep: 24, ranksep: 60 },
};

export function layoutNodes(nodes: Node[], edges: Edge[], mode: LayoutMode = "horizontal"): Node[] {
  const { rankdir, nodesep, ranksep } = MODE_CONFIG[mode];
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir, nodesep, ranksep, acyclicer: "greedy" });

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const e of edges) {
    if (g.hasNode(e.source) && g.hasNode(e.target)) {
      g.setEdge(e.source, e.target);
    }
  }

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    if (!pos) return n;
    return {
      ...n,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
    };
  });
}
