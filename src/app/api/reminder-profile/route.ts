import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/db/profile";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ profile: null }, { status: 401 });
  }

  try {
    const profile = await getProfile(supabase, user.id);
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ profile: null }, { status: 500 });
  }
}
