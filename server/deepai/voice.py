
"""Local speech recognition and synthesis for DeepAI."""

from functools import lru_cache
from io import BytesIO
from pathlib import Path
import tempfile
import wave

from faster_whisper import WhisperModel
from piper import PiperVoice

PROJECT_ROOT = Path(__file__).resolve().parents[1]

PIPER_MODEL = (
    PROJECT_ROOT / "models" / "piper" / "en_US-lessac-medium.onnx"
)


@lru_cache(maxsize=1)
def get_whisper_model():
    return WhisperModel("base", device="cpu", compute_type="int8")


@lru_cache(maxsize=1)
def get_piper_voice():
    if not PIPER_MODEL.exists():
        raise FileNotFoundError(f"Piper model not found: {PIPER_MODEL}")
    return PiperVoice.load(str(PIPER_MODEL))


def transcribe_audio(audio_bytes: bytes, suffix: str = ".webm") -> str:
    if not audio_bytes:
        raise ValueError("No audio was received.")

    # Save the upload temporarily so Faster-Whisper can decode it.
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as audio_file:
        audio_file.write(audio_bytes)
        audio_path = Path(audio_file.name)

    try:
        segments, _ = get_whisper_model().transcribe(
            str(audio_path),
            language="en",
            beam_size=5,
            vad_filter=True,
            condition_on_previous_text=False,
            initial_prompt="DeepAI is the name of my AI voice assistant.",
        )
        return " ".join(
            segment.text.strip()
            for segment in segments
            if segment.text.strip()
        ).strip()
    finally:
        audio_path.unlink(missing_ok=True)


def synthesize_speech(text: str) -> bytes:
    if not text or not text.strip():
        raise ValueError("No text was provided for speech synthesis.")

    voice = get_piper_voice()
    output = BytesIO()

    with wave.open(output, "wb") as wav_file:
        voice.synthesize_wav(text.strip(), wav_file)

    return output.getvalue()
