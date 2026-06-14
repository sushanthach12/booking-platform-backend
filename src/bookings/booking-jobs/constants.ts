export const JOB_EXPIRE_UNPAID_BOOKING = 'expire-unpaid-booking';
export const JOB_SYNC_PAYMENT_STATUS = 'sync-payment-status';
export const JOB_CREATE_BOOKING_DETAILS = 'create-booking-details';

/** Scheduler tick: keyset-scans due bookings and fans out per-booking jobs. */
export const JOB_COMPLETE_PAST_BOOKINGS = 'complete-past-bookings';
/** Per-booking worker job: marks one booking COMPLETED + emits the event. */
export const JOB_COMPLETE_BOOKING = 'complete-booking';

/** Default delay before expiring unpaid booking (15 minutes). */
export const PAYMENT_TIMEOUT_MS = 15 * 60 * 1000;
