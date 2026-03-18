/**
 * User Module
 * Self-contained user profile domain module
 */

export { default as userRoutes } from './routes';
export type { UpdateProfileInput, UserRepository } from './service';
export {
  createUserRepository,
  getProfile,
  getPublicProfile,
  updateLastActive,
  updateProfile,
  updateProfileSchema,
} from './service';
