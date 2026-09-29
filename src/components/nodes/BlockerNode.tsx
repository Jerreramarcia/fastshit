import { Handle, Position, type NodeProps } from "reactflow";
import InlineTitle from "./InlineTitle";

interface BlockerData {
  label: string;
  autoFocus?: boolean;
  onLabelChange: (value: string) => void;
}

export default function BlockerNode({ data, selected }: NodeProps<BlockerData>) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        minWidth: 160,
        maxWidth: 240,
        background: "var(--surface)",
        border: `1px solid ${selected ? "var(--blocker)" : "var(--line)"}`,
        borderRadius: 6,
        boxShadow: selected ? "0 0 0 3px var(--blocker-bg)" : "none",
        overflow: "hidden",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: "var(--ink-soft)" }} />
      <div style={{ width: 4, background: "var(--blocker)" }} />
      <div style={{ padding: "8px 10px", flex: 1 }}>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--blocker)",
            marginBottom: 2,
          }}
        >
          BLOQUEANTE
        </div>
        <InlineTitle
          value={data.label}
          placeholder="texto del bloqueante"
          autoFocus={data.autoFocus}
          onChange={data.onLabelChange}
          style={{ fontSize: 13 }}
        />
      </div>
      <Handle type="source" position={Position.Right} style={{ background: "var(--ink-soft)" }} />
    </div>
  );
}
