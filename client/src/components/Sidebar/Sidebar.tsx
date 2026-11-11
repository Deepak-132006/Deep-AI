import { useEffect, useState } from "react";
import {
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import type { Conversation } from "../../services/chatService";

type SidebarProps = {
  conversations: Conversation[];
  activeId: string;
  collapsed: boolean;
  busy: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
};

// Works whether or not your Conversation type declares `title`.
const titleOf = (conversation: Conversation) =>
  (conversation as { title?: string }).title?.trim() || "New chat";

const iconButton =
  "rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B5BDB]/40 disabled:cursor-not-allowed disabled:opacity-40";

export default function Sidebar({
  conversations,
  activeId,
  collapsed,
  busy,
  onToggle,
  onNewChat,
  onSelect,
  onDelete,
}: SidebarProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Drop the confirmation if the sidebar collapses.
  useEffect(() => {
    if (collapsed) setConfirmId(null);
  }, [collapsed]);

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-slate-200 bg-white text-slate-600 transition-[width] duration-200 ease-out ${
        collapsed ? "w-14" : "w-72"
      }`}
      aria-label="Conversations"
    >
      {collapsed ? (
        <div className="flex flex-col items-center gap-1 px-2 py-3">
          <div>
            <img src="/logo.png" alt="" className="w-5"/>
          </div>
          <button
            type="button"
            onClick={onToggle}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className={iconButton}
          >
            <PanelLeftOpen size={19} />
          </button>
          <button
            type="button"
            onClick={onNewChat}
            disabled={busy}
            aria-label="New chat"
            title="New chat"
            className={iconButton}
          >
            <SquarePen size={19} />
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-1 px-4 mt-5 items-center ">
            <p className="font-medium text-black text-xl text-center font-inter">
              Deep AI
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-3">
            <button
              type="button"
              onClick={onNewChat}
              disabled={busy}
              className="flex h-10 flex-1 items-center  gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-[0_1px_2px_rgba(15,18,32,0.04)] transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B5BDB]/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SquarePen size={17} className="text-[#00000]" />
              New chat
            </button>
            <button
              type="button"
              onClick={onToggle}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className={iconButton}
            >
              <PanelLeftClose size={19} />
            </button>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            {conversations.length === 0 ? (
              <p className="px-3 py-6 text-sm text-slate-400">
                No chats yet. Start one with New chat.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {conversations.map((conversation) => {
                  const active = conversation.id === activeId;
                  const confirming = confirmId === conversation.id;

                  return (
                    <li key={conversation.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => onSelect(conversation.id)}
                        disabled={busy && !active}
                        aria-current={active ? "true" : undefined}
                        className={`flex w-full items-center rounded-lg py-2 pl-3 pr-16 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B5BDB]/40 disabled:cursor-not-allowed disabled:opacity-50 ${
                          active
                            ? "bg-slate-100 font-medium text-slate-900"
                            : "hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <span className="truncate">
                          {titleOf(conversation)}
                        </span>
                      </button>

                      <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
                        {confirming ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmId(null);
                                onDelete(conversation.id);
                              }}
                              aria-label="Confirm delete"
                              title="Delete chat"
                              className="rounded-md p-1.5 text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmId(null)}
                              aria-label="Cancel delete"
                              title="Cancel"
                              className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B5BDB]/40"
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmId(conversation.id)}
                            disabled={busy}
                            aria-label={`Delete ${titleOf(conversation)}`}
                            title="Delete chat"
                            className="rounded-md p-1.5 text-slate-400 opacity-0 transition hover:bg-slate-200/70 hover:text-red-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B5BDB]/40 group-focus-within:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </nav>
        </>
      )}
    </aside>
  );
}
