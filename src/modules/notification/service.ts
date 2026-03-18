import type { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseError } from '../../shared/lib/errors';
import type { Notification } from '../../shared/types/database';

export async function getUserNotifications(supabaseAdmin: SupabaseClient, userId: string, limit = 50, unreadOnly = false): Promise<Notification[]> {
  let QUERY = supabaseAdmin.from('notifications').select().eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);

  if (unreadOnly) {
    QUERY = QUERY.is('read_at', null);
  }

  const { data, error } = await QUERY;

  if (error) {
    throw new DatabaseError(`Failed to get notifications: ${error.message}`);
  }

  return data || [];
}

export async function markAsRead(supabaseAdmin: SupabaseClient, notificationId: string, userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) {
    throw new DatabaseError(`Failed to mark notification as read: ${error.message}`);
  }
}

export async function markAllAsRead(supabaseAdmin: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabaseAdmin.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null);

  if (error) {
    throw new DatabaseError(`Failed to mark all notifications as read: ${error.message}`);
  }
}

export async function getUnreadCount(supabaseAdmin: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    throw new DatabaseError(`Failed to get unread count: ${error.message}`);
  }

  return count || 0;
}
