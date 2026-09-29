import dagre from "dagre";
import type { Edge, Node } from "reactflow";
import type { Branch } from "./graphTypes";

export type LayoutMode = "horizontal" | "vertical" | "compact";

const MODE_CONFIG: Record<LayoutMode, { rankdir: "LR" | "TB"; nodesep: number; ranksep: number }> = {
  horizontal: { rankdir: "LR", nodesep: 30, ranksep: 110 },
  vertical: { rankdir: "TB", nodesep: 30, ranksep: 100 },
  compact: { rankdir: "LR", nodesep: 16, ranksep: 60 },
};

let measureCanvas: HTMLCanvasElement | null = null;
function textWidth(text: string, font: string): number {
  if (typeof document === "undefined") return text.length * 7;
  measureCanvas ??= document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  if (!ctx) return text.length * 7;
  ctx.font = font;
  return ctx.measureText(text || " ").width;
}

interface BoxSpec {
  minWidth: number;
  maxWidth: number;
  paddingX: number;
  font: string;
  lineHeight: number;
}

function measureTitleBox(label: string, spec: BoxSpec): { width: number; lines: number; lineHeight: number } {
  const raw = textWidth(label, spec.font);
  if (raw + spec.paddingX <= spec.maxWidth) {
    return { width: Math.max(spec.minWidth, raw + spec.paddingX), lines: 1, lineHeight: spec.lineHeight };
  }
  const contentWidth = spec.maxWidth - spec.paddingX;
  const lines = Math.max(1, Math.ceil(raw / contentWidth));
  return { width: spec.maxWidth, lines, lineHeight: spec.lineHeight };
}

const SANS = '13px "IBM Plex Sans", system-ui, sans-serif';
const SANS_BOLD = '600 13px "IBM Plex Sans", system-ui, sans-serif';
const TAG_HEIGHT = 16;

function measureNode(n: Node): { width: number; height: number } {
  const label = (n.data?.label as string) ?? "";

  if (n.type === "page") {
    const box = measureTitleBox(label, { minWidth: 220, maxWidth: 300, paddingX: 24, font: SANS_BOLD, lineHeight: 18 });
    const items = (n.data?.items as string[] | undefined)?.length ?? 0;
    const rows = Math.max(items, 1);
    const titleHeight = 10 + TAG_HEIGHT + box.lines * box.lineHeight + 10;
    const itemsHeight = 16 + rows * 21;
    return { width: box.width, height: titleHeight + 2 + itemsHeight };
  }

  if (n.type === "conditional") {
    const box = measureTitleBox(label, { minWidth: 190, maxWidth: 260, paddingX: 26, font: SANS, lineHeight: 18 });
    const branches = (n.data?.branches as Branch[] | undefined)?.length ?? 2;
    const height = 8 + TAG_HEIGHT + box.lines * box.lineHeight + 6 + branches * 22 + 6 + 24 + 8;
    return { width: box.width, height };
  }

  const box = measureTitleBox(label, { minWidth: 160, maxWidth: 240, paddingX: 26, font: SANS, lineHeight: 18 });
  const height = 8 + TAG_HEIGHT + box.lines * box.lineHeight + 8;
  return { width: box.width, height };
}

export function layoutNodes(nodes: Node[], edges: Edge[], mode: LayoutMode = "horizontal"): Node[] {
  const { rankdir, nodesep, ranksep } = MODE_CONFIG[mode];
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir, nodesep, ranksep, acyclicer: "greedy" });

  const sizes = new Map(nodes.map((n) => [n.id, measureNode(n)]));

  for (const n of nodes) {
    g.setNode(n.id, sizes.get(n.id)!);
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
