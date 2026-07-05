import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PushNotificationDelivery,
  PushSubscriptionInsert,
  PushSubscriptionRecord,
} from "@/types/database";

export async function upsertPushSubscription(
  supabase: SupabaseClient,
  subscription: PushSubscriptionInsert,
) {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        ...subscription,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    )
    .select("*")
    .single<PushSubscriptionRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function deletePushSubscription(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string,
) {
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);

  if (error) {
    throw error;
  }
}

export async function listPushSubscriptions(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .returns<PushSubscriptionRecord[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listAllPushSubscriptions(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .returns<PushSubscriptionRecord[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function claimPushDelivery(
  supabase: SupabaseClient,
  delivery: Omit<PushNotificationDelivery, "created_at" | "id">,
) {
  const { error } = await supabase
    .from("push_notification_deliveries")
    .insert(delivery);

  if (error) {
    if ("code" in error && error.code === "23505") {
      return false;
    }

    throw error;
  }

  return true;
}
