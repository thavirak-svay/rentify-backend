import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_MESSAGE_LIMIT, MAX_MESSAGE_PREVIEW_LENGTH } from '@/constants/message';
import { fetchOne, insertOne } from '@/shared/lib/db-helpers';
import { ForbiddenError, NotFoundError, ValidationError } from '@/shared/lib/errors';
import { timestamp } from '@/shared/lib/timestamp';
import { requireThreadParticipant } from '@/shared/lib/validators';
import { notifyNewMessage } from '@/shared/services/notification';
import type { Message, MessageThread } from '@/shared/types/database';

export interface CreateThreadInput {
  listing_id?: string;
  booking_id?: string;
  participant_ids: string[];
}

export async function createThread(
  supabase: SupabaseClient,
  userId: string,
  input: CreateThreadInput,
): Promise<MessageThread> {
  if (!input.participant_ids || input.participant_ids.length === 0) {
    throw new ValidationError('At least one participant is required');
  }
  if (!input.participant_ids.includes(userId)) {
    throw new ForbiddenError('You must be a participant in the thread');
  }

  return insertOne<MessageThread>(
    supabase,
    'message_threads',
    {
      listing_id: input.listing_id,
      booking_id: input.booking_id,
      participant_ids: input.participant_ids,
    },
    'Thread',
  );
}

export async function getThread(supabase: SupabaseClient, threadId: string, userId: string): Promise<MessageThread> {
  const thread = await fetchOne<MessageThread>(supabase, 'message_threads', { id: threadId }, 'Thread');
  requireThreadParticipant(thread, userId);
  return thread;
}

export async function getUserThreads(supabase: SupabaseClient, userId: string): Promise<MessageThread[]> {
  const { data, error } = await supabase
    .from('message_threads')
    .select()
    .contains('participant_ids', [userId])
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (error) {
    throw new NotFoundError(`Failed to get threads: ${error.message}`);
  }

  return data || [];
}

export async function sendMessage(
  supabase: SupabaseClient,
  threadId: string,
  senderId: string,
  content: string,
): Promise<Message> {
  const thread = await fetchOne<MessageThread>(supabase, 'message_threads', { id: threadId }, 'Thread');

  if (!thread.participant_ids.includes(senderId)) {
    throw new ForbiddenError('Not a participant in this thread');
  }

  const message = await insertOne<Message>(
    supabase,
    'messages',
    {
      thread_id: threadId,
      sender_id: senderId,
      content,
    },
    'Message',
  );

  // Update thread's last_message_at
  await supabase
    .from('message_threads')
    .update({ last_message_at: timestamp.now(), last_message_preview: content.slice(0, MAX_MESSAGE_PREVIEW_LENGTH) })
    .eq('id', threadId);

  // Notify other participants (non-blocking)
  const otherParticipants = thread.participant_ids.filter((id) => id !== senderId);
  notifyNewMessage(supabase, {
    participantIds: otherParticipants,
    senderId,
    threadId,
    messageId: message.id,
    content,
  }).catch(() => {});

  return message;
}

export async function getMessages(
  supabase: SupabaseClient,
  threadId: string,
  userId: string,
  limit = DEFAULT_MESSAGE_LIMIT,
  before?: string,
): Promise<Message[]> {
  const thread = await fetchOne<MessageThread>(supabase, 'message_threads', { id: threadId }, 'Thread');
  requireThreadParticipant(thread, userId);

  let query = supabase
    .from('messages')
    .select()
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;

  if (error) {
    throw new NotFoundError(`Failed to get messages: ${error.message}`);
  }

  return (data || []).reverse();
}

export async function markMessagesAsRead(
  supabase: SupabaseClient,
  threadId: string,
  userId: string,
): Promise<void> {
  const thread = await fetchOne<MessageThread>(supabase, 'message_threads', { id: threadId }, 'Thread');
  requireThreadParticipant(thread, userId);

  await supabase
    .from('messages')
    .update({ read_at: timestamp.now() })
    .eq('thread_id', threadId)
    .neq('sender_id', userId)
    .is('read_at', null);
}