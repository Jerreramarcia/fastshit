import { Handle, Position, type NodeProps } from "reactflow";
import InlineTitle from "./InlineTitle";

interface ActionData {
  label: string;
  autoFocus?: boolean;
  onLabelChange: (value: string) => void;
}

export default function ActionNode({ data, selected }: NodeProps<ActionData>) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        minWidth: 160,
        maxWidth: 240,
        background: "var(--surface)",
        border: `1px solid ${selected ? "var(--action)" : "var(--line)"}`,
        borderRadius: 6,
        boxShadow: selected ? "0 0 0 3px var(--action-bg)" : "none",
        overflow: "hidden",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: "var(--ink-soft)" }} />
      <div style={{ width: 4, background: "var(--action)" }} />
      <div style={{ padding: "8px 10px", flex: 1 }}>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--action)",
            marginBottom: 2,
          }}
        >
          ACCION
        </div>
        <InlineTitle
          value={data.label}
          placeholder="texto de la accion"
          autoFocus={data.autoFocus}
          onChange={data.onLabelChange}
          style={{ fontSize: 13 }}
        />
      </div>
      <Handle type="source" position={Position.Right} style={{ background: "var(--ink-soft)" }} />
    </div>
  );
}
