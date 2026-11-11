
import { Bot, User } from "lucide-react";
import type { Message } from "../services/chatService";

type Props = {
  message: Message;
  streaming?: boolean;
};

export default function ChatMessage({ message, streaming }: Props) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex gap-3 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
          <Bot size={18} />
        </div>
      )}

      <div
        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 leading-7 ${
          isUser
            ? "bg-gray-900 text-white"
            : "bg-gray-100 text-gray-800"
        }`}
      >
        {message.content || (streaming ? "Thinking..." : "")}
      </div>

      {isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
          <User size={18} />
        </div>
      )}
    </div>
  );
}
