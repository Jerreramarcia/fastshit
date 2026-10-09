import { useContext } from "react";
import { LinkRulesContext, linkify } from "../../lib/links";

/**
 * Texto de solo lectura con los tramos que casan con las reglas de la capa convertidos en enlaces.
 * El visor deja los nodos sin eventos de puntero, asi que el enlace los recupera con `pointerEvents`.
 */
export default function LinkedText({ text }: { text: string }) {
  const rules = useContext(LinkRulesContext);
  if (rules.length === 0) return <>{text}</>;
  return (
    <>
      {linkify(text, rules).map((s, i) =>
        s.href ? (
          <a
            key={i}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="nodrag nopan"
            onClick={(e) => e.stopPropagation()}
            style={{ color: "inherit", textDecoration: "underline", pointerEvents: "all" }}
          >
            {s.text}
          </a>
        ) : (
          <span key={i}>{s.text}</span>
        )
      )}
    </>
  );
}
