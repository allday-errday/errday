import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCoachModel, isCoachAvailable } from "@/lib/ai/provider";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const estimateSchema = z.object({
  foods: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        caloriesPer100g: z.number().min(0).max(950),
        proteinPer100g: z.number().min(0).max(100),
        carbsPer100g: z.number().min(0).max(100),
        fatPer100g: z.number().min(0).max(100),
        typicalServingG: z.number().min(1).max(2000),
      }),
    )
    .min(1)
    .max(5),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const limit = checkRateLimit(`ai-food:${user.id}`, 20, 10 * 60);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many AI estimates. Try again in a few minutes." },
      { status: 429 },
    );
  }

  if (!(await isCoachAvailable())) {
    return NextResponse.json(
      { error: "The AI is offline right now." },
      { status: 503 },
    );
  }

  let query = "";
  try {
    const body = (await request.json()) as { query?: string };
    query = body.query?.trim().slice(0, 120) ?? "";
  } catch {
    // fall through to the validation below
  }

  if (query.length < 2) {
    return NextResponse.json({ error: "Query is too short." }, { status: 400 });
  }

  try {
    const { text } = await generateText({
      model: getCoachModel(),
      prompt: `You are a nutrition database assistant. The user searched a food database for "${query}" and wants realistic nutrition estimates.
Return 1-5 matching foods or common variants (e.g. cooked/raw, with/without toppings). Use metric values per 100 g and a realistic typical serving in grams. Be conservative and realistic — no exaggerated values. Use the same language as the query for the names.
Respond with ONLY valid JSON, no markdown and no extra text, exactly in this shape:
{"foods":[{"name":"...","caloriesPer100g":0,"proteinPer100g":0,"carbsPer100g":0,"fatPer100g":0,"typicalServingG":100}]}`,
    });

    const cleaned = text
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const parsed = estimateSchema.parse(
      JSON.parse(cleaned.slice(start, end + 1)),
    );

    return NextResponse.json({ foods: parsed.foods });
  } catch (error) {
    console.error("AI estimate failed", error);
    return NextResponse.json(
      { error: "The AI could not create an estimate. Try again." },
      { status: 502 },
    );
  }
}
