import { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  placeholder: string;
  autoFocus?: boolean;
  readOnly?: boolean;
  onChange: (value: string) => void;
  style?: React.CSSProperties;
}

export default function InlineTitle({ value, placeholder, autoFocus, readOnly, onChange, style }: Props) {
  const [editing, setEditing] = useState(!readOnly && !!autoFocus);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      ref.current?.focus();
      ref.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function commit() {
    onChange(draft.trim());
    setEditing(false);
  }

  if (readOnly) {
    return (
      <div style={{ color: value ? "var(--ink)" : "var(--ink-soft)", ...style }}>{value || placeholder}</div>
    );
  }

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        style={{
          fontFamily: "inherit",
          fontSize: "inherit",
          fontWeight: "inherit",
          color: "var(--ink)",
          border: "none",
          borderBottom: "1px solid var(--action)",
          background: "transparent",
          padding: 0,
          outline: "none",
          width: "100%",
          ...style,
        }}
      />
    );
  }

  return (
    <div
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      style={{ cursor: "text", color: value ? "var(--ink)" : "var(--ink-soft)", ...style }}
      title="Doble click para editar"
    >
      {value || placeholder}
    </div>
  );
}
