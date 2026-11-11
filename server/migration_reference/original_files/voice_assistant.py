import json
import re
import urllib.request
from pathlib import Path

import numpy as np
import sounddevice as sd
from faster_whisper import WhisperModel
from piper import PiperVoice


# Local backend and models
API_URL = "http://127.0.0.1:8000/chat/stream"
PIPER_MODEL = Path("models/piper/en_US-lessac-medium.onnx")

# Microphone settings
SAMPLE_RATE = 16000
MICROPHONE_DEVICE = 1
CHUNK_MS = 100
SILENCE_SECONDS = 1.5
MAX_RECORD_SECONDS = 30
SPEECH_THRESHOLD = 0.003


def load_models():
    print("Loading Whisper...")
    whisper = WhisperModel(
        "base",
        device="cpu",
        compute_type="int8",
    )

    print("Loading Piper...")
    piper = PiperVoice.load(str(PIPER_MODEL))

    return whisper, piper


def record_and_transcribe(whisper):
    print("\nListening... Speak naturally. Pause when finished.")

    chunk_size = int(SAMPLE_RATE * CHUNK_MS / 1000)
    max_chunks = int(MAX_RECORD_SECONDS * 1000 / CHUNK_MS)
    required_silence = int(SILENCE_SECONDS * 1000 / CHUNK_MS)

    audio_chunks = []
    started_speaking = False
    silence_chunks = 0

    try:
        with sd.InputStream(
            samplerate=SAMPLE_RATE,
            channels=1,
            dtype="float32",
            blocksize=chunk_size,
            device=MICROPHONE_DEVICE,
        ) as stream:

            for _ in range(max_chunks):
                audio, overflowed = stream.read(chunk_size)
                audio = np.squeeze(audio).copy()
                audio_chunks.append(audio)

                rms = float(np.sqrt(np.mean(audio ** 2)))

                if rms >= SPEECH_THRESHOLD:
                    started_speaking = True
                    silence_chunks = 0
                elif started_speaking:
                    silence_chunks += 1

                if (
                    started_speaking
                    and silence_chunks >= required_silence
                ):
                    break

    except Exception as error:
        print("Microphone error:", error)
        return ""

    if not started_speaking:
        print("No speech detected. Try speaking a little louder.")
        return ""

    audio_data = np.concatenate(audio_chunks)

    print("Recognizing speech locally...")

    segments, _ = whisper.transcribe(
        audio_data,
        language="en",
        beam_size=5,
        vad_filter=True,
        initial_prompt="DeepAI is the name of my AI voice assistant.",
    )

    message = " ".join(
        segment.text.strip() for segment in segments
    ).strip()

    if message:
        print("You:", message)
    else:
        print("Speech was not recognized.")

    return message


def clean_for_speech(text):
    # Remove code blocks, inline code and URLs.
    text = re.sub(r"```.*?```", " ", text, flags=re.DOTALL)
    text = re.sub(r"`([^`]*)`", r"\1", text)
    text = re.sub(r"https?://\S+", " link ", text)

    # Remove exclamation marks and formatting symbols.
    text = re.sub(r"[!！]+", " ", text)
    text = re.sub(r"[*_#~]", "", text)

    # Keep ordinary punctuation for natural speech.
    text = re.sub(r"""[^\w\s.,?;:'"()/-]""", "", text)
    text = re.sub(r"\s+", " ", text).strip()

    return text


def speak_sentence(piper, sentence):
    sentence = clean_for_speech(sentence)

    if not sentence:
        return

    with sd.RawOutputStream(
        samplerate=piper.config.sample_rate,
        channels=1,
        dtype="int16",
    ) as output:

        for chunk in piper.synthesize(sentence):
            output.write(chunk.audio_int16_bytes)


def extract_sentences(buffer, final=False):
    parts = re.split(r"(?<=[.!?])\s+", buffer.strip())

    if final:
        return [part for part in parts if part], ""

    if len(parts) == 1:
        return [], buffer

    return [part for part in parts[:-1] if part], parts[-1]


def ask_deepai(whisper, piper, message):
    payload = json.dumps({"message": message}).encode("utf-8")

    request = urllib.request.Request(
        API_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    buffer = ""
    print("\nDeepAI: ", end="", flush=True)

    try:
        with urllib.request.urlopen(request, timeout=300) as response:
            for raw_line in response:
                line = raw_line.decode("utf-8").strip()

                if not line.startswith("data: "):
                    continue

                data = line[6:]

                if data == "[DONE]":
                    break

                event = json.loads(data)

                if "error" in event:
                    print("\nBackend error:", event["error"])
                    return

                text = event.get("text", "")

                if not text:
                    continue

                print(text, end="", flush=True)
                buffer += text

                sentences, buffer = extract_sentences(buffer)

                for sentence in sentences:
                    speak_sentence(piper, sentence)

        remaining, _ = extract_sentences(buffer, final=True)

        for sentence in remaining:
            speak_sentence(piper, sentence)

        print("\n")

    except Exception as error:
        print("\nCould not reach DeepAI backend:", error)


def main():
    if not PIPER_MODEL.exists():
        print("Piper model not found:", PIPER_MODEL)
        return

    whisper, piper = load_models()

    print("\nDeepAI Voice Assistant ready.")
    print("Speak naturally; pause to submit your message.")
    print("Say 'exit' or 'quit' to stop.")

    try:
        while True:
            message = record_and_transcribe(whisper)

            if not message:
                continue

            if message.lower().strip(" .!?") in {
                "exit", "quit", "stop"
            }:
                print("DeepAI stopped.")
                break

            ask_deepai(whisper, piper, message)

    except KeyboardInterrupt:
        print("\nDeepAI stopped.")


if __name__ == "__main__":
    main()
