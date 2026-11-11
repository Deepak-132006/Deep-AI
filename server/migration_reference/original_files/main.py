import json
import urllib.request

OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL = "qwen3.5:9b"


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


if __name__ == "__main__":
    while True:
        prompt = input("You: ")
        if prompt == "exit":
            break
        answer = ask_ai(prompt=prompt)
        print(f"\nDeepAI: {answer}")
