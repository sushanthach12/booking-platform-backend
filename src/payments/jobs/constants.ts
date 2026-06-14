/** Scheduler tick: keyset-scans due on-hold earnings and fans out release jobs. */
export const JOB_RELEASE_SWEEP = 'release-sweep';
/** Per-earning worker job: releases one on-hold earning to available. */
export const JOB_RELEASE_EARNING = 'release-earning';

/** Worker job: dispatches one payout to Cashfree. */
export const JOB_DISPATCH_PAYOUT = 'dispatch-payout';
