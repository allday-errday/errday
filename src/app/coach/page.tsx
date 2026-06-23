import { requireUser } from "@/lib/auth";
import { isOllamaAvailable } from "@/lib/ai/ollama";
import { CoachChat } from "./coach-chat";

export const metadata = {
  title: "Coach",
};

export default async function CoachPage() {
  await requireUser();
  const available = await isOllamaAvailable();

  return (
    <div className="mx-auto max-w-[1120px]">
      <header className="mb-7 max-w-3xl">
        <p className="eyebrow">Errday intelligence</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] text-white sm:text-5xl">
          Your health, in conversation.
        </h1>
        <p className="mt-4 text-base leading-7 text-zinc-400">
          Ask about training, meals or recovery — or analyze a photo privately
          with the AI running on your own PC.
        </p>
      </header>

      <CoachChat available={available} />
    </div>
  );
}
