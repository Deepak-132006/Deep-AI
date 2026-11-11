
import { useCallback, useEffect, useRef, useState } from "react";

import { DeepAIVoice } from "../services/voiceService";
import {
  API_BASE,
  IDLE_STATUS,
  type OrbPhase,
} from "../constants/orbConfig";
import { cleanForSpeech } from "../utils/cleanForSpeech";

function parseSseEvent(event: string): string | null {
  const data = event
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("\n");

  if (!data || data === "[DONE]") return null;

  let parsed: { error?: string; text?: string };

  try {
    parsed = JSON.parse(data);
  } catch {
    throw new Error("Received an invalid response.");
  }

  if (parsed.error) {
    throw new Error(parsed.error);
  }

  return typeof parsed.text === "string" ? parsed.text : null;
}

export function useOrbVoice() {
  const orbVoiceRef = useRef<DeepAIVoice | null>(null);
  const orbAudioRef = useRef<HTMLAudioElement | null>(null);
  const orbAudioUrlRef = useRef<string | null>(null);
  const orbAbortRef = useRef<AbortController | null>(null);
  const statusTimerRef = useRef<number | null>(null);

  const [orbPhase, setOrbPhase] = useState<OrbPhase>("idle");
  const [orbStatus, setOrbStatus] = useState(IDLE_STATUS);
  const [orbReply, setOrbReply] = useState("");

  const clearStatusTimer = useCallback(() => {
    if (statusTimerRef.current !== null) {
      window.clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
    }
  }, []);

  const scheduleStatusReset = useCallback((ms: number) => {
    clearStatusTimer();

    statusTimerRef.current = window.setTimeout(() => {
      statusTimerRef.current = null;
      setOrbPhase("idle");
      setOrbStatus(IDLE_STATUS);
    }, ms);
  }, [clearStatusTimer]);

  const releaseOrbAudio = useCallback(() => {
    const audio = orbAudioRef.current;

    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute("src");
      orbAudioRef.current = null;
    }

    if (orbAudioUrlRef.current) {
      URL.revokeObjectURL(orbAudioUrlRef.current);
      orbAudioUrlRef.current = null;
    }
  }, []);

  const showOrbError = useCallback((message: string) => {
    orbVoiceRef.current?.stop();
    orbVoiceRef.current = null;

    setOrbPhase("error");
    setOrbStatus(message);

    scheduleStatusReset(3500);
  }, [scheduleStatusReset]);

  // Release all resources without updating React state.
  const teardownOrb = useCallback(() => {
    clearStatusTimer();

    orbVoiceRef.current?.stop();
    orbVoiceRef.current = null;

    orbAbortRef.current?.abort();
    orbAbortRef.current = null;

    releaseOrbAudio();
  }, [clearStatusTimer, releaseOrbAudio]);

  async function handleOrbTranscript(transcript: string) {
    const message = transcript.trim();

    if (!message) return;

    // Stop listening while processing the request.
    orbVoiceRef.current?.stop();
    orbVoiceRef.current = null;

    clearStatusTimer();
    releaseOrbAudio();

    orbAbortRef.current?.abort();

    const controller = new AbortController();
    orbAbortRef.current = controller;

    const isCurrent = () => orbAbortRef.current === controller;

    setOrbPhase("thinking");
    setOrbStatus("Let me think…");
    setOrbReply("");

    try {
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          mode: "deep",
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error("I couldn't get a response. Please try again.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";
      let reply = "";

      // Read the streamed response.
      while (true) {
        const { value, done } = await reader.read();

        buffer += done
          ? decoder.decode()
          : decoder.decode(value, { stream: true });

        buffer = buffer.replace(/\r\n/g, "\n");

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const text = parseSseEvent(event);

          if (text) {
            reply += text;
            setOrbReply(reply);
          }
        }

        if (done) break;
      }

      // Process any remaining event that didn't end with a blank line.
      if (buffer.trim()) {
        const text = parseSseEvent(buffer);

        if (text) {
          reply += text;
          setOrbReply(reply);
        }
      }

      if (!isCurrent()) return;

      if (!reply.trim()) {
        throw new Error("I didn't receive a response.");
      }

      // Generate speech.
      const speechText = cleanForSpeech(reply);

      if (!speechText) {
        setOrbPhase("idle");
        setOrbStatus(IDLE_STATUS);
        return;
      }

      setOrbPhase("speaking");
      setOrbStatus("Here's what I found");

      const speechResponse = await fetch(`${API_BASE}/voice/speak`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: speechText,
        }),
        signal: controller.signal,
      });

      if (!speechResponse.ok) {
        throw new Error("I couldn't prepare the audio response.");
      }

      const audioBlob = await speechResponse.blob();

      if (!isCurrent()) return;

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      orbAudioRef.current = audio;
      orbAudioUrlRef.current = audioUrl;

      audio.onended = () => {
        if (orbAudioRef.current !== audio) return;

        releaseOrbAudio();

        setOrbPhase("idle");
        setOrbStatus("Listening again…");

        void startOrbVoice();
      };

      audio.onerror = () => {
        if (orbAudioRef.current !== audio) return;

        releaseOrbAudio();
        showOrbError("I couldn't play the audio response.");
      };

      await audio.play();
    } catch (error) {
      if (!isCurrent()) return;

      showOrbError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      if (orbAbortRef.current === controller) {
        orbAbortRef.current = null;
      }
    }
  }

  async function startOrbVoice() {
    if (orbVoiceRef.current) return;

    clearStatusTimer();

    const voice = new DeepAIVoice();
    orbVoiceRef.current = voice;

    setOrbPhase("listening");
    setOrbStatus("I'm listening…");

    try {
      await voice.start({
        onTranscript: (text) => {
          if (orbVoiceRef.current !== voice) return;
          void handleOrbTranscript(text);
        },

        onStatus: (status) => {
          if (orbVoiceRef.current === voice) {
            setOrbStatus(status);
          }
        },

        onError: () => {
          if (orbVoiceRef.current !== voice) return;

          showOrbError("I couldn't hear you. Try again.");
        },
      });

      // Prevent an old start operation from reviving the microphone.
      if (orbVoiceRef.current !== voice) {
        voice.stop();
        return;
      }

      setOrbPhase("listening");
      setOrbStatus("I'm listening…");
    } catch {
      if (orbVoiceRef.current !== voice) return;

      voice.stop();
      orbVoiceRef.current = null;

      showOrbError("Couldn't start the microphone.");
    }
  }

  function stopOrbVoice() {
    teardownOrb();

    setOrbPhase("idle");
    setOrbStatus("Voice stopped");

    scheduleStatusReset(1800);
  }

  useEffect(() => {
    return () => {
      teardownOrb();
    };
  }, [teardownOrb]);

  return {
    orbPhase,
    orbStatus,
    orbReply,
    orbVoiceRef,
    startOrbVoice,
    stopOrbVoice,
  };
}
