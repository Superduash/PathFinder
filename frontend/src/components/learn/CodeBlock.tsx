import React, { useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp, Code2 } from "lucide-react";
import { toast } from "sonner";
import gridBasicsSrc from "@/content/snippets/grid_basics.py?raw";

interface CodeBlockProps {
  code: string;
  filename: string;
  whatChanged?: string;
  showHelpers?: boolean;
}

const KEYWORDS = new Set([
  "def", "return", "if", "else", "elif", "while", "for", "in", "not", "is",
  "None", "True", "False", "import", "from", "yield", "continue", "break",
  "pass", "try", "except", "class", "as"
]);

const BUILTINS = new Set([
  "abs", "min", "max", "sum", "len", "range", "list", "set", "dict",
  "deque", "heapq", "float", "int", "print", "heappop", "heappush", "append",
  "pop", "popleft"
]);

function highlightLine(line: string): React.ReactNode {
  // If line has a comment
  const commentIdx = line.indexOf("#");
  let codePart = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
  const commentPart = commentIdx >= 0 ? line.slice(commentIdx) : "";

  // Tokenize codePart by words, strings, symbols
  const tokenRegex = /("[^"]*"|'[^']*'|\b[a-zA-Z_]\w*\b|\d+\.?\d*|[^\s\w"']+)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(codePart)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(codePart.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('"') || token.startsWith("'")) {
      nodes.push(<span key={match.index} className="text-amber-400">{token}</span>);
    } else if (KEYWORDS.has(token)) {
      nodes.push(<span key={match.index} className="text-purple-400 font-semibold">{token}</span>);
    } else if (BUILTINS.has(token)) {
      nodes.push(<span key={match.index} className="text-sky-400">{token}</span>);
    } else if (/^\d+\.?\d*$/.test(token)) {
      nodes.push(<span key={match.index} className="text-emerald-400">{token}</span>);
    } else {
      nodes.push(token);
    }
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < codePart.length) {
    nodes.push(codePart.slice(lastIndex));
  }

  if (commentPart) {
    nodes.push(<span key="comment" className="text-muted/80 italic">{commentPart}</span>);
  }

  return nodes;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  filename,
  whatChanged,
  showHelpers = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [helpersOpen, setHelpersOpen] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.trim().split("\n");

  return (
    <div className="space-y-4">
      {whatChanged && (
        <div className="p-3.5 rounded-xl bg-surface-2 border border-border text-sm">
          <span className="font-semibold text-brand mr-1.5">What changed vs BFS:</span>
          <span className="text-muted">{whatChanged}</span>
        </div>
      )}

      {/* Main Snippet Container */}
      <div className="rounded-2xl border border-border bg-[#0d1117] overflow-hidden text-sm shadow-xl">
        <div className="px-4 py-2.5 bg-[#161b22] border-b border-border flex items-center justify-between text-xs text-muted">
          <div className="flex items-center gap-2 font-mono">
            <Code2 className="w-4 h-4 text-brand" />
            <span className="text-text font-semibold">{filename}</span>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(code)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border hover:bg-surface-2 text-text transition-colors"
            aria-label="Copy code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>

        <pre className="p-4 overflow-x-auto font-mono text-[13px] leading-relaxed text-gray-200">
          <code>
            {lines.map((line, idx) => (
              <div key={idx} className="table-row">
                <span className="table-cell pr-4 text-right select-none text-gray-500 font-mono w-8 text-xs">
                  {idx + 1}
                </span>
                <span className="table-cell whitespace-pre">{highlightLine(line)}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>

      {/* Collapsible Helper Functions */}
      {showHelpers && filename !== "grid_basics.py" && (
        <div className="border border-border rounded-xl bg-surface overflow-hidden">
          <button
            type="button"
            onClick={() => setHelpersOpen(!helpersOpen)}
            className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-text hover:bg-surface-2 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-muted text-xs font-mono">Shared helpers:</span>
              <span>grid_basics.py</span>
            </div>
            {helpersOpen ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
          </button>

          {helpersOpen && (
            <div className="p-4 border-t border-border bg-[#0d1117] text-sm overflow-x-auto">
              <pre className="font-mono text-[13px] leading-relaxed text-gray-200">
                <code>
                  {gridBasicsSrc.trim().split("\n").map((line, idx) => (
                    <div key={idx} className="table-row">
                      <span className="table-cell pr-4 text-right select-none text-gray-500 font-mono w-8 text-xs">
                        {idx + 1}
                      </span>
                      <span className="table-cell whitespace-pre">{highlightLine(line)}</span>
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
