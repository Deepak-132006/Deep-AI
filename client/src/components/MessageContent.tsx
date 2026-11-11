import { Fragment, useState } from "react";
import { Check, Copy } from "lucide-react";

type Part =
  | { type: "text"; value: string }
  | { type: "code"; lang: string; value: string };

// Splits a message into plain text and ``` fenced code blocks.
// An unclosed fence (still streaming) is rendered as code so it doesn't flicker.
function parse(source: string): Part[] {
  const parts: Part[] = [];
  const fence = /```([\w+#.-]*)[^\S\n]*\n?([\s\S]*?)(?:```|$)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = fence.exec(source)) !== null) {
    if (match.index > last) {
      parts.push({ type: "text", value: source.slice(last, match.index) });
    }
    parts.push({
      type: "code",
      lang: match[1],
      value: match[2].replace(/\n$/, ""),
    });
    last = match.index + match[0].length;
  }

  if (last < source.length) {
    parts.push({ type: "text", value: source.slice(last) });
  }

  return parts;
}

function renderInline(text: string) {
  return text.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/g).map((segment, index) => {
    if (segment.length > 2 && segment.startsWith("`") && segment.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-800"
        >
          {segment.slice(1, -1)}
        </code>
      );
    }

    if (segment.length > 4 && segment.startsWith("**") && segment.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-slate-900">
          {segment.slice(2, -2)}
        </strong>
      );
    }

    return <Fragment key={index}>{segment}</Fragment>;
  });
}

function CodeBlock({ lang, value }: { lang: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0E1220]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-slate-400">
        <span className="font-mono">{lang || "code"}</span>
        <button
          type="button"
          onClick={() => void copy()}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-6 text-slate-100">
        <code>{value}</code>
      </pre>
    </div>
  );
}

export default function MessageContent({ content }: { content: string }) {
  const parts = parse(content);

  return (
    <div className="space-y-3">
      {parts.map((part, index) => {
        if (part.type === "code") {
          return <CodeBlock key={index} lang={part.lang} value={part.value} />;
        }

        const text = part.value.replace(/^\n+|\n+$/g, "");
        if (!text) return null;

        return (
          <p key={index} className="whitespace-pre-wrap break-words">
            {renderInline(text)}
          </p>
        );
      })}
    </div>
  );
}