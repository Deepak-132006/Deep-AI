
import { useEffect, useRef, useState } from "react";
import { DeepAIVoice } from "../services/voiceService";

export function useVoiceInput(
  onTranscript: (text: string) => void,
) {
  const voiceRef = useRef<DeepAIVoice | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");

  async function toggleVoice() {
    if (listening) {
      voiceRef.current?.stop();
      voiceRef.current = null;
      setListening(false);
      setVoiceStatus("");
      return;
    }

    const voice = new DeepAIVoice();
    voiceRef.current = voice;

    try {
      await voice.start({
        onTranscript,
        onStatus: setVoiceStatus,
        onError: setVoiceStatus,
      });

      setListening(true);
    } catch {
      voiceRef.current = null;
      setListening(false);
    }
  }

  useEffect(() => {
    return () => {
      voiceRef.current?.stop();
    };
  }, []);

  return {
    listening,
    voiceStatus,
    toggleVoice,
  };
}
