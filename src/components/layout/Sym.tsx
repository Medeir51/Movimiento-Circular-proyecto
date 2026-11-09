import { richNodes } from './richNodes';

/** Texto con símbolos físicos escritos como a_c, ω0, F_c… */
export function Rich({ text }: { text: string }) {
  return <>{richNodes(text)}</>;
}

/** Un símbolo físico en cursiva. */
export function Sym({ s }: { s: string }) {
  return <span className="sym">{richNodes(s)}</span>;
}
