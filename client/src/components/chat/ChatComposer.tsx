import type { FormEvent, KeyboardEvent, RefObject } from "react";
import { ArrowUp, LoaderCircle, Mic, Plus, Square } from "lucide-react";
import ChatFooter from "./ChatFooter.tsx";

interface ChatComposerProps {
  message: string;
  setMessage: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement>;
  voiceStatus: string;
  listening: boolean;
  loading: boolean;
  busy: boolean;
  canSend: boolean;
  activeId: string;
  onToggleVoice: () => void;
  onSend: () => void;
  onStop: () => void;
}

export default function ChatComposer({
  message,
  setMessage,
  textareaRef,
  voiceStatus,
  listening,
  loading,
  busy,
  canSend,
  activeId,
  onToggleVoice,
  onSend,
  onStop,
}: ChatComposerProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSend();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      onSend();
    }
  }

  return (
    <footer className="shrink-0 px-4 pb-4 pt-2">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-3xl items-end gap-1.5 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_1px_2px_rgba(15,18,32,0.04),0_8px_24px_-12px_rgba(15,18,32,0.12)] transition focus-within:border-[#3B5BDB]/60 focus-within:ring-4 focus-within:ring-[#3B5BDB]/10"
      >
        <button
          type="button"
          disabled
          aria-label="Add attachment"
          title="Attachments are coming soon"
          className="mb-0.5 rounded-full p-2 text-slate-400 disabled:cursor-not-allowed"
        >
          <Plus size={20} />
        </button>

        <textarea
          ref={textareaRef}
          value={message}
          rows={1}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          readOnly={busy || !activeId}
          placeholder="Message DeepAI"
          aria-label="Message DeepAI"
          className="max-h-48 min-w-0 flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] leading-6 text-slate-900 outline-none placeholder:text-slate-400 read-only:opacity-60"
        />

        {voiceStatus && (
          <p className="mb-3 text-xs text-gray-500" role="status">
            {voiceStatus}
          </p>
        )}

        <button
          type="button"
          onClick={onToggleVoice}
          title={listening ? "Stop voice input" : "Start voice input"}
          aria-label={listening ? "Stop voice input" : "Start voice input"}
          className={`rounded-full p-2 transition ${
            listening
              ? "bg-red-500 text-white"
              : "text-gray-500 hover:bg-gray-200"
          }`}
        >
          <Mic size={20} />
        </button>

        {loading ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            title="Stop generating"
            className="rounded-xl bg-slate-900 p-2.5 text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/40"
          >
            <Square size={18} fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            title="Send (Enter)"
            className="rounded-xl bg-[#3B5BDB] p-2.5 text-white transition hover:bg-[#2F4BC0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B5BDB]/50 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {busy ? (
              <LoaderCircle size={18} className="animate-spin" />
            ) : (
              <ArrowUp size={18} strokeWidth={2.5} />
            )}
          </button>
        )}
      </form>

      <ChatFooter />
    </footer>
  );
}

