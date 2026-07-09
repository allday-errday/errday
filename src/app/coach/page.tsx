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
        <p className="eyebrow">Errday intelligence</p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-white sm:text-5xl">
          Your health, in conversation.
        </h1>
        <p className="mt-4 text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">
          Ask about training, meals or recovery — or analyze a photo privately
          with the AI running on your own PC.
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
