import { useEffect, useId, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnConnectStartParams,
} from "reactflow";
import "reactflow/dist/style.css";
import ActionNode from "./nodes/ActionNode";
import BlockerNode from "./nodes/BlockerNode";
import ConditionalNode from "./nodes/ConditionalNode";
import PageNode from "./nodes/PageNode";
import Toolbar from "./Toolbar";
import SheetTabs from "./SheetTabs";
import type { Branch, ExportedBundle, NodeKind } from "../lib/graphTypes";
import { toExportedSheet, toMarkdown } from "../lib/exportDoc";
import { layoutNodes } from "../lib/layout";
import { downloadText, readJsonFile } from "../lib/fileIO";

interface Sheet {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
}

let uid = 1;
const nextId = (prefix: string) => `${prefix}${uid++}`;

function makeSheet(name: string, nodes: Node[] = []): Sheet {
  return { id: nextId("sheet"), name, nodes, edges: [] };
}

interface PendingConnection {
  source: string | null;
  sourceHandle: string | null;
  screenX: number;
  screenY: number;
  flowX: number;
  flowY: number;
}

const MENU_OPTIONS: { key: string; kind: NodeKind; label: string; color: string; bg: string }[] = [
  { key: "1", kind: "action", label: "Accion", color: "var(--action)", bg: "var(--action-bg)" },
  { key: "2", kind: "blocker", label: "Bloqueante", color: "var(--blocker)", bg: "var(--blocker-bg)" },
  { key: "3", kind: "conditional", label: "Condicional", color: "var(--conditional)", bg: "var(--conditional-bg)" },
  { key: "4", kind: "page", label: "Pagina", color: "var(--page)", bg: "var(--page-bg)" },
];

function ConnectionTypeMenu({
  pending,
  onPick,
  onCancel,
}: {
  pending: PendingConnection;
  onPick: (kind: NodeKind) => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const opt = MENU_OPTIONS.find((o) => o.key === e.key);
      if (opt) {
        e.preventDefault();
        onPick(opt.kind);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onPick, onCancel]);

  return (
    <>
      <div onClick={onCancel} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
      <div
        style={{
          position: "fixed",
          left: pending.screenX,
          top: pending.screenY,
          zIndex: 50,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 8,
          boxShadow: "0 8px 24px rgba(24,32,39,0.14)",
          padding: 6,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          minWidth: 168,
        }}
      >
        {MENU_OPTIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => onPick(o.kind)}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              padding: "6px 8px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              textAlign: "left",
              fontSize: 13,
              borderRadius: 5,
              color: "var(--ink)",
              fontFamily: "var(--sans)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--paper)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                background: o.bg,
                color: o.color,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--mono)",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {o.key}
            </span>
            {o.label}
          </button>
        ))}
      </div>
    </>
  );
}

function defaultBranches(): Branch[] {
  return [
    { id: nextId("br"), label: "si" },
    { id: nextId("br"), label: "no" },
  ];
}

