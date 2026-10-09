import { createContext } from "react";
import type { LinkRule } from "./graphTypes";

/** Reglas de enlace de la capa visible. Solo el visor las provee: en el editor el texto sigue siendo plano. */
export const LinkRulesContext = createContext<LinkRule[]>([]);

export interface Segment {
  text: string;
  href?: string;
}

/**
 * Parte el texto en tramos y enlaza los que casan con alguna regla (gana la coincidencia mas a la izquierda).
 * Solo se aceptan destinos http(s): el gist lo escribe cualquiera con token y no debe colar un `javascript:`.
 */
export function linkify(text: string, rules: LinkRule[]): Segment[] {
  const compiled = rules.flatMap((r) => {
    try {
      return [{ re: new RegExp(r.pattern, "g"), url: r.url }];
    } catch {
      return [];
    }
  });
  const segments: Segment[] = [];
  let pos = 0;
  while (pos < text.length) {
    let best: { match: RegExpExecArray; url: string } | null = null;
    for (const c of compiled) {
      c.re.lastIndex = pos;
      const m = c.re.exec(text);
      if (m && m[0] !== "" && (!best || m.index < best.match.index)) best = { match: m, url: c.url };
    }
    if (!best) break;
    const { match, url } = best;
    const href = url.replace(/\$(\d)/g, (_, i: string) => encodeURIComponent(match[Number(i)] ?? ""));
    if (match.index > pos) segments.push({ text: text.slice(pos, match.index) });
    segments.push(/^https?:\/\//i.test(href) ? { text: match[0], href } : { text: match[0] });
    pos = match.index + match[0].length;
  }
  if (pos < text.length) segments.push({ text: text.slice(pos) });
  return segments;
}
