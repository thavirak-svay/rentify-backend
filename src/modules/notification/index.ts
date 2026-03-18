/**
 * Notification Module
 * Self-contained notification domain module
 */

export { default as notificationRoutes } from './routes';
export { getUnreadCount, getUserNotifications, markAllAsRead, markAsRead } from './service';
