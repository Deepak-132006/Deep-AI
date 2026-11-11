
import { Plus } from "lucide-react";

type Props = {
  onNewChat: () => void;
  disabled?: boolean;
};

export default function NewChatButton({
  onNewChat,
  disabled = false,
}: Props) {
  return (
    <button
      type="button"
      onClick={onNewChat}
      disabled={disabled}
      className="flex w-full items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Plus size={18} />
      New chat
    </button>
  );
}
