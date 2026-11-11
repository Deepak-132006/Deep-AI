
import { useEffect, useState } from "react";
import {
  loadMessages,
  type Message,
} from "../services/chatService";

interface UseChatMessagesOptions {
  activeId: string;
}

interface MessagesRefreshedDetail {
  conversationId: string;
  history: Message[];
}

export function useChatMessages({ activeId }: UseChatMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageError, setMessageError] = useState("");

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      setMessageError("");
      return;
    }

    let active = true;

    setMessages([]);
    setMessageError("");

    async function fetchMessages() {
      try {
        const history = await loadMessages(activeId);

        if (active) {
          setMessages(history);
        }
      } catch {
        if (active) {
          setMessageError("Couldn't load this conversation.");
        }
      }
    }

    void fetchMessages();

    // Receive message updates from useConversations.
    const handleRefresh = (event: Event) => {
      const customEvent =
        event as CustomEvent<MessagesRefreshedDetail>;

      if (customEvent.detail.conversationId === activeId) {
        setMessages(customEvent.detail.history);
        setMessageError("");
      }
    };

    window.addEventListener(
      "deepai:messages-refreshed",
      handleRefresh,
    );

    return () => {
      active = false;

      window.removeEventListener(
        "deepai:messages-refreshed",
        handleRefresh,
      );
    };
  }, [activeId]);

  return {
    messages,
    setMessages,
    messageError,
  };
}
