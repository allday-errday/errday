"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { CalendarCheck, Camera, Check, ImagePlus, LoaderCircle, Send, Sparkles, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
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
import type { MealAnalysis } from "@/lib/ai/meal-analysis";

type CoachChatProps = {
  available: boolean;
  calendarEnabled: boolean;
  cloud: boolean;
  modelName: string;
  providerName: string;
};

const CHAT_STORAGE_KEY = "errday.coach-chat.v1";
const CHAT_RETENTION_MS = 48 * 60 * 60 * 1000;

type StoredCoachChat = {
  messages: UIMessage[];
  savedAt: number;
};

function messagesForStorage(messages: UIMessage[]) {
  return messages.map((message) => {
    const parts = message.parts.filter((part) => part.type !== "file");
    return {
      ...message,
      parts: parts.length > 0 ? parts : [{ type: "text", text: "Meal photo" }],
    } as UIMessage;
  });
}

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

type MealAnalysisPartData = {
  status: "analyzing" | "ready" | "logging" | "logged" | "dismissed" | "error";
  analysis?: MealAnalysis;
  error?: string;
  imageName?: string | null;
  loggedMeal?: {
    calories: number;
    mealSlot: string | null;
    name: string;
  };
  sourceText?: string;
};

type MealAnalysisUIPart = {
  data: MealAnalysisPartData;
  id: string;
  type: "data-meal-analysis";
};

const foodTextPattern =
  /\b(ate|eaten|eating|breakfast|lunch|dinner|snack|calorie|calories|kcal|protein|carbs|fat|grams?|portion|serving|plate|bowl|shake|pizza|pasta|rice|chicken|beef|egg|eggs|toast|salad|yogurt|oats|banana|apple|gegessen|esse|essen|hatte|mahlzeit|fruehstueck|fruhstuck|mittagessen|abendessen|znacht|zmittag|kalorien|eiweiss|proteinshake|gramm|teller|schuessel|joghurt|hafer|banane|apfel|eier|salat)\b/i;
const planningTextPattern =
  /^(what|why|how|help|plan|schedule|give|show|explain|was|wie|warum|hilf|plane|zeig|zeige|erklaer|soll|kannst)\b/i;

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function shouldAnalyzeTextAsMeal(text: string, hasImage: boolean) {
  const trimmed = text.trim();

  if (hasImage) return true;
  if (trimmed.length < 3 || trimmed.endsWith("?")) return false;
  if (planningTextPattern.test(trimmed)) return false;

  return foodTextPattern.test(trimmed);
}

function mealConfirmation(text: string) {
  const normalized = text.trim().toLowerCase();

  if (/^(ja|yes|y|j|log|log it|eintragen|speichern)$/i.test(normalized)) {
    return "yes" as const;
  }

  if (/^(nein|no|n|skip|nicht|abbrechen)$/i.test(normalized)) {
    return "no" as const;
  }

  return null;
}

function formatMacro(value: number) {
  return Math.round(value * 10) / 10;
}

function mealSlotLabel(value?: string | null) {
  const labels: Record<string, string> = {
    breakfast: "Breakfast",
    dinner: "Dinner",
    lunch: "Lunch",
    post_workout: "Post-Workout",
    pre_workout: "Pre-Workout",
    snack: "Snack",
  };

  return value ? (labels[value] ?? value) : "Auto";
}

