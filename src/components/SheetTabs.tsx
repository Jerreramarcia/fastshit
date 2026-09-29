import { useState } from "react";

interface SheetSummary {
  id: string;
  name: string;
}

interface Props {
  sheets: SheetSummary[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export default function SheetTabs({ sheets, activeId, onSelect, onAdd, onRename, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function startRename(s: SheetSummary) {
    setEditingId(s.id);
    setDraft(s.name);
  }

  function commit() {
    if (editingId) onRename(editingId, draft.trim() || "Capa");
    setEditingId(null);
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "6px 12px",
        borderTop: "1px solid var(--line)",
        background: "var(--surface)",
        overflowX: "auto",
      }}
    >
      {sheets.map((s) => {
        const active = s.id === activeId;
        return (
          <div
            key={s.id}
            onClick={() => onSelect(s.id)}
            onDoubleClick={() => startRename(s)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: 6,
              background: active ? "var(--action-bg)" : "transparent",
              color: active ? "var(--action)" : "var(--ink-soft)",
              border: `1px solid ${active ? "var(--action)" : "transparent"}`,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: active ? 600 : 400,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {editingId === s.id ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  if (e.key === "Escape") setEditingId(null);
                }}
                style={{
                  fontSize: 12,
                  fontFamily: "var(--sans)",
                  border: "1px solid var(--action)",
                  borderRadius: 3,
                  padding: "1px 4px",
                  width: 90,
                }}
              />
            ) : (
              <span>{s.name}</span>
            )}
            {sheets.length > 1 && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(s.id);
                }}
                title="Eliminar hoja"
                style={{ fontSize: 12, opacity: 0.6, lineHeight: 1 }}
              >
                ×
              </span>
            )}
          </div>
        );
      })}
      <button
        onClick={onAdd}
        title="Agregar hoja"
        style={{
          border: "1px solid var(--line)",
          background: "transparent",
          borderRadius: 6,
          width: 24,
          height: 24,
          cursor: "pointer",
          color: "var(--ink-soft)",
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        +
      </button>
    </div>
  );
}
