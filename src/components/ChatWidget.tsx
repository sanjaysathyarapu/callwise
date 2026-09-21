"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Loader2, Mic, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
  greeting,
  suggestions = [],
  className,
}: {
  assistantId: string;
  greeting?: string;
  suggestions?: string[];
  className?: string;
}) {
  const [input, setInput] = useState("");
  const [conversationId] = useState(() => crypto.randomUUID());
  const speakNextReply = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { assistantId, conversationId },
    }),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

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

  function ask(text: string, channel: "web_chat" | "web_voice") {
    speakNextReply.current = channel === "web_voice";
    sendMessage({ text }, { body: { channel } });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    ask(input, "web_chat");
    setInput("");
  }

  function listen() {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      alert("Voice input isn't supported in this browser. Try Chrome.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.onresult = (event) => ask(event.results[0][0].transcript, "web_voice");
    recognition.start();
  }

  const bubble = "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap";

  return (
    <div className={cn("flex h-[30rem] flex-col rounded-xl border bg-card", className)}>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {greeting && (
          <div className={cn(bubble, "self-start bg-muted text-foreground")}>{greeting}</div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              bubble,
              m.role === "user"
                ? "self-end bg-primary text-primary-foreground"
                : "self-start bg-muted text-foreground"
            )}
          >
            {m.parts
              .filter((p) => p.type === "text")
              .map((p) => p.text)
              .join("")}
          </div>
        ))}
        {status === "submitted" && (
          <div className={cn(bubble, "self-start bg-muted text-muted-foreground")}>
            <Loader2 className="size-4 animate-spin" />
          </div>
        )}
        {error && <p className="self-start text-xs text-destructive">{friendlyError(error)}</p>}
        <div ref={bottomRef} />
      </div>

      {messages.length === 0 && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-3">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              disabled={busy}
              onClick={() => ask(s, "web_chat")}
              className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 border-t p-3">
        <Input
          placeholder="Ask a question..."
          value={input}
          maxLength={1000}
          onChange={(e) => setInput(e.target.value)}
          className="h-9"
        />
        <Button type="button" variant="outline" size="icon" className="size-9" onClick={listen} title="Speak instead">
          <Mic />
        </Button>
        <Button type="submit" size="icon" className="size-9" disabled={busy || !input.trim()} title="Send">
          <SendHorizontal />
        </Button>
      </form>
    </div>
  );
}
