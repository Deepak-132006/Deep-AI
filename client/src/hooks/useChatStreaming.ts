
import { useCallback, useEffect, useRef, useState } from "react";
import { streamMessage, type Message } from "../services/chatService";

type ChatMode = "chat" | "deep";

interface UseChatStreamingOptions {
  activeId: string;
  busy: boolean;
  message: string;
  mode: ChatMode;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setError: (error: string) => void;
  refreshConversations: () => Promise<unknown>;
  onFinish?: () => void;
  onLoadingChange?: (loading: boolean) => void;
}

export function useChatStreaming({
  activeId,
  busy,
  message,
  mode,
  setMessage,
  setMessages,
  setError,
  refreshConversations,
  onFinish,
  onLoadingChange,
}: UseChatStreamingOptions) {
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const sendMessage = useCallback(async () => {
    const text = message.trim();

    if (!text || !activeId || loading || busy) return;

    const conversationId = activeId;
    const controller = new AbortController();

    abortRef.current = controller;

    setMessage("");
    setError("");
    setLoading(true);
    onLoadingChange?.(true);

    setMessages((current) => [
      ...current,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);

    try {
      await streamMessage(
        text,
        conversationId,
        controller.signal,
        (chunk) => {
          setMessages((current) => {
            const updated = [...current];
            const lastIndex = updated.length - 1;
            const last = updated[lastIndex];

            if (last?.role === "assistant") {
              updated[lastIndex] = {
                ...last,
                content: last.content + chunk,
              };
            }

            return updated;
          });
        },
        mode,
      );

      await refreshConversations();
    } catch (err) {
      const stoppedByUser =
        err instanceof DOMException && err.name === "AbortError";

      if (stoppedByUser) {
        void refreshConversations().catch(() => undefined);
      } else {
        setError(
          `DeepAI couldn't complete your request: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
      }

      setMessages((current) => {
        const updated = [...current];
        const last = updated[updated.length - 1];

        if (last?.role === "assistant" && !last.content) {
          updated.pop();
        }

        return updated;
      });
    } finally {
      abortRef.current = null;
      setLoading(false);
      onLoadingChange?.(false);
      onFinish?.();
    }
  }, [
    message,
    activeId,
    loading,
    busy,
    mode,
    setMessage,
    setMessages,
    setError,
    refreshConversations,
    onFinish,
    onLoadingChange,
  ]);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    loading,
    sendMessage,
    stopGeneration,
  };
}
