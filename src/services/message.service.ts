import type { SupabaseClient } from "@supabase/supabase-js";
import { ForbiddenError, NotFoundError } from "../lib/errors";
import { log } from "../middleware/logger";
import type { Message, MessageThread } from "../types/database";

export interface CreateThreadInput {
  listing_id?: string;
  booking_id?: string;
  participant_ids: string[];
}

export async function createThread(
  supabaseAdmin: SupabaseClient,
  userId: string,
  input: CreateThreadInput
): Promise<MessageThread> {
  if (!input.participant_ids.includes(userId)) {
    throw new ForbiddenError("You must be a participant in the thread");
  }

  const { data, error } = await supabaseAdmin
    .from("message_threads")
    .insert({
      listing_id: input.listing_id,
      booking_id: input.booking_id,
      participant_ids: input.participant_ids,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create thread: ${error.message}`);
  }

  return data;
}

export async function getThread(
  supabaseAdmin: SupabaseClient,
  threadId: string,
  userId: string
): Promise<MessageThread> {
  const { data: thread, error } = await supabaseAdmin
    .from("message_threads")
    .select()
    .eq("id", threadId)
    .single();

  if (error || !thread) {
    throw new NotFoundError("Thread not found");
  }

  if (!thread.participant_ids.includes(userId)) {
    throw new ForbiddenError("You are not a participant in this thread");
  }

  return thread;
}

export async function getUserThreads(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<MessageThread[]> {
  const { data, error } = await supabaseAdmin
    .from("message_threads")
    .select()
    .contains("participant_ids", [userId])
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error(`Failed to get threads: ${error.message}`);
  }

  return data || [];
}

export async function sendMessage(
  supabaseAdmin: SupabaseClient,
  threadId: string,
  senderId: string,
  content: string
): Promise<Message> {
  const thread = await getThread(supabaseAdmin, threadId, senderId);

  if (!thread.participant_ids.includes(senderId)) {
    throw new ForbiddenError("Not a participant in this thread");
  }

  const { data: message, error } = await supabaseAdmin
    .from("messages")
    .insert({
      thread_id: threadId,
      sender_id: senderId,
      content,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to send message: ${error.message}`);
  }

  const otherParticipants = thread.participant_ids.filter((id) => id !== senderId);
  notifyParticipants(supabaseAdmin, otherParticipants, senderId, message).catch((err) =>
    log.error({ err, threadId }, "Failed to send message notifications")
  );

  return message;
}

export async function getMessages(
  supabaseAdmin: SupabaseClient,
  threadId: string,
  userId: string,
  limit: number = 50,
  before?: string
): Promise<Message[]> {
  await getThread(supabaseAdmin, threadId, userId);

  let query = supabaseAdmin
    .from("messages")
    .select()
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get messages: ${error.message}`);
  }

  return (data || []).reverse();
}

export async function markMessagesAsRead(
  supabaseAdmin: SupabaseClient,
  threadId: string,
  userId: string
): Promise<void> {
  await getThread(supabaseAdmin, threadId, userId);

  await supabaseAdmin
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .neq("sender_id", userId)
    .is("read_at", null);
}

async function notifyParticipants(
  supabaseAdmin: SupabaseClient,
  participantIds: string[],
  senderId: string,
  message: Message
): Promise<void> {
  const { data: sender } = await supabaseAdmin
    .from("profiles")
    .select("display_name")
    .eq("id", senderId)
    .single();

  const notifications = participantIds.map((participantId) => ({
    user_id: participantId,
    type: "message.new",
    title: `New message from ${sender?.display_name || "Someone"}`,
    body: message.content.slice(0, 100),
    data: { thread_id: message.thread_id, message_id: message.id },
  }));

  await supabaseAdmin.from("notifications").insert(notifications);
}
