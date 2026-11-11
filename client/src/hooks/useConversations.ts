import { useCallback, useEffect, useState } from "react";

import {
  createConversation,
  deleteConversation,
  loadConversations,
  loadMessages,
  type Conversation,
} from "../services/chatService";

import { ACTIVE_CONVERSATION_KEY } from "../constants/chatConstants";

interface UseConversationsOptions {
  isOrbWindow: boolean;
  loading: boolean;
}

export function useConversations({
  isOrbWindow,
  loading,
}: UseConversationsOptions) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");

  // Load conversations when the application starts.
  useEffect(() => {
    if (isOrbWindow) return;

    let active = true;

    async function initialize() {
      try {
        let items = await loadConversations();

        // Create the first conversation if none exists.
        if (items.length === 0) {
          await createConversation();
          items = await loadConversations();
        }

        if (!active) return;

        setOffline(false);
        setConversations(items);

        const savedId = localStorage.getItem(ACTIVE_CONVERSATION_KEY);

        const selectedId = items.some((item) => item.id === savedId)
          ? savedId!
          : (items[0]?.id ?? "");

        setActiveId(selectedId);
      } catch {
        if (active) {
          setOffline(true);
          setError(
            "Couldn't connect to DeepAI. Check that FastAPI and Ollama are running.",
          );
        }
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [isOrbWindow]);

  // Persist the currently selected conversation.
  useEffect(() => {
    if (activeId) {
      localStorage.setItem(ACTIVE_CONVERSATION_KEY, activeId);
    }
  }, [activeId]);

  // Refresh conversation list.
  const refreshConversations = useCallback(async () => {
    const items = await loadConversations();

    setConversations(items);
    return items;
  }, []);

  // Create a new conversation.
  const handleNewChat = useCallback(async () => {
    if (loading || busy) return;

    setBusy(true);
    setError("");

    try {
      const conversation = await createConversation();
      const items = await refreshConversations();

      setActiveId(
        items.some((item) => item.id === conversation.id)
          ? conversation.id
          : (items[0]?.id ?? ""),
      );

      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't create a new chat.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }, [loading, busy, refreshConversations]);

  // Delete a conversation.
  const handleDeleteChat = useCallback(
    async (id: string) => {
      if (loading || busy) return;

      const deletedWasActive = id === activeId;

      setBusy(true);
      setError("");

      try {
        await deleteConversation(id);

        const items = await refreshConversations();

        if (deletedWasActive) {
          setActiveId(items[0]?.id ?? "");
        }

        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Couldn't delete this chat.",
        );
        return false;
      } finally {
        setBusy(false);
      }
    },
    [loading, busy, activeId, refreshConversations],
  );

  // Refresh conversations when the application regains focus.
  useEffect(() => {
    if (isOrbWindow) return;

    let active = true;
    let refreshing = false;

    async function refreshChat() {
      if (
        document.visibilityState !== "visible" ||
        refreshing ||
        loading ||
        busy
      ) {
        return;
      }

      refreshing = true;

      try {
        const items = await loadConversations();

        if (!active) return;

        setConversations(items);

        const selectedId = items.some((item) => item.id === activeId)
          ? activeId
          : (items[0]?.id ?? "");

        if (selectedId !== activeId) {
          setActiveId(selectedId);
        }

        if (selectedId) {
          const history = await loadMessages(selectedId);

          if (active) {
            window.dispatchEvent(
              new CustomEvent("deepai:messages-refreshed", {
                detail: {
                  conversationId: selectedId,
                  history,
                },
              }),
            );
          }
        }

        if (active) {
          setOffline(false);
          setError("");
        }
      } catch {
        if (active) {
          setError("Couldn't refresh your conversation.");
        }
      } finally {
        refreshing = false;
      }
    }

    window.addEventListener("focus", refreshChat);
    document.addEventListener("visibilitychange", refreshChat);

    return () => {
      active = false;
      window.removeEventListener("focus", refreshChat);
      document.removeEventListener("visibilitychange", refreshChat);
    };
  }, [isOrbWindow, activeId, loading, busy]);

  return {
    conversations,
    activeId,
    setActiveId,
    busy,
    offline,
    error,
    setError,
    refreshConversations,
    handleNewChat,
    handleDeleteChat,
  };
}
