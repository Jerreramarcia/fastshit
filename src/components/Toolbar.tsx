import type { ChangeEvent } from "react";
import type { NodeKind } from "../lib/graphTypes";

interface Props {
  onAddNode: (kind: NodeKind) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onAutoLayout: () => void;
}

const NODE_TOOLS: { key: string; kind: NodeKind; label: string; color: string; bg: string }[] = [
  { key: "1", kind: "action", label: "Accion", color: "var(--action)", bg: "var(--action-bg)" },
  { key: "2", kind: "blocker", label: "Bloqueante", color: "var(--blocker)", bg: "var(--blocker-bg)" },
  { key: "3", kind: "conditional", label: "Condicional", color: "var(--conditional)", bg: "var(--conditional-bg)" },
  { key: "4", kind: "page", label: "Pagina", color: "var(--page)", bg: "var(--page-bg)" },
];

export default function Toolbar({ onAddNode, onExport, onImport, onAutoLayout }: Props) {
  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onImport(file);
    e.target.value = "";
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "10px 16px",
        borderBottom: "1px solid var(--line)",
        background: "var(--surface)",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            background: "var(--ink)",
            color: "var(--surface)",
            fontFamily: "var(--mono)",
            fontSize: 12,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          fS
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2 }}>fastShit</span>
      </div>

      <div style={{ width: 1, height: 22, background: "var(--line)" }} />

      <div style={{ display: "flex", gap: 6 }}>
        {NODE_TOOLS.map((t) => (
          <button
            key={t.kind}
            onClick={() => onAddNode(t.kind)}
            title={`Agregar ${t.label} (tecla ${t.key} al soltar una flecha)`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px 6px 6px",
              border: "1px solid var(--line)",
              borderRadius: 6,
              background: "var(--surface)",
              cursor: "pointer",
              fontSize: 13,
              color: "var(--ink)",
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                background: t.bg,
                color: t.color,
                fontFamily: "var(--mono)",
                fontSize: 11,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {t.key}
            </span>
            {t.label}
          </button>
        ))}
      </div>

      <button
        onClick={onAutoLayout}
        title="Reordenar nodos segun las flechas"
        style={{
          padding: "6px 12px",
          border: "1px solid var(--line)",
          borderRadius: 6,
          background: "var(--surface)",
          color: "var(--ink)",
          cursor: "pointer",
          fontSize: 13,
        }}
      >
        Ordenar
      </button>

      <span style={{ flex: 1 }} />

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onExport}
          style={{
            padding: "6px 12px",
            border: "1px solid var(--ink)",
            borderRadius: 6,
            background: "var(--ink)",
            color: "var(--surface)",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          Exportar
        </button>
        <label
          style={{
            cursor: "pointer",
            border: "1px solid var(--line)",
            padding: "6px 12px",
            borderRadius: 6,
            fontSize: 13,
            color: "var(--ink)",
            background: "var(--surface)",
          }}
        >
          Importar
          <input type="file" accept="application/json" onChange={handleFile} style={{ display: "none" }} />
        </label>
      </div>
    </div>
  );
}
