"""Optional minimal CLI that talks directly to Ollama, bypassing DeepAI's API."""
import json
import os
import urllib.request

OLLAMA_URL = os.getenv("OLLAMA_CHAT_URL", "http://127.0.0.1:11434/api/chat")
MODEL = os.getenv("DEEPAI_MODEL", "qwen3.5:9b")


def ask_ai(prompt: str) -> str:
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "think": False,
        "stream": False,
    }
    request = urllib.request.Request(
        OLLAMA_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=180) as response:
        result = json.loads(response.read().decode("utf-8"))
    return result["message"]["content"]


def main():
    while True:
        prompt = input("You: ").strip()
        if prompt.lower() in {"exit", "quit"}:
            break
        if not prompt:
            continue
        print(f"\nDeepAI: {ask_ai(prompt)}\n")


if __name__ == "__main__":
    main()
