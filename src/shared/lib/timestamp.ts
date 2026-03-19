/**
 * Get current timestamp in ISO format.
 */
export const now = (): string => new Date().toISOString();

/**
 * Get timestamp in the future.
 */
export const future = (ms: number): string => new Date(Date.now() + ms).toISOString();

/**
 * Get timestamp in the past.
 */
export const past = (ms: number): string => new Date(Date.now() - ms).toISOString();

/**
 * Timestamp utilities for consistent date handling.
 */
export const timestamp = {
  now,
  future,
  past,
  /** Add days to current time */
  addDays: (days: number): string => future(days * 24 * 60 * 60 * 1000),
  /** Add hours to current time */
  addHours: (hours: number): string => future(hours * 60 * 60 * 1000),
  /** Subtract days from current time */
  subtractDays: (days: number): string => past(days * 24 * 60 * 60 * 1000),
} as const;