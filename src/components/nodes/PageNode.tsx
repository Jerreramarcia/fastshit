import { Handle, Position, type NodeProps } from "reactflow";
import InlineTitle from "./InlineTitle";
import ItemList from "./ItemList";
import { KIND_SPECS } from "../../lib/nodeKinds";

interface PageData {
  label: string;
  items: string[];
  autoFocus?: boolean;
  readOnly?: boolean;
  onLabelChange: (value: string) => void;
  onItemsChange: (items: string[]) => void;
}

const spec = KIND_SPECS.page;

export default function PageNode({ data, selected }: NodeProps<PageData>) {
  return (
    <div
      style={{
        minWidth: 220,
        maxWidth: 300,
        background: "var(--surface)",
        border: `1px solid ${selected ? spec.color : "var(--line)"}`,
        borderRadius: 6,
        boxShadow: selected ? `0 0 0 3px ${spec.bg}` : "none",
        overflow: "hidden",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: "var(--ink-soft)" }} />
      <Handle type="source" position={Position.Right} style={{ background: "var(--ink-soft)" }} />

      <div style={{ padding: "10px 12px" }}>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            fontWeight: 600,
            color: spec.color,
            marginBottom: 2,
          }}
        >
          {spec.tag}
        </div>
        <InlineTitle
          value={data.label}
          placeholder={spec.titlePlaceholder}
          autoFocus={data.autoFocus}
          readOnly={data.readOnly}
          onChange={data.onLabelChange}
          style={{ fontSize: 13, fontWeight: 600 }}
        />
      </div>

      <div style={{ borderTop: "2px solid var(--ink)" }} />

      <ItemList
        items={data.items ?? []}
        placeholder={spec.itemPlaceholder ?? "agregar accion..."}
        color={spec.color}
        bg={spec.bg}
        selected={selected}
        readOnly={data.readOnly}
        onChange={data.onItemsChange}
      />
    </div>
  );
}
