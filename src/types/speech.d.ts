export {};

declare global {
  interface SpeechRecognitionEventResultItem {
    transcript: string;
  }
  interface SpeechRecognitionEventResult {
    0: SpeechRecognitionEventResultItem;
  }
  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionEventResult[];
  }
  interface SpeechRecognition extends EventTarget {
    lang: string;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    start: () => void;
    stop: () => void;
  }
  interface Window {
    SpeechRecognition?: { new (): SpeechRecognition };
    webkitSpeechRecognition?: { new (): SpeechRecognition };
  }
}
