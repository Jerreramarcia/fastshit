import { useState } from "react";

interface ProjectSummary {
  id: string;
  name: string;
}

interface Props {
  projects: ProjectSummary[];
  activeId: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export default function ProjectSidebar({
  projects,
  activeId,
  collapsed,
  onToggleCollapsed,
  onSelect,
  onAdd,
  onRename,
  onDelete,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function startRename(p: ProjectSummary) {
    setEditingId(p.id);
    setDraft(p.name);
  }

  function commit() {
    if (editingId) onRename(editingId, draft.trim() || "Proyecto");
    setEditingId(null);
  }

  return (
    <div
      style={{
        width: collapsed ? 44 : 220,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--line)",
        background: "var(--surface)",
        transition: "width 0.15s ease",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: "10px 10px",
          borderBottom: "1px solid var(--line)",
          flexShrink: 0,
        }}
      >
        {!collapsed && (
          <span style={{ fontSize: 11, fontFamily: "var(--mono)", fontWeight: 600, color: "var(--ink-soft)" }}>
            PROYECTOS
          </span>
        )}
        <button
          onClick={onToggleCollapsed}
          title={collapsed ? "Expandir" : "Colapsar"}
          style={{
            border: "1px solid var(--line)",
            background: "transparent",
            borderRadius: 4,
            width: 22,
            height: 22,
            cursor: "pointer",
            color: "var(--ink-soft)",
            fontSize: 11,
            flexShrink: 0,
          }}
        >
          {collapsed ? ">" : "<"}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 6, display: "flex", flexDirection: "column", gap: 2 }}>
        {projects.map((p) => {
          const active = p.id === activeId;
          return (
            <div
              key={p.id}
              onClick={() => onSelect(p.id)}
              onDoubleClick={() => !collapsed && startRename(p)}
              title={p.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: collapsed ? "8px 0" : "7px 8px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: 6,
                background: active ? "var(--action-bg)" : "transparent",
                color: active ? "var(--action)" : "var(--ink)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: active ? 600 : 400,
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  background: active ? "var(--action)" : "var(--line-soft)",
                  color: active ? "var(--surface)" : "var(--ink-soft)",
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {p.name.trim().charAt(0).toUpperCase() || "P"}
              </span>
              {!collapsed && (
                <>
                  {editingId === p.id ? (
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
                        flex: 1,
                        fontSize: 13,
                        fontFamily: "var(--sans)",
                        border: "1px solid var(--action)",
                        borderRadius: 3,
                        padding: "1px 4px",
                        minWidth: 0,
                      }}
                    />
                  ) : (
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name}
                    </span>
                  )}
                  {projects.length > 1 && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(p.id);
                      }}
                      title="Eliminar proyecto"
                      style={{ fontSize: 13, opacity: 0.5, flexShrink: 0 }}
                    >
                      ×
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: 6, borderTop: "1px solid var(--line)", flexShrink: 0 }}>
        <button
          onClick={onAdd}
          title="Nuevo proyecto"
          style={{
            width: "100%",
            border: "1px dashed var(--line)",
            background: "transparent",
            borderRadius: 6,
            padding: "6px 0",
            cursor: "pointer",
            color: "var(--ink-soft)",
            fontSize: collapsed ? 16 : 13,
          }}
        >
          +{!collapsed && " Proyecto"}
        </button>
      </div>
    </div>
  );
}
