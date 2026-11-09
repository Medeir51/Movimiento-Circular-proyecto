import type { ReactNode } from 'react';

/** «a_c» → a con subíndice c; «ω0» → ω con subíndice 0. */
const SUB_RE = /(\p{L})_([\p{L}\p{N}]+)|([ωθ])0(?!\p{N})/gu;

export function richNodes(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(SUB_RE)) {
    const index = m.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    if (m[1]) {
      nodes.push(
        <span className="sym" key={key++}>
          {m[1]}
          <sub>{m[2]}</sub>
        </span>,
      );
    } else {
      nodes.push(
        <span className="sym" key={key++}>
          {m[3]}
          <sub>0</sub>
        </span>,
      );
    }
    last = index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
