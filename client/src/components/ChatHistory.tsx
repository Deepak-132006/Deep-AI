import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  CalendarCheck,
  Check,
  Code2,
  Copy,
  FileText,
  Lightbulb,
} from "lucide-react";
import type { Message } from "../services/chatService";
import MessageContent from "./MessageContent";

type ChatHistoryProps = {
  messages: Message[];
  loading: boolean;
  error: string;
  onSuggestion?: (prompt: string) => void;
};

const SUGGESTIONS = [
  {
    icon: Lightbulb,
    label: "Explain a concept",
    prompt: "Explain how JWT authentication works, step by step.",
  },
  {
    icon: Code2,
    label: "Review code",
    prompt: "Review this function and point out bugs or improvements:\n\n",
  },
  {
    icon: FileText,
    label: "Summarise notes",
    prompt: "Summarise these notes into key points:\n\n",
  },
  {
    icon: CalendarCheck,
    label: "Plan my week",
    prompt: "Help me plan a study schedule for this week.",
  },
];

function CopyMessageButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label="Copy response"
      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B5BDB]/40 group-focus-within:opacity-100 group-hover:opacity-100"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function TypingDots() {
  return (
    <div className="flex h-7 items-center gap-1" aria-label="DeepAI is thinking">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

export default function ChatHistory({
  messages,
  loading,
  error,
  onSuggestion,
}: ChatHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const scrollToBottom = (smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stickRef.current = nearBottom;
    setShowJump(!nearBottom);
  };

  // A message was added or a chat was loaded: go to the bottom.
  useEffect(() => {
    stickRef.current = true;
    scrollToBottom();
  }, [messages.length]);

  // Streaming text or a new error: follow only if the reader is at the bottom.
  useEffect(() => {
    if (stickRef.current) scrollToBottom();
  }, [messages, loading, error]);

  const lastIndex = messages.length - 1;

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        className="h-full overflow-y-auto"
      >
        <div className="mx-auto w-full max-w-3xl px-4 py-8">
          {messages.length === 0 && !error && (
            <div className="pt-[10vh]">
              <img
                src="/logo.png"
                alt=""
                className="mb-5 h-11 w-11 object-contain"
              />
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                What can I help you with?
              </h1>
              <p className="mt-1.5 text-[15px] text-slate-500">
                Ask a question, paste some code, or pick a starting point.
              </p>

              <div className="mt-8 grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map(({ icon: Icon, label, prompt }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => onSuggestion?.(prompt)}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B5BDB]/40"
                  >
                    <Icon size={18} className="shrink-0 text-[#3B5BDB]" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-7">
            {messages.map((message, index) => {
              if (message.role === "user") {
                return (
                  <div key={index} className="flex justify-end">
                    <div className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-slate-100 px-4 py-2.5 text-[15px] leading-6 text-slate-900">
                      {message.content}
                    </div>
                  </div>
                );
              }

              const streaming = loading && index === lastIndex;

              return (
                <div key={index} className="group flex gap-3">
                  <img
                    src="/logo.png"
                    alt=""
                    className="mt-0.5 h-7 w-7 shrink-0 object-contain"
                  />

                  <div className="min-w-0 flex-1 text-[15px] leading-7 text-slate-800">
                    {message.content ? (
                      <>
                        <MessageContent content={message.content} />
                        {streaming && (
                          <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-slate-400 align-middle" />
                        )}
                      </>
                    ) : streaming ? (
                      <TypingDots />
                    ) : null}

                    {message.content && !streaming && (
                      <div className="-ml-2 mt-1">
                        <CopyMessageButton text={message.content} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>

      {showJump && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          aria-label="Scroll to latest message"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-md transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B5BDB]/40"
        >
          <ArrowDown size={18} />
        </button>
      )}
    </div>
  );
}