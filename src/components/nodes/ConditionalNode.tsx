import { useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { Branch } from "../../lib/graphTypes";
import InlineTitle from "./InlineTitle";

interface ConditionalData {
  label: string;
  branches: Branch[];
  autoFocus?: boolean;
  readOnly?: boolean;
  onLabelChange: (value: string) => void;
  onAddBranch: () => void;
  onRenameBranch: (branchId: string, value: string) => void;
  onRemoveBranch: (branchId: string) => void;
}

export default function ConditionalNode({ data, selected }: NodeProps<ConditionalData>) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const branches = data.branches ?? [];

  function startEdit(b: Branch) {
    setEditingId(b.id);
    setDraft(b.label);
  }

  function commitEdit() {
    if (editingId) data.onRenameBranch(editingId, draft.trim() || "rama");
    setEditingId(null);
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        minWidth: 190,
        maxWidth: 260,
        background: "var(--surface)",
        border: `1px solid ${selected ? "var(--conditional)" : "var(--line)"}`,
        borderRadius: 6,
        boxShadow: selected ? "0 0 0 3px var(--conditional-bg)" : "none",
        position: "relative",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: "var(--ink-soft)" }} />
      <div style={{ width: 4, background: "var(--conditional)", borderRadius: "6px 0 0 6px" }} />
      <div style={{ padding: "8px 10px", flex: 1 }}>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--conditional)",
            marginBottom: 2,
          }}
        >
          CONDICIONAL
        </div>
        <InlineTitle
          value={data.label}
          placeholder="texto del condicional"
          autoFocus={data.autoFocus}
          readOnly={data.readOnly}
          onChange={data.onLabelChange}
          style={{ fontSize: 13, marginBottom: 6 }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {branches.map((b) => (
            <div
              key={b.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 6,
                fontSize: 11,
                fontFamily: "var(--mono)",
                color: "var(--ink-soft)",
                position: "relative",
                minHeight: 18,
              }}
            >
              {editingId === b.id && !data.readOnly ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--mono)",
                    border: "1px solid var(--conditional)",
                    borderRadius: 3,
                    padding: "1px 4px",
                    width: 90,
                  }}
                />
              ) : (
                <span
                  onClick={(e) => {
                    if (data.readOnly) return;
                    e.stopPropagation();
                    startEdit(b);
                  }}
                  onDoubleClick={(e) => e.stopPropagation()}
                  style={{ cursor: data.readOnly ? "default" : "text", flex: 1 }}
                  title={data.readOnly ? undefined : "Click para renombrar"}
                >
                  {b.label}
                </span>
              )}
              {branches.length > 1 && !data.readOnly && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onRemoveBranch(b.id);
                  }}
                  onDoubleClick={(e) => e.stopPropagation()}
                  title="Quitar rama"
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--ink-soft)",
                    cursor: "pointer",
                    fontSize: 11,
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              )}
              <Handle
                type="source"
                position={Position.Right}
                id={b.id}
                style={{ position: "absolute", right: -14, top: "50%", background: "var(--conditional)" }}
              />
            </div>
          ))}
        </div>

        {!data.readOnly && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onAddBranch();
          }}
          onDoubleClick={(e) => e.stopPropagation()}
          style={{
            marginTop: 6,
            border: "1px dashed var(--line)",
            background: "transparent",
            color: "var(--ink-soft)",
            borderRadius: 4,
            fontSize: 11,
            padding: "2px 6px",
            cursor: "pointer",
            width: "100%",
          }}
        >
          + rama
        </button>
        )}
      </div>
    </div>
  );
}
