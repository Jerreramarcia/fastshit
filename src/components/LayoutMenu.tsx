import { useEffect, useRef, useState } from "react";
import type { LayoutMode } from "../lib/layout";

const LAYOUT_MODES: { mode: LayoutMode; label: string; hint: string }[] = [
  { mode: "horizontal", label: "Horizontal", hint: "izquierda -> derecha, espaciado normal" },
  { mode: "vertical", label: "Vertical", hint: "arriba -> abajo" },
  { mode: "compact", label: "Compacto", hint: "horizontal, menos espacio entre nodos" },
];

/** Menu "Ordenar": lo comparten el editor y el visor compartido. */
export default function LayoutMenu({ onPick }: { onPick: (mode: LayoutMode) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as globalThis.Node)) setOpen(false);
    }
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Reordenar nodos segun las flechas"
        style={{
          padding: "6px 12px",
          border: "1px solid var(--line)",
          borderRadius: 6,
          background: "var(--surface)",
          color: "var(--ink)",
          cursor: "pointer",
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        Ordenar
        <span style={{ fontSize: 10, color: "var(--ink-soft)" }}>▾</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 60,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(24,32,39,0.14)",
            padding: 6,
            minWidth: 210,
          }}
        >
          {LAYOUT_MODES.map((m) => (
            <button
              key={m.mode}
              onClick={() => {
                onPick(m.mode);
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "6px 8px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                borderRadius: 5,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--paper)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ fontSize: 13, color: "var(--ink)" }}>{m.label}</div>
              <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{m.hint}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
