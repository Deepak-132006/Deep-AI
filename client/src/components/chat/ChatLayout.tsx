
import type {
  Dispatch,
  RefObject,
  SetStateAction,
} from "react";
import Sidebar from "../Sidebar/Sidebar";
import ChatHistory from "../ChatHistory";

import ChatHeader from "./ChatHeader";
import ChatComposer from "./ChatComposer";

import type { Conversation, Message } from "../../services/chatService";

interface ChatLayoutProps {
  conversations: Conversation[];
  activeId: string;
  setActiveId: (id: string) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: Dispatch<SetStateAction<boolean>>;

  messages: Message[];
  loading: boolean;
  busy: boolean;
  error: string;

  message: string;
  setMessage: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;

  listening: boolean;
  voiceStatus: string;
  canSend: boolean;

  onOrbClick: () => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onSuggestion: (prompt: string) => void;
  onToggleVoice: () => void;
  onSend: () => void;
  onStop: () => void;
}

export default function ChatLayout({
  conversations,
  activeId,
  setActiveId,
  sidebarCollapsed,
  setSidebarCollapsed,
  messages,
  loading,
  busy,
  error,
  message,
  setMessage,
  textareaRef,
  listening,
  voiceStatus,
  canSend,
  onOrbClick,
  onNewChat,
  onDeleteChat,
  onSuggestion,
  onToggleVoice,
  onSend,
  onStop,
}: ChatLayoutProps) {
  return (
    <main className="flex h-screen overflow-hidden bg-[#F7F8FA] text-slate-900 antialiased">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        collapsed={sidebarCollapsed}
        busy={loading || busy}
        onToggle={() => setSidebarCollapsed((value) => !value)}
        onNewChat={onNewChat}
        onSelect={(id) => {
          if (!loading && !busy) setActiveId(id);
        }}
        onDelete={onDeleteChat}
      />

      <section className="flex min-w-0 flex-1 flex-col bg-white">
        <ChatHeader onOrbClick={onOrbClick} />

        <ChatHistory
          messages={messages}
          loading={loading}
          error={error}
          onSuggestion={onSuggestion}
        />

        <ChatComposer
          message={message}
          setMessage={setMessage}
          textareaRef={textareaRef}
          voiceStatus={voiceStatus}
          listening={listening}
          loading={loading}
          busy={busy}
          canSend={canSend}
          activeId={activeId}
          onToggleVoice={onToggleVoice}
          onSend={onSend}
          onStop={onStop}
        />
      </section>
    </main>
  );
}
