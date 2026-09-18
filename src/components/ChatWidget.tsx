"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

function friendlyError(error: Error) {
  try {
    const parsed = JSON.parse(error.message);
    if (parsed?.error) return parsed.error as string;
  } catch {
    // not a JSON error body
  }
  return "Something went wrong. Please try again.";
}

export function ChatWidget({
  assistantId,
  suggestions = [],
}: {
  assistantId: string;
  suggestions?: string[];
}) {
  const [input, setInput] = useState("");
  const [conversationId] = useState(() => crypto.randomUUID());
  const speakNextReply = useRef(false);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { assistantId, conversationId },
    }),
  });

  // Speak a reply once, only when the question was asked by voice.
  useEffect(() => {
    if (status !== "ready" || !speakNextReply.current) return;
    const last = messages[messages.length - 1];
    if (last?.role !== "assistant") return;
    speakNextReply.current = false;
    speak(
      last.parts
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("")
    );
  }, [status, messages]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    speakNextReply.current = false;
    sendMessage({ text: input }, { body: { channel: "web_chat" } });
    setInput("");
  }

  function listen() {
    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      alert("Voice input isn't supported in this browser — try Chrome.");
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      speakNextReply.current = true;
      sendMessage({ text: event.results[0][0].transcript }, { body: { channel: "web_voice" } });
    };
    recognition.start();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded px-3 py-2 text-sm ${
              m.role === "user"
                ? "self-end bg-black text-white dark:bg-white dark:text-black"
                : "self-start bg-zinc-100 text-black dark:bg-zinc-900 dark:text-zinc-50"
            }`}
          >
            {m.parts
              .filter((p) => p.type === "text")
              .map((p) => p.text)
              .join("")}
          </div>
        ))}
        {(status === "submitted" || status === "streaming") && (
          <p className="text-xs text-zinc-500">Thinking...</p>
        )}
        {error && <p className="text-xs text-red-600">{friendlyError(error)}</p>}
      </div>
      {messages.length === 0 && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                speakNextReply.current = false;
                sendMessage({ text: s }, { body: { channel: "web_chat" } });
              }}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          placeholder="Ask a question..."
          value={input}
          maxLength={1000}
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