function FlowCanvasInner() {
  const backgroundId = useId();
  const [sheets, setSheets] = useState<Sheet[]>(() => [
    makeSheet("Capa 1", [
      { id: nextId("n"), type: "action", position: { x: 50, y: 100 }, data: { label: "Usuario llega a la landing" } },
    ]),
  ]);
  const [activeSheetId, setActiveSheetId] = useState(() => sheets[0].id);
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
  const [layoutAnimating, setLayoutAnimating] = useState(false);
  const connectStartRef = useRef<{ nodeId: string | null; handleId: string | null } | null>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  const historyRef = useRef<{ past: Sheet[][]; future: Sheet[][] }>({ past: [], future: [] });
  const burstRef = useRef<{ before: Sheet[] | null; timer: number | null }>({ before: null, timer: null });
  const MAX_HISTORY = 100;

  function flushBurst() {
    if (burstRef.current.timer !== null) {
      window.clearTimeout(burstRef.current.timer);
      burstRef.current.timer = null;
    }
    if (burstRef.current.before !== null) {
      historyRef.current.past.push(burstRef.current.before);
      if (historyRef.current.past.length > MAX_HISTORY) historyRef.current.past.shift();
      historyRef.current.future = [];
      burstRef.current.before = null;
    }
  }

  function commitNow(updater: (prev: Sheet[]) => Sheet[]) {
    flushBurst();
    setSheets((prev) => {
      historyRef.current.past.push(prev);
      if (historyRef.current.past.length > MAX_HISTORY) historyRef.current.past.shift();
      historyRef.current.future = [];
      return updater(prev);
    });
  }

  function commitDebounced(updater: (prev: Sheet[]) => Sheet[]) {
    setSheets((prev) => {
      if (burstRef.current.before === null) burstRef.current.before = prev;
      return updater(prev);
    });
    if (burstRef.current.timer !== null) window.clearTimeout(burstRef.current.timer);
    burstRef.current.timer = window.setTimeout(flushBurst, 500);
  }

  function undo() {
    flushBurst();
    setSheets((prev) => {
      const past = historyRef.current.past;
      if (past.length === 0) return prev;
      const previous = past.pop()!;
      historyRef.current.future.push(prev);
      return previous;
    });
  }

  function redo() {
    setSheets((prev) => {
      const future = historyRef.current.future;
      if (future.length === 0) return prev;
      const nextState = future.pop()!;
      historyRef.current.past.push(prev);
      return nextState;
    });
  }

  const deleteSelectedRef = useRef<() => void>(() => {});

  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (!mod && (e.key === "Backspace" || e.key === "Delete")) {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
        e.preventDefault();
        deleteSelectedRef.current();
      }
    }
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sheets.some((s) => s.id === activeSheetId) && sheets.length > 0) {
      setActiveSheetId(sheets[0].id);
    }
  }, [sheets, activeSheetId]);

  const activeSheet = sheets.find((s) => s.id === activeSheetId) ?? sheets[0];

  function updateSheetNodes(sheetId: string, updater: (nodes: Node[]) => Node[]) {
    commitNow((prev) => prev.map((s) => (s.id === sheetId ? { ...s, nodes: updater(s.nodes) } : s)));
  }
  function updateSheetEdges(sheetId: string, updater: (edges: Edge[]) => Edge[]) {
    commitNow((prev) => prev.map((s) => (s.id === sheetId ? { ...s, edges: updater(s.edges) } : s)));
  }
  function updateSheetNodesDebounced(sheetId: string, updater: (nodes: Node[]) => Node[]) {
    commitDebounced((prev) => prev.map((s) => (s.id === sheetId ? { ...s, nodes: updater(s.nodes) } : s)));
  }

  function deleteSelected() {
    const sheetId = activeSheet.id;
    const hasSelection = activeSheet.nodes.some((n) => n.selected) || activeSheet.edges.some((e) => e.selected);
    if (!hasSelection) return;
    commitNow((prev) =>
      prev.map((s) => {
        if (s.id !== sheetId) return s;
        const selectedNodeIds = new Set(s.nodes.filter((n) => n.selected).map((n) => n.id));
        const nodes = s.nodes.filter((n) => !selectedNodeIds.has(n.id));
        const edges = s.edges.filter(
          (e) => !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target) && !e.selected
        );
        return { ...s, nodes, edges };
      })
    );
  }
  deleteSelectedRef.current = deleteSelected;

  function autoLayout() {
    const sheetId = activeSheet.id;
    setLayoutAnimating(true);
    commitNow((prev) =>
      prev.map((s) => (s.id === sheetId ? { ...s, nodes: layoutNodes(s.nodes, s.edges) } : s))
    );
    requestAnimationFrame(() => fitView({ duration: 320 }));
    window.setTimeout(() => setLayoutAnimating(false), 400);
  }

  const nodeTypes = useMemo(
    () => ({ action: ActionNode, blocker: BlockerNode, conditional: ConditionalNode, page: PageNode }),
    []
  );

  function branchCallbacks(sheetId: string, nodeId: string) {
    return {
      onAddBranch: () =>
        updateSheetNodes(sheetId, (nds) =>
          nds.map((n) => {
            if (n.id !== nodeId) return n;
            const branches: Branch[] = n.data.branches ?? [];
            return { ...n, data: { ...n.data, branches: [...branches, { id: nextId("br"), label: `rama ${branches.length + 1}` }] } };
          })
        ),
      onRenameBranch: (branchId: string, value: string) =>
        updateSheetNodes(sheetId, (nds) =>
          nds.map((n) => {
            if (n.id !== nodeId) return n;
            const branches: Branch[] = n.data.branches ?? [];
            return { ...n, data: { ...n.data, branches: branches.map((b) => (b.id === branchId ? { ...b, label: value } : b)) } };
          })
        ),
      onRemoveBranch: (branchId: string) => {
        updateSheetNodes(sheetId, (nds) =>
          nds.map((n) => {
            if (n.id !== nodeId) return n;
            const branches: Branch[] = n.data.branches ?? [];
            if (branches.length <= 1) return n;
            return { ...n, data: { ...n.data, branches: branches.filter((b) => b.id !== branchId) } };
          })
        );
        updateSheetEdges(sheetId, (eds) => eds.filter((e) => !(e.source === nodeId && e.sourceHandle === branchId)));
      },
    };
  }

  function onLabelChange(sheetId: string, nodeId: string, value: string) {
    updateSheetNodes(sheetId, (nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label: value } } : n))
    );
  }

  function withCallbacks(sheetId: string, node: Node): Node {
    let data = { ...node.data, onLabelChange: (value: string) => onLabelChange(sheetId, node.id, value) };
    if (node.type === "conditional") {
      data = { ...data, ...branchCallbacks(sheetId, node.id) };
    }
    if (node.type === "page") {
      data = {
        ...data,
        onItemsChange: (items: string[]) =>
          updateSheetNodesDebounced(sheetId, (nds) =>
            nds.map((n) => (n.id === node.id ? { ...n, data: { ...n.data, items } } : n))
          ),
      };
    }
    return { ...node, data };
  }

  const displayNodes = activeSheet.nodes.map((n) => withCallbacks(activeSheet.id, n));

  function onNodesChange(changes: NodeChange[]) {
    const sheetId = activeSheet.id;
    const updater = (nds: Node[]) => applyNodeChanges(changes, nds);
    const dragOngoing = changes.some((c) => c.type === "position" && c.dragging === true);
    const dragEnd = changes.some((c) => c.type === "position" && c.dragging === false);
    const otherStructural = changes.some((c) => c.type !== "position" && c.type !== "select" && c.type !== "dimensions");

    if (dragOngoing) {
      setSheets((prev) => {
        if (burstRef.current.before === null) burstRef.current.before = prev;
        return prev.map((s) => (s.id === sheetId ? { ...s, nodes: updater(s.nodes) } : s));
      });
    } else if (dragEnd) {
      setSheets((prev) => prev.map((s) => (s.id === sheetId ? { ...s, nodes: updater(s.nodes) } : s)));
      flushBurst();
    } else if (otherStructural) {
      updateSheetNodes(sheetId, updater);
    } else {
      setSheets((prev) => prev.map((s) => (s.id === sheetId ? { ...s, nodes: updater(s.nodes) } : s)));
    }
  }
  function onEdgesChange(changes: EdgeChange[]) {
    const sheetId = activeSheet.id;
    const updater = (eds: Edge[]) => applyEdgeChanges(changes, eds);
    const meaningful = changes.some((c) => c.type !== "select");
    if (meaningful) {
      updateSheetEdges(sheetId, updater);
    } else {
      setSheets((prev) => prev.map((s) => (s.id === sheetId ? { ...s, edges: updater(s.edges) } : s)));
    }
  }
  function onConnect(connection: Connection) {
    updateSheetEdges(activeSheet.id, (eds) => addEdge(connection, eds));
  }
  function onConnectStart(_: unknown, params: OnConnectStartParams) {
    connectStartRef.current = { nodeId: params.nodeId, handleId: params.handleId };
  }
  function onConnectEnd(event: MouseEvent | TouchEvent) {
    const start = connectStartRef.current;
    connectStartRef.current = null;
    if (!start || !start.nodeId) return;

    const target = event.target as HTMLElement;
    const droppedOnPane = target.classList.contains("react-flow__pane");
    if (!droppedOnPane) return;

    const clientX = "changedTouches" in event ? event.changedTouches[0].clientX : event.clientX;
    const clientY = "changedTouches" in event ? event.changedTouches[0].clientY : event.clientY;
    const flowPos = screenToFlowPosition({ x: clientX, y: clientY });

    setPendingConnection({
      source: start.nodeId,
      sourceHandle: start.handleId,
      screenX: clientX,
      screenY: clientY,
      flowX: flowPos.x,
      flowY: flowPos.y,
    });
  }

  function onPaneContextMenu(event: { preventDefault: () => void; clientX: number; clientY: number }) {
    event.preventDefault();
    const clientX = event.clientX;
    const clientY = event.clientY;
    const flowPos = screenToFlowPosition({ x: clientX, y: clientY });
    setPendingConnection({
      source: null,
      sourceHandle: null,
      screenX: clientX,
      screenY: clientY,
      flowX: flowPos.x,
      flowY: flowPos.y,
    });
  }

  function nodeData(kind: NodeKind) {
    return {
      label: "",
      autoFocus: true,
      ...(kind === "conditional" ? { branches: defaultBranches() } : {}),
      ...(kind === "page" ? { items: [] } : {}),
    };
  }

  function createNodeFromPending(kind: NodeKind) {
    const target = pendingConnection;
    if (!target) return;
    const sheetId = activeSheet.id;
    setPendingConnection(null);
    const id = nextId("n");
    const newNode: Node = {
      id,
      type: kind,
      position: { x: target.flowX, y: target.flowY },
      data: nodeData(kind),
    };
    commitNow((prev) =>
      prev.map((s) =>
        s.id === sheetId
          ? {
              ...s,
              nodes: [...s.nodes, newNode],
              edges: target.source
                ? addEdge({ source: target.source, sourceHandle: target.sourceHandle, target: id, targetHandle: null }, s.edges)
                : s.edges,
            }
          : s
      )
    );
  }

  function addNode(kind: NodeKind) {
    const sheetId = activeSheet.id;
    const newNode: Node = {
      id: nextId("n"),
      type: kind,
      position: { x: 100 + Math.random() * 400, y: 100 + Math.random() * 300 },
      data: nodeData(kind),
    };
    updateSheetNodes(sheetId, (nds) => [...nds, newNode]);
  }

  function handleExport() {
    const bundle: ExportedBundle = { sheets: sheets.map((s) => toExportedSheet(s)) };
    downloadText("flow.json", JSON.stringify(bundle, null, 2), "application/json");
    downloadText("flow.md", toMarkdown(bundle), "text/markdown");
  }

  async function handleImport(file: File) {
    const bundle = await readJsonFile<ExportedBundle>(file);
    const imported: Sheet[] = bundle.sheets.map((s) => ({
      id: s.id,
      name: s.name,
      nodes: s.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: {
          label: n.label,
          ...(n.branches ? { branches: n.branches } : {}),
          ...(n.type === "page" ? { items: n.items ?? [] } : {}),
        },
      })),
      edges: s.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle })),
    }));
    if (imported.length === 0) return;
    historyRef.current = { past: [], future: [] };
    burstRef.current = { before: null, timer: null };
    setSheets(imported);
    setActiveSheetId(imported[0].id);
  }

  function addSheet() {
    const s = makeSheet(`Capa ${sheets.length + 1}`);
    commitNow((prev) => [...prev, s]);
    setActiveSheetId(s.id);
  }
  function renameSheet(id: string, name: string) {
    commitNow((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  }
  function deleteSheet(id: string) {
    commitNow((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (next.length === 0) return prev;
      if (id === activeSheetId) setActiveSheetId(next[0].id);
      return next;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar onAddNode={addNode} onExport={handleExport} onImport={handleImport} onAutoLayout={autoLayout} />
      <div
        className={layoutAnimating ? "layout-animate" : undefined}
        style={{ flex: 1, position: "relative", minHeight: 0 }}
      >
        <ReactFlow
          nodes={displayNodes}
          edges={activeSheet.edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onPaneContextMenu={onPaneContextMenu}
          nodeTypes={nodeTypes}
          selectionKeyCode="Control"
          multiSelectionKeyCode="Shift"
          deleteKeyCode={null}
          defaultEdgeOptions={{ type: "smoothstep", style: { stroke: "#8b97a3", strokeWidth: 1.6 } }}
          fitView
        >
          <Background id={backgroundId} color="#c3cac9" gap={18} size={1.4} />
          <Controls />
        </ReactFlow>
        {pendingConnection && (
          <ConnectionTypeMenu
            pending={pendingConnection}
            onPick={createNodeFromPending}
            onCancel={() => setPendingConnection(null)}
          />
        )}
      </div>
      <SheetTabs
        sheets={sheets.map((s) => ({ id: s.id, name: s.name }))}
        activeId={activeSheet.id}
        onSelect={setActiveSheetId}
        onAdd={addSheet}
        onRename={renameSheet}
        onDelete={deleteSheet}
      />
    </div>
  );
}

export default function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  );
}
