import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_MESSAGE_LIMIT, MAX_MESSAGE_PREVIEW_LENGTH } from '@/constants/message';
import { NotFoundError } from '@/shared/lib/errors';
import { timestamp } from '@/shared/lib/timestamp';
import type { Notification } from '@/generated/database';

export async function getUserNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = DEFAULT_MESSAGE_LIMIT,
  unreadOnly = false,
): Promise<Notification[]> {
  let query = supabase
    .from('notifications')
    .select()
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.is('read_at', null);
  }

  const { data, error } = await query;

  if (error) {
    throw new NotFoundError(`Failed to get notifications: ${error.message}`);
  }

  return data || [];
}

export async function markAsRead(
  supabase: SupabaseClient,
  notificationId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: timestamp.now() })
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) {
    throw new NotFoundError(`Failed to mark notification as read: ${error.message}`);
  }
}

export async function markAllAsRead(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: timestamp.now() })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    throw new NotFoundError(`Failed to mark all notifications as read: ${error.message}`);
  }
}

export async function getUnreadCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    throw new NotFoundError(`Failed to get unread count: ${error.message}`);
  }

  return count || 0;
}

// Notification creation helpers

export interface CreateNotificationInput {
  userId: string | string[];
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Create one or more notifications.
 * Accepts single userId or array of userIds for batch creation.
 */
export async function createNotification(
  supabase: SupabaseClient,
  input: CreateNotificationInput,
): Promise<void> {
  const userIds = Array.isArray(input.userId) ? input.userId : [input.userId];

  const notifications = userIds.map((id) => ({
    user_id: id,
    type: input.type,
    title: input.title,
    body: input.body,
    data: input.data,
  }));

  await supabase.from('notifications').insert(notifications);
}

/**
 * Get display name for a user (for notification titles).
 * Returns 'Someone' if not found.
 */
export async function getDisplayName(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data } = await supabase.from('profiles').select('display_name').eq('id', userId).single();

  return data?.display_name || 'Someone';
}

/**
 * Notify participants of a new message.
 */
export async function notifyNewMessage(
  supabase: SupabaseClient,
  input: {
    participantIds: string[];
    senderId: string;
    threadId: string;
    messageId: string;
    content: string;
  },
): Promise<void> {
  const otherParticipants = input.participantIds.filter((id) => id !== input.senderId);

  if (otherParticipants.length === 0) return;

  const senderName = await getDisplayName(supabase, input.senderId);

  await createNotification(supabase, {
    userId: otherParticipants,
    type: 'message.new',
    title: `New message from ${senderName}`,
    body: input.content.slice(0, MAX_MESSAGE_PREVIEW_LENGTH),
    data: {
      thread_id: input.threadId,
      message_id: input.messageId,
    },
  });
}

/**
 * Notify user of a new review.
 */
export async function notifyNewReview(
  supabase: SupabaseClient,
  input: {
    targetId: string;
    reviewerId: string;
    reviewId: string;
    rating: number;
  },
): Promise<void> {
  const reviewerName = await getDisplayName(supabase, input.reviewerId);

  await createNotification(supabase, {
    userId: input.targetId,
    type: 'review.received',
    title: `New review from ${reviewerName}`,
    body: `Rating: ${'⭐'.repeat(input.rating)}`,
    data: {
      review_id: input.reviewId,
      rating: input.rating,
    },
  });
}