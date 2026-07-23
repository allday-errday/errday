import { requireUser } from "@/lib/auth";
import { modelSupportsTools } from "@/lib/ai/coach-tools";
import {
  aiModelName,
  aiProviderLabel,
  isCloudAiConfigured,
  isCoachAvailable,
} from "@/lib/ai/provider";
import { CoachChat } from "./coach-chat";

export const metadata = {
  title: "Coach",
};

export default async function CoachPage() {
  await requireUser();
  const available = await isCoachAvailable();
  const modelName = aiModelName();
  const cloud = isCloudAiConfigured();
  const providerName = aiProviderLabel();
  const calendarEnabled = modelSupportsTools(modelName);

  return (
    <div className="mx-auto max-w-[1120px]">
      <header className="mb-6 max-w-3xl sm:mb-7">
        <h1 className="text-3xl font-black leading-tight text-white sm:text-5xl">Ask Errday</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">
          Ask a question when you need help.
        </p>
      </header>

      <CoachChat
        available={available}
        calendarEnabled={calendarEnabled}
        cloud={cloud}
        modelName={modelName}
        providerName={providerName}
      />
    </div>
  );
}
