import { useEffect, useRef, useState } from "react";
import { KIND_SPECS } from "../lib/nodeKinds";
import { STATUS_KINDS, type NodeKind } from "../lib/graphTypes";

/**
 * Boton flotante del visor que filtra las cadenas por el estado de su ultimo
 * nodo. El desplegable copia el menu de creacion de nodos del editor.
 */
export default function StatusFilterButton({
  selected,
  counts,
  onChange,
}: {
  selected: ReadonlySet<NodeKind>;
  counts: ReadonlyMap<NodeKind, number>;
  onChange: (kinds: Set<NodeKind>) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const filtering = selected.size < STATUS_KINDS.length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as globalThis.Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Quitar el ultimo estado dejaria el lienzo vacio sin forma obvia de volver.
  const toggle = (kind: NodeKind) => {
    const next = new Set(selected);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    if (next.size > 0) onChange(next);
  };

  return (
    <div ref={rootRef} style={{ position: "absolute", right: 18, bottom: 34, zIndex: 10 }}>
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            bottom: 54,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(24,32,39,0.14)",
            padding: 6,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            minWidth: 190,
          }}
        >
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--ink-soft)",
              padding: "4px 8px 6px",
            }}
          >
            FILTRAR POR ESTADO
          </span>
          {STATUS_KINDS.map((kind) => {
            const spec = KIND_SPECS[kind];
            const on = selected.has(kind);
            return (
              <button
                key={kind}
                onClick={() => toggle(kind)}
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
                  color: on ? "var(--ink)" : "var(--ink-soft)",
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
                    background: on ? spec.color : spec.bg,
                    color: "var(--surface)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {on ? "✓" : ""}
                </span>
                <span style={{ flex: 1 }}>{spec.label}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-soft)" }}>
                  {counts.get(kind) ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        title="Filtrar por estado"
        aria-label="Filtrar por estado"
        aria-expanded={open}
        style={{
          position: "relative",
          width: 46,
          height: 46,
          borderRadius: "50%",
          border: "1px solid var(--line)",
          background: filtering ? "var(--action-bg)" : "var(--surface)",
          color: filtering ? "var(--action)" : "var(--ink)",
          boxShadow: "0 6px 18px rgba(24,32,39,0.16)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 5h18l-7 8.5V19l-4 2v-7.5L3 5z" />
        </svg>
        {filtering && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "var(--action)",
              border: "2px solid var(--surface)",
            }}
          />
        )}
      </button>
    </div>
  );
}
