import type { SupabaseClient } from "@supabase/supabase-js";
import type { Notification } from "../types/database";

export async function getUserNotifications(
  supabaseAdmin: SupabaseClient,
  userId: string,
  limit: number = 50,
  unreadOnly: boolean = false
): Promise<Notification[]> {
  let query = supabaseAdmin
    .from("notifications")
    .select()
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.is("read_at", null);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get notifications: ${error.message}`);
  }

  return data || [];
}

export async function markAsRead(
  supabaseAdmin: SupabaseClient,
  notificationId: string,
  userId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }
}

export async function markAllAsRead(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    throw new Error(`Failed to mark all notifications as read: ${error.message}`);
  }
}

export async function getUnreadCount(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    throw new Error(`Failed to get unread count: ${error.message}`);
  }

  return count || 0;
}
