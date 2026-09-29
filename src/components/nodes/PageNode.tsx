import { useEffect, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import InlineTitle from "./InlineTitle";

interface PageData {
  label: string;
  items: string[];
  autoFocus?: boolean;
  onLabelChange: (value: string) => void;
  onItemsChange: (items: string[]) => void;
}

export default function PageNode({ data, selected }: NodeProps<PageData>) {
  const [items, setItems] = useState<string[]>(data.items ?? []);
  const wasSelected = useRef(selected);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const focusIndexRef = useRef<number | null>(null);

  useEffect(() => {
    setItems(data.items ?? []);
  }, [data.items]);

  useEffect(() => {
    if (wasSelected.current && !selected) {
      setItems((prev) => {
        let end = prev.length;
        while (end > 0 && prev[end - 1].trim() === "") end--;
        const trimmed = prev.slice(0, end);
        if (trimmed.length !== prev.length) data.onItemsChange(trimmed);
        return trimmed;
      });
    }
    wasSelected.current = selected;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  function updateItem(i: number, value: string) {
    setItems((prev) => {
      const next = [...prev];
      next[i] = value;
      if (i === next.length - 1 && value.trim() !== "") {
        next.push("");
      }
      data.onItemsChange(next);
      return next;
    });
  }

  function insertLineAfter(i: number) {
    if (items[i + 1] === "") {
      requestAnimationFrame(() => inputRefs.current[i + 1]?.focus());
      return;
    }
    setItems((prev) => {
      const next = [...prev];
      next.splice(i + 1, 0, "");
      data.onItemsChange(next);
      return next;
    });
    focusIndexRef.current = i + 1;
  }

  useEffect(() => {
    if (focusIndexRef.current !== null) {
      const idx = focusIndexRef.current;
      focusIndexRef.current = null;
      requestAnimationFrame(() => inputRefs.current[idx]?.focus());
    }
  }, [items]);

  const displayItems = items.length === 0 ? [""] : items;

  return (
    <div
      style={{
        minWidth: 220,
        maxWidth: 300,
        background: "var(--surface)",
        border: `1px solid ${selected ? "var(--page)" : "var(--line)"}`,
        borderRadius: 6,
        boxShadow: selected ? "0 0 0 3px var(--page-bg)" : "none",
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
            color: "var(--page)",
            marginBottom: 2,
          }}
        >
          PAGINA
        </div>
        <InlineTitle
          value={data.label}
          placeholder="nombre de la pagina"
          autoFocus={data.autoFocus}
          onChange={data.onLabelChange}
          style={{ fontSize: 13, fontWeight: 600 }}
        />
      </div>

      <div style={{ borderTop: "2px solid var(--ink)" }} />

      <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
        {displayItems.map((it, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                background: "var(--page-bg)",
                color: "var(--page)",
                fontFamily: "var(--mono)",
                fontSize: 9,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <input
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              value={it}
              placeholder={i === displayItems.length - 1 ? "agregar accion..." : ""}
              onChange={(e) => updateItem(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  insertLineAfter(i);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              style={{
                flex: 1,
                fontSize: 12,
                fontFamily: "var(--sans)",
                color: "var(--ink)",
                border: "none",
                borderBottom: "1px solid transparent",
                background: "transparent",
                padding: "2px 0",
                outline: "none",
                minWidth: 0,
              }}
              onFocus={(e) => (e.currentTarget.style.borderBottom = "1px solid var(--page)")}
              onBlur={(e) => (e.currentTarget.style.borderBottom = "1px solid transparent")}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
