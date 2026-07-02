import { NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function GET() {
  // Local troubleshooting only — never expose config details in production.
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  const { anonKey, url } = getSupabaseEnv();
  let parsedUrl: URL | null = null;

  if (url) {
    try {
      parsedUrl = new URL(url);
    } catch {
      parsedUrl = null;
    }
  }

  return NextResponse.json({
    anonKeyPrefix: anonKey ? `${anonKey.slice(0, 14)}...` : null,
    anonKeyPresent: Boolean(anonKey),
    anonKeyLength: anonKey?.length ?? 0,
    urlHost: parsedUrl?.host ?? null,
    urlPath: parsedUrl?.pathname ?? null,
    urlPresent: Boolean(url),
    urlProtocol: parsedUrl?.protocol ?? null,
    urlUsesSupabaseApiHost: Boolean(parsedUrl?.host.endsWith(".supabase.co")),
  });
}
