/**
 * Media Module
 * Self-contained media upload domain module
 */

export { default as mediaRoutes } from './routes';
export { confirmUpload, createUploadUrl, deleteMedia } from './service';
