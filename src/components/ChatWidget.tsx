"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

export function ChatWidget({ assistantId }: { assistantId: string }) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { assistantId },
    }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  }

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }

  function listen() {
    const SpeechRecognitionCtor =
      (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition })
        .webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      alert("Voice input isn't supported in this browser — try Chrome.");
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      sendMessage({ text: transcript });
    };
    recognition.start();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
        {messages.map((m) => {
          const text = m.parts
            .filter((p) => p.type === "text")
            .map((p) => p.text)
            .join("");
          if (m.role === "assistant" && status === "ready") speak(text);
          return (
            <div
              key={m.id}
              className={`max-w-[85%] rounded px-3 py-2 text-sm ${
                m.role === "user"
                  ? "self-end bg-black text-white dark:bg-white dark:text-black"
                  : "self-start bg-zinc-100 text-black dark:bg-zinc-900 dark:text-zinc-50"
              }`}
            >
              {text}
            </div>
          );
        })}
        {status === "streaming" && (
          <p className="text-xs text-zinc-500">Thinking...</p>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          placeholder="Ask a question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="button"
          onClick={listen}
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
          title="Speak instead"
        >
          🎤
        </button>
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Send
        </button>
      </form>
    </div>
  );
}
