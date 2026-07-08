import "server-only";

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  getOllamaModel,
  getOllamaVisionModel,
  isOllamaAvailable,
  isOllamaVisionAvailable,
  ollamaModelName,
  ollamaVisionModelName,
} from "@/lib/ai/ollama";

// When GROQ_API_KEY is set the coach runs on Groq's free OpenAI-compatible
// API (works from anywhere, no PC required). Without it, local Ollama is used.
const groqBaseUrl = "https://api.groq.com/openai/v1";
const defaultGroqModel = "llama-3.3-70b-versatile";

let groqProvider: ReturnType<typeof createOpenAICompatible> | null = null;

export function isGroqConfigured() {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

export function aiModelName() {
  if (isGroqConfigured()) {
    return process.env.GROQ_MODEL?.trim() || defaultGroqModel;
  }
  return ollamaModelName();
}

export function aiVisionModelName() {
  if (isGroqConfigured()) {
    return (
      process.env.GROQ_VISION_MODEL?.trim() ||
      process.env.GROQ_MODEL?.trim() ||
      defaultGroqModel
    );
  }

  return ollamaVisionModelName();
}

export function getCoachModel() {
  if (isGroqConfigured()) {
    if (!groqProvider) {
      groqProvider = createOpenAICompatible({
        apiKey: process.env.GROQ_API_KEY?.trim(),
        baseURL: groqBaseUrl,
        name: "groq",
      });
    }
    return groqProvider(aiModelName());
  }

  return getOllamaModel();
}

export function getVisionModel() {
  if (isGroqConfigured()) {
    if (!groqProvider) {
      groqProvider = createOpenAICompatible({
        apiKey: process.env.GROQ_API_KEY?.trim(),
        baseURL: groqBaseUrl,
        name: "groq",
      });
    }
    return groqProvider(aiVisionModelName());
  }

  return getOllamaVisionModel();
}

export async function isCoachAvailable() {
  if (isGroqConfigured()) {
    return true;
  }
  return isOllamaAvailable();
}

export async function isVisionModelAvailable() {
  if (isGroqConfigured()) {
    return true;
  }
  return isOllamaVisionAvailable();
}
