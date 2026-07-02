import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { buildCoachTools, modelSupportsTools } from "@/lib/ai/coach-tools";
import { getOllamaModel, isOllamaAvailable } from "@/lib/ai/ollama";
import { checkAiCoachRateLimit, rateLimitHeaders } from "@/lib/ai/rate-limit";
import { todayDateString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 180;

function coachInstructions(withTools: boolean) {
  const base = `You are Errday Coach, a concise and warm fitness, nutrition, sleep, and recovery assistant.
Today's date is ${todayDateString()} (Europe/Zurich).
Reply in the same language as the user. Give practical next actions and keep normal answers short.
When a meal image is attached, identify only foods that are reasonably visible. Estimate calories and protein, carbs, and fat as a range, list key assumptions such as portion size or cooking oil, and ask one useful clarifying question. Never present an image estimate as exact.
Do not diagnose medical conditions. For potentially serious symptoms, eating disorders, injuries, medication questions, or emergencies, clearly recommend qualified professional help.
Do not claim access to private Errday data that is not included in the conversation.`;

  if (!withTools) {
    return `${base}
Never say that you saved or changed data.`;
  }

  return `${base}
You can manage the user's Errday calendar with your tools. When the user asks to schedule, plan, or be reminded of something, add it with addCalendarEvent — resolve relative dates like "tomorrow" from today's date, and only claim an event was saved after the tool confirms it. Before adding to a day you have not seen, check it with listCalendarEvents to avoid duplicates. Calendar events sync to the user's Apple Calendar automatically.`;
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 9 * 1024 * 1024) {
    return Response.json({ error: "Request is too large." }, { status: 413 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const rateLimit = checkAiCoachRateLimit(`coach:${user.id}`);
  if (!rateLimit.allowed) {
    return Response.json(
      {
        error: "AI limit reached. Please try again later.",
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
      { headers: rateLimitHeaders(rateLimit), status: 429 },
    );
  }

  if (!(await isOllamaAvailable())) {
    return Response.json(
      { error: "Local AI is offline. Start Ollama and reload Errday." },
      { status: 503 },
    );
  }

  const { messages }: { messages?: UIMessage[] } = await request.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "Messages are required." }, { status: 400 });
  }

  const withTools = modelSupportsTools();
  const recentMessages = messages.slice(-12);
  const result = streamText({
    messages: await convertToModelMessages(recentMessages),
    model: getOllamaModel(),
    stopWhen: stepCountIs(5),
    system: coachInstructions(withTools),
    tools: withTools ? buildCoachTools(supabase, user.id) : undefined,
  });

  return result.toUIMessageStreamResponse();
}