export function CoachChat({
  available,
  calendarEnabled,
  cloud,
  modelName,
  providerName,
}: CoachChatProps) {
  const suggestions = calendarEnabled
    ? [...calendarSuggestions, ...baseSuggestions.slice(0, 2)]
    : baseSuggestions;
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<FileList>();
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const { messages, sendMessage, setMessages, status, stop, error } = useChat({
    transport: coachTransport,
  });
  const [storageReady, setStorageReady] = useState(false);
  const isCoachBusy = status === "submitted" || status === "streaming";
  const isMealBusy = messages.some((message) =>
    message.parts.some((part) => {
      if (part.type !== "data-meal-analysis") return false;
      const data = (part as MealAnalysisUIPart).data;
      return data.status === "analyzing" || data.status === "logging";
    }),
  );
  const isBusy = isCoachBusy || isMealBusy;
  const selectedFile = files?.[0];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHAT_STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as StoredCoachChat;
        if (
          Array.isArray(stored.messages) &&
          typeof stored.savedAt === "number" &&
          Date.now() - stored.savedAt < CHAT_RETENTION_MS
        ) {
          setMessages(stored.messages);
        } else {
          localStorage.removeItem(CHAT_STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } finally {
      setStorageReady(true);
    }
  }, [setMessages]);

  useEffect(() => {
    if (!storageReady) return;

    if (messages.length === 0) {
      localStorage.removeItem(CHAT_STORAGE_KEY);
      return;
    }

    const stored: StoredCoachChat = {
      messages: messagesForStorage(messages),
      savedAt: Date.now(),
    };
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(stored));
    const clearTimer = window.setTimeout(() => {
      localStorage.removeItem(CHAT_STORAGE_KEY);
      setMessages([]);
    }, CHAT_RETENTION_MS);

    return () => window.clearTimeout(clearTimer);
  }, [messages, setMessages, storageReady]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, []);

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

  function updateMealPart(
    partId: string,
    updater: (data: MealAnalysisPartData) => MealAnalysisPartData,
  ) {
    setMessages((currentMessages) =>
      currentMessages.map((message) => ({
        ...message,
        parts: message.parts.map((part) => {
          if (part.type !== "data-meal-analysis") return part;
          const mealPart = part as MealAnalysisUIPart;
          if (mealPart.id !== partId) return part;

          return {
            ...mealPart,
            data: updater(mealPart.data),
          } as unknown as UIMessage["parts"][number];
        }),
      })),
    );
  }

  function latestReadyMealPart() {
    for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
      const message = messages[messageIndex];
      for (let partIndex = message.parts.length - 1; partIndex >= 0; partIndex -= 1) {
        const part = message.parts[partIndex];
        if (part.type !== "data-meal-analysis") continue;
        const mealPart = part as MealAnalysisUIPart;
        if (mealPart.data.status === "ready" && mealPart.data.analysis) {
          return mealPart;
        }
      }
    }

    return null;
  }

  function appendMealAnalysisMessages(text: string, file?: File) {
    const partId = createLocalId("meal-analysis");
    const userParts: UIMessage["parts"] = [];

    if (text.trim()) {
      userParts.push({ type: "text", text: text.trim() });
    }

    if (file) {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.push(url);
      userParts.push({
        filename: file.name,
        mediaType: file.type,
        type: "file",
        url,
      });
    }

    if (userParts.length === 0) {
      userParts.push({ type: "text", text: "Meal capture" });
    }

    const userMessage: UIMessage = {
      id: createLocalId("meal-user"),
      parts: userParts,
      role: "user",
    };
    const assistantMessage: UIMessage = {
      id: createLocalId("meal-assistant"),
      parts: [
        {
          data: {
            imageName: file?.name ?? null,
            sourceText: text.trim(),
            status: "analyzing",
          },
          id: partId,
          type: "data-meal-analysis",
        } as unknown as UIMessage["parts"][number],
      ],
      role: "assistant",
    };

    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
      assistantMessage,
    ]);

    return partId;
  }

  async function analyzeMealInChat(text: string, file?: File) {
    const partId = appendMealAnalysisMessages(text, file);
    const formData = new FormData();

    if (text.trim()) formData.set("text", text.trim());
    if (file) formData.set("image", file);

    setInput("");
    clearFile();

    try {
      const response = await fetch("/api/food/analyze-meal", {
        body: formData,
        method: "POST",
      });
      const data = (await response.json()) as {
        analysis?: MealAnalysis;
        error?: string;
      };

      if (!response.ok || !data.analysis) {
        updateMealPart(partId, (current) => ({
          ...current,
          error: data.error ?? "I could not analyze this meal.",
          status: "error",
        }));
        return;
      }

      updateMealPart(partId, (current) => ({
        ...current,
        analysis: data.analysis,
        error: undefined,
        status: "ready",
      }));
    } catch {
      updateMealPart(partId, (current) => ({
        ...current,
        error: "The meal analysis could not be reached. Try again.",
        status: "error",
      }));
    }
  }

  async function confirmMealLog(partId: string, analysis: MealAnalysis) {
    updateMealPart(partId, (current) => ({ ...current, status: "logging" }));

    try {
      const response = await fetch("/api/food/log-analyzed-meal", {
        body: JSON.stringify({ analysis }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as {
        error?: string;
        meal?: { calories: number; mealSlot: string | null; name: string };
      };

      if (!response.ok || !data.meal) {
        updateMealPart(partId, (current) => ({
          ...current,
          error: data.error ?? "Could not log this meal.",
          status: "ready",
        }));
        return;
      }

      updateMealPart(partId, (current) => ({
        ...current,
        error: undefined,
        loggedMeal: data.meal,
        status: "logged",
      }));
    } catch {
      updateMealPart(partId, (current) => ({
        ...current,
        error: "Could not log this meal. Try again.",
        status: "ready",
      }));
    }
  }

  function dismissMealLog(partId: string) {
    updateMealPart(partId, (current) => ({ ...current, status: "dismissed" }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!available || isBusy || (!input.trim() && !selectedFile)) return;

    const trimmedInput = input.trim();
    const confirmation = mealConfirmation(trimmedInput);
    const readyMeal = latestReadyMealPart();

    if (!selectedFile && confirmation && readyMeal?.data.analysis) {
      setInput("");
      if (confirmation === "yes") {
        void confirmMealLog(readyMeal.id, readyMeal.data.analysis);
      } else {
        dismissMealLog(readyMeal.id);
      }
      return;
    }

    if (shouldAnalyzeTextAsMeal(trimmedInput, Boolean(selectedFile))) {
      void analyzeMealInChat(trimmedInput, selectedFile);
      return;
    }

    sendMessage({
      files,
      text:
        trimmedInput ||
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
    <div className="mx-auto max-w-4xl">
      <section className="flex h-[min(720px,calc(100dvh-12rem))] min-h-[30rem] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_80%,transparent)] backdrop-blur sm:min-h-[560px]">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:items-center sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--accent)] text-[var(--on-accent)]">
              <Sparkles className="size-5" />
            </span>
            <div>
              <h2 className="font-bold text-white">Errday Coach</h2>
              <p className="text-xs text-zinc-500">{cloud ? `${providerName} cloud` : "Local · private"}</p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${available ? "border-[var(--signal)]/25 bg-[color-mix(in_srgb,var(--signal)_9%,transparent)] text-[var(--signal)]" : "border-amber-400/25 bg-amber-400/10 text-amber-300"}`}>
            {available ? (cloud ? "Cloud & ready" : "Local & ready") : "AI offline"}
          </span>
        </div>

        <Conversation className="min-h-0">
          <ConversationContent className="gap-6 p-5 sm:p-6">
            {messages.length === 0 ? (
              <div className="mx-auto flex min-h-[300px] max-w-xl flex-col items-center justify-center py-8 text-center">
                <div className="grid size-14 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)]">
                  <Sparkles className="size-6" />
                </div>
                <h3 className="mt-5 text-2xl font-bold text-white">
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
                  <p className="text-[0.68rem] font-bold uppercase tracking-wide text-zinc-600">
                    {message.role === "user" ? "You" : "Coach"}
                  </p>
                  <MessageContent className={message.role === "user" ? "rounded-xl bg-[var(--accent)] px-4 py-3 text-[var(--on-accent)]" : "text-zinc-200"}>
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

                      if (part.type === "data-meal-analysis") {
                        const mealPart = part as MealAnalysisUIPart;
                        return (
                          <MealAnalysisCard
                            data={mealPart.data}
                            key={`${message.id}-meal-${mealPart.id}`}
                            onConfirm={() => {
                              if (mealPart.data.analysis) {
                                void confirmMealLog(mealPart.id, mealPart.data.analysis);
                              }
                            }}
                            onDismiss={() => dismissMealLog(mealPart.id)}
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
            <p className="mb-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-200">
              {cloud
                ? `${providerName} is not reachable right now. Try again in a moment.`
                : `Start Ollama on this PC, make sure ${modelName} is installed (ollama pull ${modelName}), then reload this page.`}
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
              className="grid size-12 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-zinc-400 transition hover:border-[var(--accent)]/40 hover:text-white disabled:opacity-40"
              disabled={!available || isBusy}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <Camera className="size-5" />
            </button>
            <textarea
              aria-label="Message to Errday Coach"
              className="max-h-32 min-h-12 flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
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
            {isCoachBusy ? (
              <button aria-label="Stop response" className="grid size-12 shrink-0 place-items-center rounded-xl bg-white text-[var(--on-accent)]" onClick={stop} type="button"><span className="size-3 rounded-sm bg-[#0b0c10]" /></button>
            ) : (
              <button aria-label="Send message" className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-[var(--on-accent)] shadow-lg shadow-[var(--accent)]/20 disabled:cursor-not-allowed disabled:opacity-40" disabled={!available || (!input.trim() && !selectedFile)} type="submit"><Send className="size-5" /></button>
            )}
          </form>
          <p className="mt-3 px-1 text-xs leading-5 text-zinc-600">
            Chats stay on this device and are automatically removed after 48 hours.
          </p>
        </div>
      </section>

      <aside aria-hidden="true" className="hidden">
        <InfoCard icon="01" title="Talk naturally">No commands. Tell it what happened, what you ate, or what feels off.</InfoCard>
        {calendarEnabled ? (
          <InfoCard icon="02" title="Plans for you">Say &ldquo;schedule leg day tomorrow at 18:00&rdquo; — the coach adds it to your calendar and iPhone.</InfoCard>
        ) : (
          <InfoCard icon="02" title="Calendar actions off">{`${modelName} cannot use tools. Set OLLAMA_MODEL to qwen3:4b to let the coach add calendar events.`}</InfoCard>
        )}
        <InfoCard icon="03" title="Snap a meal">Use the camera button. Food recognition returns an honest range with assumptions.</InfoCard>
        {cloud ? (
          <InfoCard icon="04" title="Always on">Runs on Groq&rsquo;s free API — works from your phone too, no PC needed.</InfoCard>
        ) : (
          <InfoCard icon="04" title="Stays local">Your chats and meal photos are processed on this PC, without a paid cloud API.</InfoCard>
        )}
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
  "tool-logMeal": {
    pending: "Logging your meal…",
    done: "Meal logged",
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
    | {
        event?: { title?: string; date?: string };
        meal?: { name?: string; calories?: number };
      }
    | undefined;
  const detail =
    isDone && output?.event?.title
      ? `: ${output.event.title} · ${output.event.date}`
      : isDone && output?.meal?.name
        ? `: ${output.meal.name} · ${output.meal.calories} kcal`
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

function MealAnalysisCard({
  data,
  onConfirm,
  onDismiss,
}: {
  data: MealAnalysisPartData;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  if (data.status === "analyzing") {
    return (
      <div className="w-fit rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-zinc-300">
        <span className="flex items-center gap-2 font-bold">
          <LoaderCircle className="size-4 animate-spin text-[var(--accent)]" />
          Analyzing meal...
        </span>
        <p className="mt-1 text-xs text-zinc-500">
          I will estimate the actual portion, not just 100 g.
        </p>
      </div>
    );
  }

  if (data.status === "error") {
    return (
      <div className="w-fit max-w-md rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {data.error ?? "I could not analyze this meal."}
      </div>
    );
  }

  const analysis = data.analysis;
  if (!analysis) return null;

  const logged = data.status === "logged";
  const dismissed = data.status === "dismissed";
  const logging = data.status === "logging";

  return (
    <article className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
            Meal preview
          </p>
          <h3 className="mt-2 font-bold text-white">{analysis.name}</h3>
          <p className="mt-1 text-sm font-semibold text-zinc-400">
            {analysis.amount}
            {analysis.servingGrams ? ` · ${analysis.servingGrams} g` : ""}
          </p>
        </div>
        <p className="rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-sm font-bold text-[var(--accent)]">
          {Math.round(analysis.calories)} kcal
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <MealMetric label="Protein" value={`${formatMacro(analysis.proteinG)} g`} />
        <MealMetric label="Carbs" value={`${formatMacro(analysis.carbsG)} g`} />
        <MealMetric label="Fat" value={`${formatMacro(analysis.fatG)} g`} />
      </div>

      {analysis.assumptions.length > 0 ? (
        <p className="mt-3 text-xs leading-5 text-zinc-500">
          Assumptions: {analysis.assumptions.join("; ")}
        </p>
      ) : null}

      {analysis.note ? (
        <p className="mt-2 text-xs leading-5 text-zinc-500">{analysis.note}</p>
      ) : null}

      {data.error ? (
        <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {data.error}
        </p>
      ) : null}

      {logged ? (
        <p className="mt-4 flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-3 py-2 text-xs font-bold text-[var(--accent)]">
          <Check className="size-4" />
          Logged as {data.loggedMeal?.name ?? analysis.name} ·{" "}
          {mealSlotLabel(data.loggedMeal?.mealSlot)}
        </p>
      ) : dismissed ? (
        <p className="mt-4 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-bold text-zinc-400">
          Not logged.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            className="min-h-11 rounded-full bg-[var(--accent)] px-4 text-sm font-bold text-[var(--on-accent)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={logging}
            onClick={onConfirm}
            type="button"
          >
            {logging ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="size-4 animate-spin" />
                Logging...
              </span>
            ) : (
              "Ja, eintragen"
            )}
          </button>
          <button
            className="min-h-11 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-bold text-zinc-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={logging}
            onClick={onDismiss}
            type="button"
          >
            Nein
          </button>
        </div>
      )}
    </article>
  );
}

function MealMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-2">
      <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 font-bold text-white">{value}</p>
    </div>
  );
}

function InfoCard({ children, icon, title }: { children: string; icon: string; title: string }) {
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs font-bold text-[var(--accent)]">{icon}</p>
      <h3 className="mt-3 font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{children}</p>
    </article>
  );
}
