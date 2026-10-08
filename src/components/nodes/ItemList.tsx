import { useEffect, useRef, useState } from "react";

interface Props {
  items: string[];
  placeholder: string;
  color: string;
  bg: string;
  /** Se dispara con la lista completa en cada tecla; el padre decide si hace debounce. */
  onChange: (items: string[]) => void;
  /** Al deseleccionar el nodo se limpian las lineas vacias del final. */
  selected: boolean;
  readOnly?: boolean;
}

/**
 * Lista de lineas editables dentro de un nodo. La usan la Pagina (acciones de la
 * pantalla) y los nodos de estado (detalle de donde se detecto el error, que se
 * probo, como se arreglo).
 */
export default function ItemList({ items, placeholder, color, bg, onChange, selected, readOnly }: Props) {
  const [draft, setDraft] = useState<string[]>(items ?? []);
  const wasSelected = useRef(selected);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const focusIndexRef = useRef<number | null>(null);

  useEffect(() => {
    setDraft(items ?? []);
  }, [items]);

  useEffect(() => {
    if (wasSelected.current && !selected) {
      setDraft((prev) => {
        let end = prev.length;
        while (end > 0 && prev[end - 1].trim() === "") end--;
        const trimmed = prev.slice(0, end);
        if (trimmed.length !== prev.length) onChange(trimmed);
        return trimmed;
      });
    }
    wasSelected.current = selected;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useEffect(() => {
    if (focusIndexRef.current !== null) {
      const idx = focusIndexRef.current;
      focusIndexRef.current = null;
      requestAnimationFrame(() => inputRefs.current[idx]?.focus());
    }
  }, [draft]);

  function updateItem(i: number, value: string) {
    setDraft((prev) => {
      const next = [...prev];
      next[i] = value;
      if (i === next.length - 1 && value.trim() !== "") next.push("");
      onChange(next);
      return next;
    });
  }

  function insertLineAfter(i: number) {
    if (draft[i + 1] === "") {
      requestAnimationFrame(() => inputRefs.current[i + 1]?.focus());
      return;
    }
    setDraft((prev) => {
      const next = [...prev];
      next.splice(i + 1, 0, "");
      onChange(next);
      return next;
    });
    focusIndexRef.current = i + 1;
  }

  const visible = readOnly ? draft.filter((it) => it.trim() !== "") : draft.length === 0 ? [""] : draft;
  if (readOnly && visible.length === 0) return null;

  return (
    <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
      {visible.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              background: bg,
              color,
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
          {readOnly ? (
            <span style={{ flex: 1, fontSize: 12, color: "var(--ink)", minWidth: 0 }}>{it}</span>
          ) : (
            <input
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              value={it}
              placeholder={i === visible.length - 1 ? placeholder : ""}
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
              onFocus={(e) => (e.currentTarget.style.borderBottom = `1px solid ${color}`)}
              onBlur={(e) => (e.currentTarget.style.borderBottom = "1px solid transparent")}
            />
          )}
        </div>
      ))}
    </div>
  );
}
