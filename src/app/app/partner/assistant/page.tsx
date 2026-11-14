"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

const starter = [
  "What milestones remain on my Dallas probate assignment?",
  "Draft a document request checklist for the claimant vault.",
  "Show approved projected economics for my assigned case.",
];

export default function PartnerAssistantPage() {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([
    {
      role: "assistant",
      text: "Partner AI is scoped to your assigned cases only. I cannot access the master opportunity pool, other partners, or unreleased First Look deals. I also cannot finalize legal determinations.",
    },
  ]);
  const [input, setInput] = useState("");

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", text: trimmed },
      {
        role: "assistant",
        text: "Preview response: Based on assigned case_tx_1102 evidence packet status, next best action is attorney review of the heir graph contradictions. Projected partner economics display only after compensation model approval. This is synthetic guidance.",
      },
    ]);
    setInput("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-white">Partner AI assistant</h1>
        <p className="mt-2 text-sm text-silver">Isolated retrieval over assigned portfolio only.</p>
      </div>
      <Panel className="min-h-[420px] !p-0">
        <div className="space-y-3 p-4">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={
                message.role === "assistant"
                  ? "rounded-md border border-champagne/25 bg-champagne/5 px-3 py-2 text-sm text-silver"
                  : "rounded-md border border-[rgba(183,195,213,0.14)] bg-white/5 px-3 py-2 text-sm text-white"
              }
            >
              {message.text}
            </div>
          ))}
        </div>
        <div className="border-t border-[rgba(183,195,213,0.12)] p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {starter.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="rounded-md border border-[rgba(183,195,213,0.16)] px-2 py-1 text-xs text-silver hover:border-champagne/40"
                onClick={() => send(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about an assigned case…"
              className="flex-1 rounded-md border border-[rgba(183,195,213,0.2)] bg-midnight px-3 py-2 text-sm text-white outline-none focus:border-champagne/50"
            />
            <Button type="submit">Send</Button>
          </form>
        </div>
      </Panel>
    </div>
  );
}
