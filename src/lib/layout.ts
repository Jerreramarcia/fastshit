import dagre from "dagre";
import type { Edge, Node } from "reactflow";
import type { Branch } from "./graphTypes";

export type LayoutMode = "horizontal" | "vertical" | "compact";

const MODE_CONFIG: Record<LayoutMode, { rankdir: "LR" | "TB"; nodesep: number; ranksep: number }> = {
  horizontal: { rankdir: "LR", nodesep: 30, ranksep: 110 },
  vertical: { rankdir: "TB", nodesep: 30, ranksep: 100 },
  compact: { rankdir: "LR", nodesep: 16, ranksep: 60 },
};

function measureNode(n: Node): { width: number; height: number } {
  if (n.type === "page") {
    const items = (n.data?.items as string[] | undefined)?.length ?? 0;
    const rows = Math.max(items, 1);
    return { width: 260, height: 64 + rows * 22 };
  }
  if (n.type === "conditional") {
    const branches = (n.data?.branches as Branch[] | undefined)?.length ?? 2;
    return { width: 220, height: 60 + branches * 22 + 34 };
  }
  return { width: 200, height: 64 };
}

export function layoutNodes(nodes: Node[], edges: Edge[], mode: LayoutMode = "horizontal"): Node[] {
  const { rankdir, nodesep, ranksep } = MODE_CONFIG[mode];
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir, nodesep, ranksep, acyclicer: "greedy" });

  const sizes = new Map(nodes.map((n) => [n.id, measureNode(n)]));

  for (const n of nodes) {
    const size = sizes.get(n.id)!;
    g.setNode(n.id, size);
  }
  for (const e of edges) {
    if (g.hasNode(e.source) && g.hasNode(e.target)) {
      g.setEdge(e.source, e.target);
    }
  }

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    const size = sizes.get(n.id)!;
    if (!pos) return n;
    return {
      ...n,
      position: { x: pos.x - size.width / 2, y: pos.y - size.height / 2 },
    };
  });
}
