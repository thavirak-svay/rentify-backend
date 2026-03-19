import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_MESSAGE_LIMIT } from '@/constants/message';
import { NotFoundError } from '@/shared/lib/errors';
import { timestamp } from '@/shared/lib/timestamp';
import type { Notification } from '@/shared/types/database';

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