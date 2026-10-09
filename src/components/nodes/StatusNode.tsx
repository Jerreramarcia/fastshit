import { Handle, Position, type NodeProps } from "reactflow";
import InlineTitle from "./InlineTitle";
import ItemList from "./ItemList";
import { KIND_SPECS } from "../../lib/nodeKinds";
import { hasItems, type NodeKind } from "../../lib/graphTypes";

export interface StatusData {
  label: string;
  items?: string[];
  autoFocus?: boolean;
  readOnly?: boolean;
  onLabelChange: (value: string) => void;
  onItemsChange: (items: string[]) => void;
}

/**
 * Fabrica el nodo de una sola entrada/salida con etiqueta de color: lo usan
 * `action` y `blocker` (solo titulo) y los estados de un cambio en curso,
 * `mejora`, `error`, `testing` y `ok`, que ademas llevan una lista de detalles (donde se
 * detecto, que se esta probando, como se arreglo).
 *
 * Cambiar el tipo de un nodo conserva titulo y detalles, asi que el mismo nodo
 * puede recorrer error -> testing -> ok sin perder lo que ya contaba.
 */
export default function makeStatusNode(kind: NodeKind) {
  const spec = KIND_SPECS[kind];
  const withItems = hasItems(kind);

  function StatusNode({ data, selected }: NodeProps<StatusData>) {
    const items = data.items ?? [];
    // En el visor una lista vacia no aporta nada, asi que el cuerpo desaparece.
    const showItems = withItems && (!data.readOnly || items.some((it) => it.trim() !== ""));

    return (
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          minWidth: spec.minWidth,
          maxWidth: spec.maxWidth,
          background: "var(--surface)",
          border: `1px solid ${selected ? spec.color : "var(--line)"}`,
          borderRadius: 6,
          boxShadow: selected ? `0 0 0 3px ${spec.bg}` : "none",
          overflow: "hidden",
        }}
      >
        <Handle type="target" position={Position.Left} style={{ background: "var(--ink-soft)" }} />
        <div style={{ width: 4, background: spec.color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ padding: "8px 10px" }}>
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
              style={{ fontSize: 13, fontWeight: spec.boldTitle ? 600 : 400 }}
            />
          </div>
          {showItems && (
            <>
              <div style={{ borderTop: `1px solid ${spec.bg}` }} />
              <ItemList
                items={items}
                placeholder={spec.itemPlaceholder ?? "detalle..."}
                color={spec.color}
                bg={spec.bg}
                selected={selected}
                readOnly={data.readOnly}
                onChange={data.onItemsChange}
              />
            </>
          )}
        </div>
        <Handle type="source" position={Position.Right} style={{ background: "var(--ink-soft)" }} />
      </div>
    );
  }

  StatusNode.displayName = `StatusNode(${kind})`;
  return StatusNode;
}
