import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import {
  deletePushSubscription,
  upsertPushSubscription,
} from "@/lib/db/push-subscriptions";
import { isAllowedPushEndpoint } from "@/lib/push/endpoints";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    auth: z.string().min(8),
    p256dh: z.string().min(16),
  }),
  timezone: z.string().min(1).max(80).nullable().optional(),
  userAgent: z.string().max(600).nullable().optional(),
});

const deleteSchema = z.object({
  endpoint: z.string().url(),
});

export async function POST(request: Request) {
  const { supabase, user } = await requireUser();
  const body = subscriptionSchema.parse(await request.json());

  if (!isAllowedPushEndpoint(body.endpoint)) {
    return new Response("Unsupported push endpoint.", { status: 400 });
  }

  await upsertPushSubscription(supabase, {
    auth: body.keys.auth,
    endpoint: body.endpoint,
    p256dh: body.keys.p256dh,
    timezone: body.timezone ?? null,
    user_agent: body.userAgent ?? null,
    user_id: user.id,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { supabase, user } = await requireUser();
  const body = deleteSchema.parse(await request.json());

  await deletePushSubscription(supabase, user.id, body.endpoint);

  return NextResponse.json({ ok: true });
}
