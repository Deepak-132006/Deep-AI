
import { useCallback, useEffect, useRef, useState } from "react";

import ChatLayout from "./ChatLayout";

import { useConversations } from "../../hooks/useConversations";
import { useChatMessages } from "../../hooks/useChatMessages";
import { useChatStreaming } from "../../hooks/useChatStreaming";
import { useVoiceInput } from "../../hooks/useVoiceInput";

import { MAX_INPUT_HEIGHT } from "../../constants/chatConstants";

export default function Inputbar() {
  const [message, setMessage] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isOrbWindow = window.location.hash === "#orb";

  // Conversation management
  const {
    conversations,
    activeId,
    setActiveId,
    busy,
    error,
    setError,
    refreshConversations,
    handleNewChat,
    handleDeleteChat,
  } = useConversations({
    isOrbWindow,
    loading: isStreaming,
  });

  // Message management
  const {
    messages,
    setMessages,
    messageError,
  } = useChatMessages({ activeId });

  // Focus the composer after generation
  const focusComposer = useCallback(() => {
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, []);

  // Streaming management
  const {
    loading,
    sendMessage,
    stopGeneration,
  } = useChatStreaming({
    activeId,
    busy,
    message,
    setMessage,
    setMessages,
    setError,
    refreshConversations,
    onFinish: focusComposer,
    onLoadingChange: setIsStreaming,
  });

  // Voice input
  const {
    listening,
    voiceStatus,
    toggleVoice,
  } = useVoiceInput((text) => {
    setMessage((previous) =>
      previous ? `${previous} ${text}` : text,
    );
  });

  // Composer auto-grow
  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;

    element.style.height = "auto";
    element.style.height = `${Math.min(
      element.scrollHeight,
      MAX_INPUT_HEIGHT,
    )}px`;
  }, [message]);

  const canSend =
    Boolean(message.trim()) &&
    Boolean(activeId) &&
    !loading &&
    !busy;

  // Orb window
  const handleOrbClick = () => {
    if (isOrbWindow) {
      void window.deepAI.showChat();
    } else {
      void window.deepAI.showOrb();
    }
  };

  // New conversation
  async function onNewChat() {
    const created = await handleNewChat();

    if (!created) return;

    setMessage("");
    focusComposer();
  }

  // Suggestions
  function handleSuggestion(prompt: string) {
    setMessage(prompt);

    requestAnimationFrame(() => {
      const element = textareaRef.current;
      if (!element) return;

      element.focus();
      element.setSelectionRange(prompt.length, prompt.length);
    });
  }

  return (
    <ChatLayout
      conversations={conversations}
      activeId={activeId}
      setActiveId={setActiveId}
      sidebarCollapsed={sidebarCollapsed}
      setSidebarCollapsed={setSidebarCollapsed}
      messages={messages}
      loading={loading}
      busy={busy}
      error={error || messageError}
      message={message}
      setMessage={setMessage}
      textareaRef={textareaRef}
      listening={listening}
      voiceStatus={voiceStatus}
      canSend={canSend}
      onOrbClick={handleOrbClick}
      onNewChat={() => void onNewChat()}
      onDeleteChat={(id) => void handleDeleteChat(id)}
      onSuggestion={handleSuggestion}
      onToggleVoice={() => void toggleVoice()}
      onSend={() => void sendMessage()}
      onStop={stopGeneration}
    />
  );
}
