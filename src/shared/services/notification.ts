import type { SupabaseClient } from '@supabase/supabase-js';
import { MAX_MESSAGE_PREVIEW_LENGTH } from '@/constants/message';

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