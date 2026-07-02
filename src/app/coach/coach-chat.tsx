"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { CalendarCheck, Camera, ImagePlus, LoaderCircle, Send, Sparkles, X } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";

type CoachChatProps = {
  available: boolean;
  calendarEnabled: boolean;
  modelName: string;
};

const baseSuggestions = [
  "Plan a simple push workout for today",
  "What should I eat before training?",
  "Help me understand last night's recovery",
];

const calendarSuggestions = [
  "Schedule leg day tomorrow at 18:00 with a reminder",
  "What's on my calendar this week?",
];

const coachTransport = new DefaultChatTransport({ api: "/api/coach" });

export function CoachChat({
  available,
  calendarEnabled,
  modelName,
}: CoachChatProps) {
  const suggestions = calendarEnabled
    ? [...calendarSuggestions, ...baseSuggestions.slice(0, 2)]
    : baseSuggestions;
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<FileList>();
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { messages, sendMessage, status, stop, error } = useChat({
    transport: coachTransport,
  });
  const isBusy = status === "submitted" || status === "streaming";
  const selectedFile = files?.[0];

  function chooseFiles(nextFiles: FileList | null) {
    const file = nextFiles?.[0];
    setFileError(null);

    if (!file) {
      setFiles(undefined);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setFileError("Please choose an image.");
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      setFileError("The image must be smaller than 6 MB.");
      return;
    }

    setFiles(nextFiles ?? undefined);
  }

  function clearFile() {
    setFiles(undefined);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!available || isBusy || (!input.trim() && !selectedFile)) return;

    sendMessage({
      files,
      text:
        input.trim() ||
        "Analyze this meal photo. Identify the likely foods, estimate a realistic calorie and macro range, and tell me what detail would make the estimate more accurate.",
    });
    setInput("");
    clearFile();
  }

  function sendSuggestion(suggestion: string) {
    if (!available || isBusy) return;
    sendMessage({ text: suggestion });
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_270px]">
      <section className="flex h-[min(720px,calc(100dvh-12rem))] min-h-[30rem] flex-col overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_80%,transparent)] shadow-[0_30px_90px_-55px_black] backdrop-blur-xl sm:min-h-[560px] sm:rounded-[2rem]">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:items-center sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-[var(--accent)] text-[#0b0c10] shadow-[0_0_24px_color-mix(in_srgb,var(--accent)_30%,transparent)]">
              <Sparkles className="size-5" />
            </span>
            <div>
              <h2 className="font-black text-white">Errday Coach</h2>
              <p className="text-xs text-zinc-500">Local · private · free</p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-black ${available ? "border-[var(--signal)]/25 bg-[color-mix(in_srgb,var(--signal)_9%,transparent)] text-[var(--signal)]" : "border-amber-400/25 bg-amber-400/10 text-amber-300"}`}>
            {available ? "Local & ready" : "Ollama offline"}
          </span>
        </div>

        <Conversation className="min-h-0">
          <ConversationContent className="gap-6 p-5 sm:p-6">
            {messages.length === 0 ? (
              <div className="mx-auto flex min-h-[300px] max-w-xl flex-col items-center justify-center py-8 text-center">
                <div className="grid size-14 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)]">
                  <Sparkles className="size-6" />
                </div>
                <h3 className="mt-5 text-2xl font-black text-white">
                  What are we working on?
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                  Ask naturally. For food, attach a photo — the coach will give a range, not pretend a picture is a lab test.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-left text-xs font-bold text-zinc-300 transition hover:border-[var(--accent)]/45 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!available || isBusy}
                      key={suggestion}
                      onClick={() => sendSuggestion(suggestion)}
                      type="button"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <Message from={message.role} key={message.id}>
                  <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-zinc-600">
                    {message.role === "user" ? "You" : "Coach"}
                  </p>
                  <MessageContent className={message.role === "user" ? "rounded-2xl bg-[var(--accent)] px-4 py-3 text-[#0b0c10]" : "text-zinc-200"}>
                    {message.parts.map((part, index) => {
                      if (part.type === "text") {
                        return message.role === "assistant" ? (
                          <MessageResponse key={`${message.id}-text-${index}`}>{part.text}</MessageResponse>
                        ) : (
                          <p className="whitespace-pre-wrap" key={`${message.id}-text-${index}`}>{part.text}</p>
                        );
                      }

                      if (part.type === "file" && part.mediaType.startsWith("image/")) {
                        return (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={part.filename ?? "Attached meal"}
                            className="max-h-72 rounded-xl object-cover"
                            key={`${message.id}-file-${index}`}
                            src={part.url}
                          />
                        );
                      }

                      if (part.type.startsWith("tool-")) {
                        return (
                          <ToolActivity
                            key={`${message.id}-tool-${index}`}
                            part={part as ToolPart}
                          />
                        );
                      }

                      return null;
                    })}
                  </MessageContent>
                </Message>
              ))
            )}

            {status === "submitted" ? (
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-500" role="status">
                <LoaderCircle className="size-4 animate-spin text-[var(--accent)]" />
                Coach is thinking…
              </div>
            ) : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="border-t border-[var(--border)] bg-[var(--bg)]/70 p-3 sm:p-4">
          {!available ? (
            <p className="mb-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-200">
              Start Ollama on this PC, make sure {modelName} is installed
              (ollama pull {modelName}), then reload this page.
            </p>
          ) : null}
          {error ? (
            <p className="mb-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300">
              The coach could not answer. Please try again.
            </p>
          ) : null}
          {selectedFile ? (
            <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-3 py-2 text-xs text-zinc-300">
              <span className="min-w-0 truncate"><ImagePlus className="mr-2 inline size-4 text-[var(--accent)]" />{selectedFile.name}</span>
              <button aria-label="Remove image" className="text-zinc-500 hover:text-white" onClick={clearFile} type="button"><X className="size-4" /></button>
            </div>
          ) : null}
          {fileError ? <p className="mb-2 text-xs text-red-300">{fileError}</p> : null}
          <form className="flex items-end gap-2" onSubmit={submit}>
            <input
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(event) => chooseFiles(event.target.files)}
              ref={fileInputRef}
              type="file"
            />
            <button
              aria-label="Take or attach a photo"
              className="grid size-12 shrink-0 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-zinc-400 transition hover:border-[var(--accent)]/40 hover:text-white disabled:opacity-40"
              disabled={!available || isBusy}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <Camera className="size-5" />
            </button>
            <textarea
              aria-label="Message to Errday Coach"
              className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!available || isBusy}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Ask your coach…"
              rows={1}
              value={input}
            />
            {isBusy ? (
              <button aria-label="Stop response" className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-[#0b0c10]" onClick={stop} type="button"><span className="size-3 rounded-sm bg-[#0b0c10]" /></button>
            ) : (
              <button aria-label="Send message" className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--accent)] text-[#0b0c10] shadow-lg shadow-[var(--accent)]/20 disabled:cursor-not-allowed disabled:opacity-40" disabled={!available || (!input.trim() && !selectedFile)} type="submit"><Send className="size-5" /></button>
            )}
          </form>
        </div>
      </section>

      <aside className="space-y-3">
        <InfoCard icon="01" title="Talk naturally">No commands. Tell it what happened, what you ate, or what feels off.</InfoCard>
        {calendarEnabled ? (
          <InfoCard icon="02" title="Plans for you">Say &ldquo;schedule leg day tomorrow at 18:00&rdquo; — the coach adds it to your calendar and iPhone.</InfoCard>
        ) : (
          <InfoCard icon="02" title="Calendar actions off">{`${modelName} cannot use tools. Set OLLAMA_MODEL to qwen3:4b to let the coach add calendar events.`}</InfoCard>
        )}
        <InfoCard icon="03" title="Snap a meal">Use the camera button. Food recognition returns an honest range with assumptions.</InfoCard>
        <InfoCard icon="04" title="Stays local">Your chats and meal photos are processed on this PC, without a paid cloud API.</InfoCard>
        <p className="px-2 pt-2 text-xs leading-5 text-zinc-600">AI estimates can be wrong and are not medical advice.</p>
      </aside>
    </div>
  );
}

type ToolPart = {
  type: string;
  state?: string;
  output?: unknown;
  errorText?: string;
};

const toolLabels: Record<string, { pending: string; done: string }> = {
  "tool-addCalendarEvent": {
    pending: "Adding to your calendar…",
    done: "Added to your calendar",
  },
  "tool-listCalendarEvents": {
    pending: "Checking your calendar…",
    done: "Checked your calendar",
  },
  "tool-deleteCalendarEvent": {
    pending: "Removing from your calendar…",
    done: "Removed from your calendar",
  },
};

function ToolActivity({ part }: { part: ToolPart }) {
  const labels = toolLabels[part.type] ?? {
    pending: "Working…",
    done: "Done",
  };

  if (part.state === "output-error") {
    return (
      <p className="w-fit rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300">
        Calendar action failed{part.errorText ? ` — ${part.errorText}` : ""}
      </p>
    );
  }

  const isDone = part.state === "output-available";
  const output = part.output as
    | { event?: { title?: string; date?: string } }
    | undefined;
  const detail =
    isDone && output?.event?.title
      ? `: ${output.event.title} · ${output.event.date}`
      : "";

  return (
    <p
      className={`flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${
        isDone
          ? "border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)]"
          : "border-[var(--border)] bg-[var(--surface)] text-zinc-400"
      }`}
    >
      {isDone ? (
        <CalendarCheck className="size-3.5" />
      ) : (
        <LoaderCircle className="size-3.5 animate-spin" />
      )}
      {isDone ? `${labels.done}${detail}` : labels.pending}
    </p>
  );
}

function InfoCard({ children, icon, title }: { children: string; icon: string; title: string }) {
  return (
    <article className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs font-black text-[var(--accent)]">{icon}</p>
      <h3 className="mt-3 font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{children}</p>
    </article>
  );
}
