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

// Prefer OpenAI when configured so food photos work on every signed-in device.
// Groq and local Ollama remain useful fallbacks for existing installations.
const openaiBaseUrl = "https://api.openai.com/v1";
const defaultOpenAiModel = "gpt-5.6-luna";
const groqBaseUrl = "https://api.groq.com/openai/v1";
const defaultGroqModel = "llama-3.3-70b-versatile";

let openaiProvider: ReturnType<typeof createOpenAICompatible> | null = null;
let groqProvider: ReturnType<typeof createOpenAICompatible> | null = null;

export function isOpenAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function isGroqConfigured() {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

export function isCloudAiConfigured() {
  return isOpenAIConfigured() || isGroqConfigured();
}

export function aiProviderLabel() {
  if (isOpenAIConfigured()) return "OpenAI";
  if (isGroqConfigured()) return "Groq";
  return "Ollama";
}

export function aiModelName() {
  if (isOpenAIConfigured()) {
    return process.env.OPENAI_MODEL?.trim() || defaultOpenAiModel;
  }

  if (isGroqConfigured()) {
    return process.env.GROQ_MODEL?.trim() || defaultGroqModel;
  }
  return ollamaModelName();
}

export function aiVisionModelName() {
  if (isOpenAIConfigured()) {
    return (
      process.env.OPENAI_VISION_MODEL?.trim() ||
      process.env.OPENAI_MODEL?.trim() ||
      defaultOpenAiModel
    );
  }

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
  if (isOpenAIConfigured()) {
    if (!openaiProvider) {
      openaiProvider = createOpenAICompatible({
        apiKey: process.env.OPENAI_API_KEY?.trim(),
        baseURL: openaiBaseUrl,
        name: "openai",
      });
    }
    return openaiProvider(aiModelName());
  }

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
  if (isOpenAIConfigured()) {
    if (!openaiProvider) {
      openaiProvider = createOpenAICompatible({
        apiKey: process.env.OPENAI_API_KEY?.trim(),
        baseURL: openaiBaseUrl,
        name: "openai",
      });
    }
    return openaiProvider(aiVisionModelName());
  }

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
  if (isOpenAIConfigured() || isGroqConfigured()) {
    return true;
  }
  return isOllamaAvailable();
}

export async function isVisionModelAvailable() {
  if (isOpenAIConfigured() || isGroqConfigured()) {
    return true;
  }
  return isOllamaVisionAvailable();
}
