import "server-only";

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const defaultBaseUrl = "http://127.0.0.1:11434";
const defaultModel = "gemma3:4b";

let provider: ReturnType<typeof createOpenAICompatible> | null = null;

function baseUrl() {
  return (process.env.OLLAMA_BASE_URL?.trim() || defaultBaseUrl).replace(
    /\/+$/,
    "",
  );
}

export function ollamaModelName() {
  return process.env.OLLAMA_MODEL?.trim() || defaultModel;
}

function getProvider() {
  if (!provider) {
    provider = createOpenAICompatible({
      apiKey: "ollama",
      baseURL: `${baseUrl()}/v1`,
      name: "ollama",
    });
  }

  return provider;
}

export function getOllamaModel() {
  return getProvider()(ollamaModelName());
}

export async function isOllamaAvailable() {
  try {
    const response = await fetch(`${baseUrl()}/api/tags`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2_500),
    });
    if (!response.ok) return false;

    const data = (await response.json()) as {
      models?: Array<{ model?: string; name?: string }>;
    };
    const target = ollamaModelName();

    return (data.models ?? []).some(
      (model) => model.model === target || model.name === target,
    );
  } catch {
    return false;
  }
}
