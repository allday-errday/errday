import { generateObject, type UserContent } from "ai";
import { NextResponse } from "next/server";
import { getVisionModel, isVisionModelAvailable } from "@/lib/ai/provider";
import {
  loggableMealAnalysisSchema,
  mealAnalysisSchema,
} from "@/lib/ai/meal-analysis";
import { todayDateString } from "@/lib/dates";
import {
  checkRateLimit,
  rateLimitHeaders,
} from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 90;

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function imageValue(formData: FormData) {
  const file = formData.get("image");
  return file instanceof File && file.size > 0 ? file : null;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes("image") ||
      message.includes("file") ||
      message.includes("unsupported")
    ) {
      return "This AI model cannot analyze images right now. Try a text description, or switch to a vision-capable model.";
    }
  }

  return "The AI could not analyze this meal. Try again with a bit more detail.";
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const limit = checkRateLimit(`meal-analyze:${user.id}`, 20, 10 * 60);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many meal analyses. Try again in a few minutes." },
      { headers: rateLimitHeaders(limit), status: 429 },
    );
  }

  if (!(await isVisionModelAvailable())) {
    return NextResponse.json(
      { error: "The AI is offline right now." },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const text = stringValue(formData, "text").slice(0, 700);
  const image = imageValue(formData);

  if (!text && !image) {
    return NextResponse.json(
      { error: "Describe a meal or attach an image." },
      { status: 400 },
    );
  }

  if (image && !image.type.startsWith("image/")) {
    return NextResponse.json({ error: "Please attach an image." }, { status: 400 });
  }

  if (image && image.size > 6 * 1024 * 1024) {
    return NextResponse.json(
      { error: "The image must be smaller than 6 MB." },
      { status: 413 },
    );
  }

  const userContent: UserContent = [
    {
      type: "text",
      text: `Analyze this Errday chat meal capture for logging.
User text: ${text || "(no text, image only)"}

Return totals for the actual likely eaten portion. Do not return per-100 g values as the main result.
Use amount like "1 bowl, about 350 g", "2 slices", or "1 shake, about 300 ml". If grams are unclear, keep servingGrams null but still provide a concrete amount string.
If this is not food or drink, set foodDetected to false and keep numeric values at 0.`,
    },
  ];

  if (image) {
    userContent.push({
      type: "image",
      image: Buffer.from(await image.arrayBuffer()),
      mediaType: image.type,
    });
  }

  try {
    const result = await generateObject({
      model: getVisionModel(),
      schema: mealAnalysisSchema,
      system: `You are Errday's nutrition camera and text parser.
Today's date is ${todayDateString()} (Europe/Zurich).
Estimate realistic nutrition for logging, not lab-accurate nutrition.
Never use "100 g" as the amount unless the user explicitly says the eaten portion was exactly 100 g.
Prefer the same language as the user's text for name, amount, assumptions, and note.
Use conservative, plausible portion estimates from the image/text. Calories and macros must be totals for the stated amount.`,
      messages: [{ role: "user", content: userContent }],
    });

    const analysis = result.object;
    if (!analysis.foodDetected) {
      return NextResponse.json(
        { error: "I could not confidently detect a meal or drink there." },
        { status: 422 },
      );
    }

    const parsed = loggableMealAnalysisSchema.parse({
      ...analysis,
      calories: Math.round(analysis.calories),
      proteinG: Math.round(analysis.proteinG * 10) / 10,
      carbsG: Math.round(analysis.carbsG * 10) / 10,
      fatG: Math.round(analysis.fatG * 10) / 10,
      servingGrams: analysis.servingGrams
        ? Math.round(analysis.servingGrams)
        : null,
    });

    return NextResponse.json({ analysis: parsed });
  } catch (error) {
    console.error("Meal analysis failed", error);
    return NextResponse.json({ error: errorMessage(error) }, { status: 502 });
  }
}
