export type NodeKind = "action" | "blocker" | "conditional" | "page";

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
}

export interface ExportedBundle {
  sheets: ExportedSheet[];
}
