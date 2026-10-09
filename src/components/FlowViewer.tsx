import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, { Background, Controls, ReactFlowProvider, type Node } from "reactflow";
import "reactflow/dist/style.css";
import SnappedStepEdge from "./edges/SnappedStepEdge";
import makeStatusNode from "./nodes/StatusNode";
import ConditionalNode from "./nodes/ConditionalNode";
import PageNode from "./nodes/PageNode";
import { bundleToSheets, type Sheet } from "../lib/bundle";
import { decodeBundle, fetchLiveBundle, type ShareTarget } from "../lib/share";
import { KIND_LIST } from "../lib/nodeKinds";
import { LinkRulesContext } from "../lib/links";
import { isStatusKind, type NodeKind } from "../lib/graphTypes";

/** Cada cuanto se vuelve a leer una sesion en vivo. */
const POLL_MS = 15000;

const noop = () => {};

function relativeTime(from: number): string {
  const seconds = Math.round((Date.now() - from) / 1000);
  if (seconds < 10) return "hace unos segundos";
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `hace ${hours} h`;
}

/** Resumen de cuantos nodos de estado hay, para ver el avance de un tiron. */
function statusSummary(sheets: Sheet[]): { kind: NodeKind; count: number }[] {
  const counts = new Map<NodeKind, number>();
  for (const sheet of sheets) {
    for (const node of sheet.nodes) {
      const kind = node.type as NodeKind;
      if (isStatusKind(kind)) counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
  }
  return KIND_LIST.filter((s) => counts.has(s.kind)).map((s) => ({ kind: s.kind, count: counts.get(s.kind)! }));
}

function ViewerCanvas({ sheet }: { sheet: Sheet }) {
  const nodeTypes = useMemo(
    () => ({
      action: makeStatusNode("action"),
      blocker: makeStatusNode("blocker"),
      conditional: ConditionalNode,
      page: PageNode,
      error: makeStatusNode("error"),
      testing: makeStatusNode("testing"),
      ok: makeStatusNode("ok"),
    }),
    []
  );
  const edgeTypes = useMemo(() => ({ snappedStep: SnappedStepEdge }), []);

  const nodes: Node[] = useMemo(
    () =>
      sheet.nodes.map((n) => ({
        ...n,
        data: { ...n.data, readOnly: true, onLabelChange: noop, onItemsChange: noop },
      })),
    [sheet.nodes]
  );

  return (
    <LinkRulesContext.Provider value={sheet.links ?? []}>
      <ReactFlow
        nodes={nodes}
        edges={sheet.edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        deleteKeyCode={null}
        defaultEdgeOptions={{ type: "snappedStep", style: { stroke: "#8b97a3", strokeWidth: 1.6 } }}
        fitView
      >
        <Background color="#c3cac9" gap={18} size={1.4} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </LinkRulesContext.Provider>
  );
}

export default function FlowViewer({ target }: { target: ShareTarget }) {
  const [sheets, setSheets] = useState<Sheet[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastLoad, setLastLoad] = useState<number>(Date.now());
  const [justUpdated, setJustUpdated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  // Hash del ultimo bundle visto: evita repintar cuando el gist no cambio.
  const signatureRef = useRef<string>("");

  const isLive = target.kind === "live";

  const load = useCallback(
    async (silent: boolean) => {
      if (!silent) setRefreshing(true);
      try {
        const bundle =
          target.kind === "snapshot"
            ? await decodeBundle(target.encoded)
            : await fetchLiveBundle(target.owner, target.gistId);
        const signature = JSON.stringify(bundle);
        setError(null);
        setLastLoad(Date.now());
        if (signature === signatureRef.current) return;
        const changed = signatureRef.current !== "";
        signatureRef.current = signature;
        const next = bundleToSheets(bundle);
        setSheets(next);
        setActiveId((prev) => (prev && next.some((s) => s.id === prev) ? prev : next[0]?.id ?? null));
        if (changed) {
          setJustUpdated(true);
          window.setTimeout(() => setJustUpdated(false), 2500);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el flujo compartido.");
      } finally {
        setRefreshing(false);
      }
    },
    [target]
  );

  useEffect(() => {
    void load(true);
  }, [load]);

  // Las URLs de snapshot son inmutables, no hay nada que repreguntar.
  useEffect(() => {
    if (!isLive || !autoRefresh) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [isLive, autoRefresh, load]);

  const activeSheet = sheets?.find((s) => s.id === activeId) ?? sheets?.[0] ?? null;
  const summary = sheets ? statusSummary(sheets) : [];

  if (error && !sheets) {
    return (
      <div style={{ padding: 32, maxWidth: 520, margin: "0 auto", fontSize: 14 }}>
        <h1 style={{ fontSize: 18, marginBottom: 8 }}>No se pudo abrir el flujo</h1>
        <p style={{ color: "var(--ink-soft)", lineHeight: 1.6 }}>{error}</p>
      </div>
    );
  }

  if (!activeSheet) {
    return <div style={{ padding: 32, color: "var(--ink-soft)" }}>Cargando flujo compartido...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "10px 16px",
          borderBottom: "1px solid var(--line)",
          background: "var(--surface)",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600 }}>fastShit</span>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 6px",
            borderRadius: 4,
            background: isLive ? "var(--ok-bg)" : "var(--paper)",
            color: isLive ? "var(--ok)" : "var(--ink-soft)",
          }}
        >
          {isLive ? "EN VIVO" : "SOLO LECTURA"}
        </span>

        {summary.length > 0 && (
          <div style={{ display: "flex", gap: 6 }}>
            {summary.map((s) => {
              const spec = KIND_LIST.find((k) => k.kind === s.kind)!;
              return (
                <span
                  key={s.kind}
                  title={spec.hint}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    padding: "2px 7px",
                    borderRadius: 4,
                    background: spec.bg,
                    color: spec.color,
                    fontWeight: 600,
                  }}
                >
                  {s.count} {spec.tag}
                </span>
              );
            })}
          </div>
        )}

        <span style={{ flex: 1 }} />

        {isLive && (
          <>
            <span style={{ fontSize: 12, color: justUpdated ? "var(--ok)" : "var(--ink-soft)" }}>
              {justUpdated ? "acaba de cambiar" : `leido ${relativeTime(lastLoad)}`}
            </span>
            <button
              onClick={() => void load(false)}
              disabled={refreshing}
              style={{
                padding: "5px 10px",
                border: "1px solid var(--line)",
                borderRadius: 6,
                background: "var(--surface)",
                color: "var(--ink)",
                cursor: refreshing ? "default" : "pointer",
                fontSize: 12,
              }}
            >
              {refreshing ? "Leyendo..." : "Actualizar"}
            </button>
            <label
              style={{ fontSize: 12, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 5 }}
              title={`Relee el flujo cada ${POLL_MS / 1000} segundos`}
            >
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              auto
            </label>
          </>
        )}
      </div>

      {error && (
        <div style={{ padding: "6px 16px", fontSize: 12, background: "var(--error-bg)", color: "var(--error)" }}>
          {error} Se sigue mostrando la ultima version que se pudo leer.
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0 }}>
        <ReactFlowProvider key={activeSheet.id}>
          <ViewerCanvas sheet={activeSheet} />
        </ReactFlowProvider>
      </div>

      {sheets && sheets.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: "6px 10px",
            borderTop: "1px solid var(--line)",
            background: "var(--surface)",
            overflowX: "auto",
          }}
        >
          {sheets.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              style={{
                padding: "5px 12px",
                border: "1px solid var(--line)",
                borderRadius: 6,
                background: s.id === activeSheet.id ? "var(--ink)" : "var(--surface)",
                color: s.id === activeSheet.id ? "var(--surface)" : "var(--ink)",
                cursor: "pointer",
                fontSize: 12,
                whiteSpace: "nowrap",
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
