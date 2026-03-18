/**
 * Review Module
 * Self-contained review domain module
 */

export { default as reviewRoutes } from './routes';
export type { CreateReviewInput, ReviewRepository } from './service';
export { createReview, createReviewRepository, getListingReviews, getUserReviews } from './service';
