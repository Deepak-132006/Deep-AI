const API_URL = "http://127.0.0.1:8000";
const TARGET_SAMPLE_RATE = 16000;
const FRAME_SAMPLES = 1600; // 100 ms at 16 kHz


export type VoiceCallbacks = {
  onTranscript: (text: string) => void;
  onStatus: (status: string) => void;
  onError: (message: string) => void;
};

export class DeepAIVoice {
  private socket: WebSocket | null = null;
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private muteGain: GainNode | null = null;
  private stopped = true;
  private pendingSamples: number[] = [];

  async start(callbacks: VoiceCallbacks): Promise<void> {
    if (!this.stopped) return;

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof AudioContext === "undefined"
    ) {
      throw new Error("Microphone capture is not supported here.");
    }

    this.stopped = false;
    callbacks.onStatus("Requesting microphone…");

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (this.stopped) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
        return;
      }

      const socketUrl = API_URL.replace(/^http/, "ws") + "/voice/live";
      const socket = new WebSocket(socketUrl);
      this.socket = socket;

      await new Promise<void>((resolve, reject) => {
        let settled = false;

        const timeout = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          socket.close();
          reject(new Error("Timed out connecting to the voice server."));
        }, 10000);

        socket.onopen = () => {
          if (settled) return;

          settled = true;
          window.clearTimeout(timeout);
          resolve();
        };

        socket.onerror = () => {
          if (settled) return;

          settled = true;
          window.clearTimeout(timeout);
          reject(new Error("Could not connect to the voice server."));
        };

        socket.onclose = () => {
          if (!settled) {
            settled = true;
            window.clearTimeout(timeout);
            reject(new Error("Voice connection closed before it was ready."));
            return;
          }

          if (this.socket === socket) {
            this.socket = null;
          }

          if (!this.stopped) {
            this.stop();
            callbacks.onStatus("Voice disconnected");
          }
        };
      });

      if (this.stopped || socket.readyState !== WebSocket.OPEN) {
        this.stop();
        return;
      }

      socket.onmessage = (event: MessageEvent<string>) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "transcript" && typeof data.text === "string") {
            const transcript = data.text.trim();

            if (!transcript) {
              callbacks.onStatus("No speech recognized. Listening…");
              return;
            }

            // Release the microphone before DeepAI begins generating a reply.
            this.stop();

            callbacks.onTranscript(transcript);
          } else if (data.type === "status") {
            callbacks.onStatus(data.message);
          } else if (data.type === "error") {
            callbacks.onError(data.message);
          }
        } catch {
          callbacks.onError("Received an invalid voice response.");
        }
      };

      this.context = new AudioContext();
      await this.context.resume();

      this.source = this.context.createMediaStreamSource(this.stream);
      this.processor = this.context.createScriptProcessor(4096, 1, 1);
      this.muteGain = this.context.createGain();
      this.muteGain.gain.value = 0;

      this.pendingSamples = [];

      this.processor.onaudioprocess = (event: AudioProcessingEvent) => {
        if (this.stopped || socket.readyState !== WebSocket.OPEN) {
          return;
        }

        const input = event.inputBuffer.getChannelData(0);
        const output = this.resample(
          input,
          this.context!.sampleRate,
          TARGET_SAMPLE_RATE,
        );

        for (const sample of output) {
          this.pendingSamples.push(sample);
        }

        while (this.pendingSamples.length >= FRAME_SAMPLES) {
          const frame = this.pendingSamples.splice(0, FRAME_SAMPLES);
          const pcm = new Int16Array(frame.length);

          for (let i = 0; i < frame.length; i++) {
            const sample = Math.max(-1, Math.min(1, frame[i]));
            pcm[i] = sample < 0 ? sample * 32768 : sample * 32767;
          }

          socket.send(pcm.buffer);
        }
      };

      this.source.connect(this.processor);
      this.processor.connect(this.muteGain);
      this.muteGain.connect(this.context.destination);

      callbacks.onStatus("Listening…");
    } catch (error) {
      this.stop();

      const message =
        error instanceof Error ? error.message : "Could not start voice input.";

      callbacks.onError(message);
      throw error;
    }
  }

  private resample(
    input: Float32Array,
    inputRate: number,
    outputRate: number,
  ): number[] {
    if (inputRate === outputRate) {
      return Array.from(input);
    }

    const ratio = inputRate / outputRate;
    const outputLength = Math.floor(input.length / ratio);
    const output: number[] = [];

    for (let i = 0; i < outputLength; i++) {
      const position = i * ratio;
      const left = Math.floor(position);
      const right = Math.min(left + 1, input.length - 1);
      const fraction = position - left;

      output.push(input[left] * (1 - fraction) + input[right] * fraction);
    }

    return output;
  }

  stop(): void {
    this.stopped = true;

    if (this.processor) {
      this.processor.onaudioprocess = null;
      this.processor.disconnect();
      this.processor = null;
    }

    this.source?.disconnect();
    this.source = null;

    this.muteGain?.disconnect();
    this.muteGain = null;

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.context) {
      void this.context.close();
      this.context = null;
    }

    const socket = this.socket;
    this.socket = null;
    this.pendingSamples = [];

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "stop" }));
      window.setTimeout(() => {
        if (socket.readyState === WebSocket.OPEN) socket.close();
      }, 300);
    } else if (socket) {
      socket.close();
    }
  }
}
