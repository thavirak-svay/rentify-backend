/**
 * Booking Module
 * Self-contained booking domain module
 */

export { default as bookingRoutes } from './routes';
export {
  activateBooking,
  approveBooking,
  type CreateBookingInput,
  cancelBooking,
  completeBooking,
  createBooking,
  declineBooking,
  getBooking,
  getUserBookings,
} from './service';
export { type BookingStatus, canTransition, validateTransition } from './state-machine';
