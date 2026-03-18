import type { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseError, ForbiddenError, NotFoundError, ValidationError } from '../../shared/lib/errors';
import type { Message, MessageThread } from '../../shared/types/database';

export interface CreateThreadInput {
  listing_id?: string;
  booking_id?: string;
  participant_ids: string[];
}

export interface MessageRepository {
  createThread(input: CreateThreadInput, userId: string): Promise<MessageThread>;
  findThreadById(id: string): Promise<MessageThread>;
  findUserThreads(userId: string): Promise<MessageThread[]>;
  sendMessage(threadId: string, senderId: string, content: string): Promise<Message>;
  findMessages(threadId: string, userId: string, limit?: number, before?: string): Promise<Message[]>;
  markAsRead(threadId: string, userId: string): Promise<void>;
}

export function createMessageRepository(supabaseAdmin: SupabaseClient): MessageRepository {
  async function findThreadById(id: string): Promise<MessageThread> {
    const { data: THREAD, error } = await supabaseAdmin.from('message_threads').select().eq('id', id).single();

    if (error || !THREAD) {
      throw new NotFoundError('Thread not found');
    }

    return THREAD;
  }

  async function createThread(input: CreateThreadInput, userId: string): Promise<MessageThread> {
    if (!input.participant_ids || input.participant_ids.length === 0) {
      throw new ValidationError('At least one participant is required');
    }
    if (!input.participant_ids.includes(userId)) {
      throw new ForbiddenError('You must be a participant in the thread');
    }

    const { data, error } = await supabaseAdmin
      .from('message_threads')
      .insert({
        listing_id: input.listing_id,
        booking_id: input.booking_id,
        participant_ids: input.participant_ids,
      })
      .select()
      .single();

    if (error) {
      throw new DatabaseError(`Failed to create thread: ${error.message}`);
    }

    return data;
  }

  async function findUserThreads(userId: string): Promise<MessageThread[]> {
    const { data, error } = await supabaseAdmin
      .from('message_threads')
      .select()
      .contains('participant_ids', [userId])
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      throw new DatabaseError(`Failed to get threads: ${error.message}`);
    }

    return data || [];
  }

  async function sendMessage(threadId: string, senderId: string, content: string): Promise<Message> {
    const THREAD = await findThreadById(threadId);

    if (!THREAD.participant_ids.includes(senderId)) {
      throw new ForbiddenError('Not a participant in this thread');
    }

    const { data: MESSAGE, error } = await supabaseAdmin
      .from('messages')
      .insert({
        thread_id: threadId,
        sender_id: senderId,
        content,
      })
      .select()
      .single();

    if (error) {
      throw new DatabaseError(`Failed to send message: ${error.message}`);
    }

    const OTHER_PARTICIPANTS = THREAD.participant_ids.filter((id) => id !== senderId);
    notifyParticipants(supabaseAdmin, OTHER_PARTICIPANTS, senderId, MESSAGE).catch((_err) => {
      // Notification failure is non-blocking
    });

    return MESSAGE;
  }

  async function findMessages(threadId: string, userId: string, limit = 50, before?: string): Promise<Message[]> {
    const THREAD = await findThreadById(threadId);

    if (!THREAD.participant_ids.includes(userId)) {
      throw new ForbiddenError('You are not a participant in this thread');
    }

    let QUERY = supabaseAdmin.from('messages').select().eq('thread_id', threadId).order('created_at', { ascending: false }).limit(limit);

    if (before) {
      QUERY = QUERY.lt('created_at', before);
    }

    const { data, error } = await QUERY;

    if (error) {
      throw new DatabaseError(`Failed to get messages: ${error.message}`);
    }

    return (data || []).reverse();
  }

  async function markAsRead(threadId: string, userId: string): Promise<void> {
    const THREAD = await findThreadById(threadId);

    if (!THREAD.participant_ids.includes(userId)) {
      throw new ForbiddenError('You are not a participant in this thread');
    }

    await supabaseAdmin
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('thread_id', threadId)
      .neq('sender_id', userId)
      .is('read_at', null);
  }

  return {
    createThread,
    findThreadById,
    findUserThreads,
    sendMessage,
    findMessages,
    markAsRead,
  };
}

async function notifyParticipants(supabaseAdmin: SupabaseClient, participantIds: string[], senderId: string, message: Message): Promise<void> {
  const { data: SENDER } = await supabaseAdmin.from('profiles').select('display_name').eq('id', senderId).single();

  const NOTIFICATIONS = participantIds.map((participantId) => ({
    user_id: participantId,
    type: 'message.new',
    title: `New message from ${SENDER?.display_name || 'Someone'}`,
    body: message.content.slice(0, 100),
    data: { thread_id: message.thread_id, message_id: message.id },
  }));

  await supabaseAdmin.from('notifications').insert(NOTIFICATIONS);
}

export async function createThread(supabaseAdmin: SupabaseClient, userId: string, input: CreateThreadInput): Promise<MessageThread> {
  return await createMessageRepository(supabaseAdmin).createThread(input, userId);
}

export async function getThread(supabaseAdmin: SupabaseClient, threadId: string, userId: string): Promise<MessageThread> {
  const THREAD = await createMessageRepository(supabaseAdmin).findThreadById(threadId);

  if (!THREAD.participant_ids.includes(userId)) {
    throw new ForbiddenError('You are not a participant in this thread');
  }

  return THREAD;
}

export async function getUserThreads(supabaseAdmin: SupabaseClient, userId: string): Promise<MessageThread[]> {
  return await createMessageRepository(supabaseAdmin).findUserThreads(userId);
}

export async function sendMessage(supabaseAdmin: SupabaseClient, threadId: string, senderId: string, content: string): Promise<Message> {
  return await createMessageRepository(supabaseAdmin).sendMessage(threadId, senderId, content);
}

export async function getMessages(supabaseAdmin: SupabaseClient, threadId: string, userId: string, limit = 50, before?: string): Promise<Message[]> {
  return await createMessageRepository(supabaseAdmin).findMessages(threadId, userId, limit, before);
}

export async function markMessagesAsRead(supabaseAdmin: SupabaseClient, threadId: string, userId: string): Promise<void> {
  return await createMessageRepository(supabaseAdmin).markAsRead(threadId, userId);
}
