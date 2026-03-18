/**
 * Thread Module
 * Self-contained messaging thread domain module
 */

export { default as threadRoutes } from './routes';
export type { CreateThreadInput, MessageRepository } from './service';
export {
  createMessageRepository,
  createThread,
  getMessages,
  getThread,
  getUserThreads,
  markMessagesAsRead,
  sendMessage,
} from './service';
