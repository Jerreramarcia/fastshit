import dagre from "dagre";
import type { Edge, Node } from "reactflow";
import { hasItems, type Branch, type NodeKind } from "./graphTypes";
import { KIND_SPECS } from "./nodeKinds";

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
  const kind = (n.type as NodeKind) ?? "action";
  const spec = KIND_SPECS[kind] ?? KIND_SPECS.action;
  const paddingX = kind === "page" ? 24 : 26;
  const font = spec.boldTitle ? SANS_BOLD : SANS;
  const box = measureTitleBox(label, {
    minWidth: spec.minWidth,
    maxWidth: spec.maxWidth,
    paddingX,
    font,
    lineHeight: 18,
  });

  if (kind === "conditional") {
    const branches = (n.data?.branches as Branch[] | undefined)?.length ?? 2;
    const height = 8 + TAG_HEIGHT + box.lines * box.lineHeight + 6 + branches * 22 + 6 + 24 + 8;
    return { width: box.width, height };
  }

  const titleHeight = (kind === "page" ? 10 : 8) * 2 + TAG_HEIGHT + box.lines * box.lineHeight;

  if (hasItems(kind)) {
    // La lista siempre deja una fila libre para escribir, de ahi el minimo de 1.
    const items = (n.data?.items as string[] | undefined)?.length ?? 0;
    const rows = Math.max(items, 1);
    return { width: box.width, height: titleHeight + 2 + 16 + rows * 21 };
  }

  return { width: box.width, height: titleHeight };
}

// En una cadena recta (un solo cable de entrada y uno de salida) dagre no
// garantiza que los centros de los nodos coincidan en el eje perpendicular al
// flujo, porque cada nodo mide distinto. Esa diferencia de pocos px hace que
// el cable en step dibuje un "salto" en vez de ir recto. Alineamos el centro
// de cada nodo en cadena recta con el de su predecesor.
function alignStraightChains(
  g: dagre.graphlib.Graph,
  nodes: Node[],
  edges: Edge[],
  axis: "x" | "y"
): Map<string, number> {
  const outgoing = new Map<string, Edge[]>();
  const incoming = new Map<string, Edge[]>();
  nodes.forEach((n) => {
    outgoing.set(n.id, []);
    incoming.set(n.id, []);
  });
  edges.forEach((e) => {
    if (!outgoing.has(e.source) || !incoming.has(e.target)) return;
    outgoing.get(e.source)!.push(e);
    incoming.get(e.target)!.push(e);
  });

  const centers = new Map<string, number>();
  nodes.forEach((n) => {
    const pos = g.node(n.id);
    if (pos) centers.set(n.id, pos[axis]);
  });

  const visited = new Set<string>();
  const queue = nodes.filter((n) => (incoming.get(n.id)?.length ?? 0) !== 1).map((n) => n.id);

  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const outs = outgoing.get(id) ?? [];
    if (outs.length === 1) {
      const targetId = outs[0].target;
      const isSimpleTarget = (incoming.get(targetId)?.length ?? 0) === 1;
      if (isSimpleTarget && centers.has(id)) {
        centers.set(targetId, centers.get(id)!);
      }
    }
    outs.forEach((e) => queue.push(e.target));
  }

  return centers;
}

/**
 * Las flechas que cierran un ciclo, hallando el ciclo con un recorrido que parte del inicio.
 * Se dejan fuera del calculo (se siguen dibujando) para que dagre no elija por su cuenta cual
 * invertir: con el greedy, un ciclo que vuelve al inicio podia dejar otro nodo como cabeza.
 */
function backEdges(nodes: Node[], edges: Edge[], rootId: string | undefined): Set<string> {
  const outgoing = new Map<string, Edge[]>();
  const hasIncoming = new Set<string>();
  for (const e of edges) {
    if (!outgoing.has(e.source)) outgoing.set(e.source, []);
    outgoing.get(e.source)!.push(e);
    hasIncoming.add(e.target);
  }
  const back = new Set<string>();
  const state = new Map<string, "open" | "done">();

  function visit(id: string) {
    state.set(id, "open");
    for (const e of outgoing.get(id) ?? []) {
      const s = state.get(e.target);
      if (s === "open") back.add(e.id);
      else if (s === undefined) visit(e.target);
    }
    state.set(id, "done");
  }

  const starts = [
    ...(rootId ? [rootId] : []),
    ...nodes.filter((n) => !hasIncoming.has(n.id)).map((n) => n.id),
    ...nodes.map((n) => n.id),
  ];
  for (const id of starts) if (!state.has(id)) visit(id);
  return back;
}

export function layoutNodes(nodes: Node[], edges: Edge[], mode: LayoutMode = "horizontal"): Node[] {
  const { rankdir, nodesep, ranksep } = MODE_CONFIG[mode];
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir, nodesep, ranksep, acyclicer: "greedy" });

  const sizes = new Map(nodes.map((n) => [n.id, measureNode(n)]));

  // El inicio marcado a mano manda; sin marca, el primer nodo creado que ninguna flecha alcanza.
  const targets = new Set(edges.map((e) => e.target));
  const rootId = (nodes.find((n) => n.data?.root) ?? nodes.find((n) => !targets.has(n.id)))?.id;

  // dagre desempata por orden de insercion, asi que el inicio entra primero. Y sin flechas que
  // lleguen a el, un ciclo no puede darle la vuelta al arranque y mandarlo al final del flujo.
  const ordered = rootId ? [nodes.find((n) => n.id === rootId)!, ...nodes.filter((n) => n.id !== rootId)] : nodes;
  for (const n of ordered) {
    g.setNode(n.id, sizes.get(n.id)!);
  }
  const cycleEdges = backEdges(nodes, edges, rootId);
  const layoutEdges = edges.filter((e) => e.target !== rootId && !cycleEdges.has(e.id));
  for (const e of layoutEdges) {
    if (g.hasNode(e.source) && g.hasNode(e.target)) {
      g.setEdge(e.source, e.target);
    }
  }

  dagre.layout(g);

  const crossAxis = rankdir === "LR" ? "y" : "x";
  const alignedCenters = alignStraightChains(g, nodes, layoutEdges, crossAxis);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    const size = sizes.get(n.id)!;
    if (!pos) return n;
    const x = crossAxis === "x" ? alignedCenters.get(n.id) ?? pos.x : pos.x;
    const y = crossAxis === "y" ? alignedCenters.get(n.id) ?? pos.y : pos.y;
    return {
      ...n,
      position: { x: x - size.width / 2, y: y - size.height / 2 },
    };
  });
}
