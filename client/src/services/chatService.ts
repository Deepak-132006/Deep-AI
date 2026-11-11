const API_URL = "http://127.0.0.1:8000";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export async function loadConversations(): Promise<Conversation[]> {
  const response = await fetch(`${API_URL}/conversations`);
  if (!response.ok) throw new Error("Could not load conversations");

  const data = await response.json();
  return data.conversations ?? [];
}

export async function createConversation(): Promise<Conversation> {
  const response = await fetch(`${API_URL}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "New chat" }),
  });

  if (!response.ok) throw new Error("Could not create a new chat");

  const data = await response.json();
  return data.conversation;
}

export async function loadMessages(conversationId: string): Promise<Message[]> {
  const response = await fetch(
    `${API_URL}/conversations/${encodeURIComponent(conversationId)}/messages`,
  );

  if (!response.ok) throw new Error("Could not load this conversation");

  const data = await response.json();
  return data.messages ?? [];
}

export async function removeConversation(
  conversationId: string,
): Promise<void> {
  const response = await fetch(
    `${API_URL}/conversations/${encodeURIComponent(conversationId)}`,
    { method: "DELETE" },
  );

  if (!response.ok) throw new Error("Could not delete this conversation");
}

export async function streamMessage(
  message: string,
  conversationId: string,
  signal: AbortSignal,
  onChunk: (text: string) => void,
  mode: "chat" | "deep" = "chat",
): Promise<void> {
  const response = await fetch(`${API_URL}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
      mode,
    }),
    signal,
  });

  // Keep your existing code below this point:
  // response.ok check, reader, decoder, processEvent(),
  // and the streaming loop.

  if (!response.ok) {
    throw new Error(`Backend returned HTTP ${response.status}`);
  }

  if (!response.body) throw new Error("Streaming is not supported");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;

  function processEvent(event: string): boolean {
    const dataLine = event.split("\n").find((line) => line.startsWith("data:"));

    if (!dataLine) return false;

    const data = dataLine.slice(5).trim();

    if (data === "[DONE]") return true;

    const parsed = JSON.parse(data);

    if (parsed.error) throw new Error(parsed.error);

    if (typeof parsed.text === "string") onChunk(parsed.text);

    return false;
  }

  while (!finished) {
    const { value, done } = await reader.read();

    buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });

    buffer = buffer.replace(/\r\n/g, "\n");

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      if (processEvent(event)) {
        finished = true;
        break;
      }
    }

    if (done) {
      if (!finished && buffer.trim()) {
        finished = processEvent(buffer);
      }
      break;
    }
  }

  if (!finished) {
    throw new Error("The AI stream ended unexpectedly");
  }
}

// Clear messages from one conversation without deleting the conversation.
export async function clearHistory(conversationId: string): Promise<void> {
  const response = await fetch(
    `${API_URL}/history?conversation_id=${encodeURIComponent(conversationId)}`,
    { method: "DELETE" },
  );

  if (!response.ok) {
    throw new Error(`Failed to clear history: ${response.status}`);
  }
}

// Delete one conversation.
export async function deleteConversation(
  conversationId: string,
): Promise<void> {
  const response = await fetch(
    `${API_URL}/conversations/${encodeURIComponent(conversationId)}`,
    { method: "DELETE" },
  );

  if (!response.ok) {
    throw new Error(`Failed to delete conversation: ${response.status}`);
  }
}
