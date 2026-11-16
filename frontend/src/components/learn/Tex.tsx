import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

export function Tex({ children, block = false }: { children: string; block?: boolean }) {
  const html = useMemo(
    () => katex.renderToString(children, { displayMode: block, throwOnError: false }),
    [children, block]
  );
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
