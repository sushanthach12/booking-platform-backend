# Payout Implementation Plan

> Reference: `src/payments/cashfree_payout_apis.md`  
> Cashfree Payout API version: `2024-01-01`  
> Base URL (prod): `https://api.cashfree.com/payout`  
> Base URL (sandbox): `https://sandbox.cashfree.com/payout`

---

## How the Full Payout Flow Works (Our System → Cashfree)

```
Guest pays grandTotal (Cashfree PG)
        │
        ▼
Booking status = CONFIRMED (payment succeeded)
        │
        ▼
BookingCompletionProcessor runs hourly
→ checkout date passed → status = COMPLETED
→ PayoutService.createPendingPayout(bookingId)
        │
        ├─ No host payout account yet?
        │     → Insert payout row (status=pending), stop here.
        │       When host saves account later → flush pending payouts
        │
        └─ Host account exists (cashfreeBeneficiaryId set)?
              → Insert payout row (status=pending)
              → Enqueue JOB_DISPATCH_PAYOUT with delay:
                  delay = max(0, checkInDate + 24h - now)
                        │
                        ▼
              PayoutDispatchProcessor fires after delay
              → PayoutService.dispatchPayout(payoutId)
              → POST /payout/transfers  (Cashfree)
              → Response: status=RECEIVED, cf_transfer_id stored
              → Payout row: status=processing, cashfreeTransferId set
                        │
                        ▼
              Cashfree sends webhook to:
              POST /api/v1/payments/webhook/cashfree-payout
                        │
              ┌─────────┴──────────┐
        TRANSFER_SUCCESS     TRANSFER_FAILED / REVERSED / REJECTED
        TRANSFER_ACKNOWLEDGED       │
              │                     └─ status=failed, failureReason stored
              └─ status=paid, paidAt set     notify host by email
                 notify host by email
```

---

## Cashfree Auth (No Token Exchange — Direct Headers)

Payouts V2 uses **static header auth** (no JWT token flow). Every request sends:

```
x-client-id:     CASHFREE_PAYOUT_CLIENT_ID
x-client-secret: CASHFREE_PAYOUT_CLIENT_SECRET
x-api-version:   2024-01-01
Content-Type:    application/json
```

New env vars to add:
```
CASHFREE_PAYOUT_CLIENT_ID       # separate from PG client ID
CASHFREE_PAYOUT_CLIENT_SECRET   # separate from PG secret
CASHFREE_PAYOUT_ENV             # 'sandbox' | 'production'
```

---

## Step 1 — Host Saves Payout Account (Beneficiary Registration)

**Our endpoint:** `POST /api/v1/payouts/account`

When a host saves their bank/UPI details, we:
1. Encrypt sensitive fields (AES-256-GCM) and store in `host_payout_accounts`
2. Call Cashfree `POST /payout/beneficiary`
3. Store the returned `beneficiary_id` in the record

### Cashfree Request

```
POST https://api.cashfree.com/payout/beneficiary
```

```json
{
  "beneficiary_id": "HOST_{hostId}",
  "beneficiary_name": "John Doe",
  "beneficiary_instrument_details": {
    "bank_account_number": "1223334444",
    "bank_ifsc": "HDFC0000001"
  },
  "beneficiary_contact_details": {
    "beneficiary_email": "host@example.com",
    "beneficiary_phone": "9876543210",
    "beneficiary_country_code": "+91"
  }
}
```

For UPI only — pass `vpa` inside `beneficiary_instrument_details`, omit bank fields.

### Cashfree Response (201)

```json
{
  "beneficiary_id": "HOST_abc123",
  "beneficiary_status": "VERIFIED"
}
```

Possible statuses: `VERIFIED` | `INITIATED` | `INVALID` | `FAILED`

**Only store and proceed if `beneficiary_status = VERIFIED`.**  
If `INITIATED`, poll `GET /payout/beneficiary/{id}` until terminal status.  
If `INVALID` / `FAILED`, return 422 to host with descriptive error.

**Error to handle:**
- `409 beneficiary_id_already_exists` → fetch existing beneficiary, re-link our record
- `409 beneficiary_already_exists` → same bank account already registered, re-use that beneficiary_id

After successful save: query all `status=pending` payouts for this host with no `cashfreeTransferId` → enqueue `JOB_DISPATCH_PAYOUT` for each (flush previously skipped payouts).

---

## Step 2 — Payout Dispatch (Transfer Initiation)

**Triggered by:** `PayoutDispatchProcessor` consuming `QUEUE_PAYOUT_DISPATCH`

### Cashfree Request

```
POST https://api.cashfree.com/payout/transfers
```

```json
{
  "transfer_id": "PAYOUT_{payoutId}",
  "transfer_amount": 4500.00,
  "transfer_mode": "imps",
  "transfer_remarks": "Booking payout",
  "beneficiary_details": {
    "beneficiary_id": "HOST_abc123"
  }
}
```

`transfer_id` = `"PAYOUT_" + payout.id` — idempotent, Cashfree deduplicates on this.  
`transfer_mode` = `"imps"` default for bank; `"upi"` for UPI accounts.

### Cashfree Response (200)

```json
{
  "transfer_id": "PAYOUT_uuid",
  "cf_transfer_id": "987654",
  "status": "RECEIVED"
}
```

On `RECEIVED`: update payout row → `status=processing`, `cashfreeTransferId=cf_transfer_id`, `processedAt=now`.

**On 5XX response:** do NOT re-initiate. First call `GET /payout/transfers/{transfer_id}` to check if it was already accepted. Re-throw error only if confirmed not created (BullMQ will retry the job).

### UPI-specific flow (Verify and Pay)

If `host_payout_accounts.accountType = 'upi'`:
1. First call `POST /payout/validate` with `{ "vpa": "<upiId>" }` → get `transfer_token`
2. Then call `POST /payout/transfers` with `transfer_token` field added to the body above

---

## Step 3 — Webhook Handler (Status Updates)

**Our endpoint:** `POST /api/v1/payments/webhook/cashfree-payout`

### Signature Verification (must verify before processing)

```typescript
import crypto from 'crypto';

function verifyPayoutWebhookSignature(
  signature: string,
  rawBody: string,
  timestamp: string,
  clientSecret: string,
): boolean {
  const signatureString = timestamp + rawBody;
  const generated = crypto
    .createHmac('sha256', clientSecret)
    .update(signatureString)
    .digest('base64');
  return generated === signature;
}
```

Headers to read:
- `x-webhook-signature` — HMAC-SHA256 in Base64
- `x-webhook-timestamp` — Unix timestamp

Return HTTP `200` immediately (before processing) to avoid Cashfree retries.

### Webhook Event Mapping

| Cashfree `type` | Our payout `status` | Notes |
|----------------|---------------------|-------|
| `TRANSFER_ACKNOWLEDGED` | `processing` | Debited from our account, in transit |
| `TRANSFER_SUCCESS` | `paid` | Set `paidAt = event_time` |
| `TRANSFER_FAILED` | `failed` | Store `status_code` in `failureReason` |
| `TRANSFER_REVERSED` | `failed` | Beneficiary bank returned funds, store reason |
| `TRANSFER_REJECTED` | `failed` | Rejected before bank submission, store reason |

Webhook payload shape:

```json
{
  "data": {
    "transfer_id": "PAYOUT_uuid",
    "cf_transfer_id": "987654",
    "status": "SUCCESS",
    "status_code": "COMPLETED",
    "status_description": "...",
    "transfer_amount": 4500.0,
    "transfer_utr": "HDFC202401150010001"
  },
  "event_time": "2024-01-15T10:30:47",
  "type": "TRANSFER_SUCCESS"
}
```

Extract `transfer_id` → strip `"PAYOUT_"` prefix → find `PayoutEntity` by `id` → update status.

---

## Database Changes

### New Table: `host_payout_accounts`

**File:** `src/payments/entities/host-payout-account.entity.ts`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `hostId` | uuid, unique | One active account per host |
| `accountType` | varchar(10) | `'bank'` or `'upi'` |
| `accountHolderName` | varchar(500) | AES-256-GCM encrypted |
| `accountNumber` | varchar(500), nullable | Encrypted, bank only |
| `ifscCode` | varchar(500), nullable | Encrypted, bank only |
| `upiId` | varchar(500), nullable | Encrypted, UPI only |
| `cashfreeBeneficiaryId` | varchar(255), nullable | Set after successful Cashfree registration |
| `beneficiaryStatus` | varchar(20) | `VERIFIED` / `INITIATED` / `INVALID` / `FAILED` |
| `isActive` | boolean | Default true |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

Encryption: `PAYOUT_ENCRYPTION_KEY` env var (32-byte hex). Helper at `src/payments/helpers/payout-encryption.helper.ts` using Node `crypto` AES-256-GCM.

**GET (masked):** return `accountNumber` as `****` + last 4 digits only. Never return `ifscCode` or `upiId` in full.

### Extend `payouts` Table

Add to `src/payments/entities/payout.entity.ts`:

| New Column | Type | Notes |
|------------|------|-------|
| `bookingId` | uuid | Unique — 1 payout per booking |
| `platformFee` | decimal(10,2) | Default 0, reserved for future commission |
| `hostPayoutAccountId` | uuid, nullable | Account used for this payout |
| `cashfreeTransferId` | varchar(255), nullable | `cf_transfer_id` from Cashfree response |
| `cashfreeStatus` | varchar(50), nullable | Raw `status_code` from Cashfree |
| `failureReason` | text, nullable | `status_code` + `status_description` on failure |
| `processedAt` | timestamp, nullable | When `POST /payout/transfers` was called |
| `transferUtr` | varchar(255), nullable | Bank UTR on success |

Extend `PayoutStatus` type: add `'processing'` alongside existing `'pending' | 'paid' | 'failed'`.

Change `currency` default from `'USD'` → `'INR'`.

---

## Payout Amount

```
payout.amount    = booking.grandTotal   (no deduction — platform fee out of scope)
payout.platformFee = 0                  (column reserved for future use)
```

---

## New Queue

Add to `src/queues/queues.module.ts`:
```typescript
export const QUEUE_PAYOUT_DISPATCH = 'payout-dispatch';
```

**New processor:** `src/bookings/booking-jobs/processors/payout-dispatch.processor.ts`
- `@Processor(QUEUE_PAYOUT_DISPATCH, { concurrency: 1 })`
- Job payload: `{ payoutId: string }`
- Job name constant: `JOB_DISPATCH_PAYOUT = 'dispatch-payout'` (add to `booking-jobs/constants.ts`)
- On process: call `PayoutService.dispatchPayout(payoutId)` → re-throw on error for BullMQ retry

---

## PayoutService — New Methods

`src/payments/services/payout.service.ts`:

```typescript
// Called by BookingCompletionProcessor after each booking is marked COMPLETED
createPendingPayout(bookingId: string): Promise<void>

// Called by PayoutDispatchProcessor — initiates Cashfree transfer
dispatchPayout(payoutId: string): Promise<void>

// Called by payout webhook controller
handlePayoutWebhook(rawBody: string, signature: string, timestamp: string): Promise<void>

// Called by POST /api/v1/payouts/account
savePayoutAccount(hostId: string, dto: SavePayoutAccountDto): Promise<MaskedPayoutAccount>

// Called by GET /api/v1/payouts/account
getPayoutAccount(hostId: string): Promise<MaskedPayoutAccount | null>
```

---

## API Endpoints

### New controller: `src/payments/controllers/host-payout-account.controller.ts`

| Method | Route | Guard | Description |
|--------|-------|-------|-------------|
| `POST` | `/api/v1/payouts/account` | JWT + HOST role | Save/update bank or UPI account |
| `GET` | `/api/v1/payouts/account` | JWT + HOST role | Get masked account details |

### Existing: `src/payments/controllers/payouts.controller.ts`

| Method | Route | Guard | Description |
|--------|-------|-------|-------------|
| `GET` | `/api/v1/payouts` | JWT + HOST | Payout history (paginated) |
| `GET` | `/api/v1/payouts/upcoming` | JWT + HOST | Next scheduled payout |

### New webhook in `src/payments/controllers/payment.controller.ts`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/v1/payments/webhook/cashfree-payout` | none | Cashfree payout status events |

---

## DTO

`src/payments/dto/save-payout-account.dto.ts`:

```typescript
class SavePayoutAccountDto {
  @IsIn(['bank', 'upi'])
  accountType: 'bank' | 'upi';

  @IsString() @MinLength(2) @MaxLength(100)
  accountHolderName: string;

  @IsOptional() @IsString()
  accountNumber?: string;       // required when accountType === 'bank'

  @IsOptional() @IsString()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
  ifscCode?: string;            // required when accountType === 'bank'

  @IsOptional() @IsString()
  upiId?: string;               // required when accountType === 'upi'
}
```

Cross-field validation: if `accountType === 'bank'`, both `accountNumber` and `ifscCode` are required. If `'upi'`, `upiId` required.

---

## Events

Add to `src/common/events/payment.events.ts`:

```typescript
PAYOUT_PAID   = 'payout.paid'    // TRANSFER_SUCCESS webhook received
PAYOUT_FAILED = 'payout.failed'  // TRANSFER_FAILED / REVERSED / REJECTED
```

Add `@OnEvent` listeners in `src/bookings/listeners/booking-email.listener.ts` to email host on both events.

---

## DI Tokens (`src/database/di/symbols.ts`)

```typescript
export const HOST_PAYOUT_ACCOUNT_REPOSITORY = Symbol('IHostPayoutAccountRepository');
```

The payout gateway is no longer bound to a DI token. `PayoutGatewayFactory`
(`src/payments/factories/payout-gateway.factory.ts`) instantiates the concrete
provider (`IPayoutGateway`) at runtime, mirroring `PaymentGatewayFactory`.

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `src/payments/entities/host-payout-account.entity.ts` | **Create** |
| `src/payments/entities/payout.entity.ts` | Add 7 new columns, extend status type |
| `src/payments/interfaces/payout.interface.ts` | Add `IHostPayoutAccount`, 5 new method sigs |
| `src/payments/services/payout.service.ts` | Add 5 new methods |
| `src/payments/repositories/payout.repository.ts` | Add `create`, `findById`, `update` |
| `src/payments/repositories/host-payout-account.repository.ts` | **Create** |
| `src/payments/gateways/cashfree-payout.gateway.ts` | **Create** — wraps Cashfree Payouts v2 |
| `src/payments/helpers/payout-encryption.helper.ts` | **Create** — AES-256-GCM encrypt/decrypt |
| `src/payments/helpers/cashfree.helper.ts` | Add `getCashfreePayoutBaseUrl()` |
| `src/payments/controllers/host-payout-account.controller.ts` | **Create** |
| `src/payments/controllers/payment.controller.ts` | Add payout webhook route |
| `src/payments/dto/save-payout-account.dto.ts` | **Create** |
| `src/payments/payment.module.ts` | Register new entity, repo, gateway, controller |
| `src/queues/queues.module.ts` | Add `QUEUE_PAYOUT_DISPATCH` |
| `src/bookings/booking-jobs/constants.ts` | Add `JOB_DISPATCH_PAYOUT` |
| `src/bookings/booking-jobs/processors/payout-dispatch.processor.ts` | **Create** |
| `src/bookings/booking-jobs/processors/booking-completion.processor.ts` | Call `createPendingPayout` after bulk complete |
| `src/bookings/booking-jobs/booking-jobs.module.ts` | Register processor + inject payout queue |
| `src/bookings/listeners/booking-email.listener.ts` | Add `PAYOUT_PAID` / `PAYOUT_FAILED` listeners |
| `src/database/di/symbols.ts` | Add 2 new tokens |
| `src/common/events/payment.events.ts` | Add `PAYOUT_PAID`, `PAYOUT_FAILED` |
| `backend/.claude/references/env.md` | Document 4 new env vars |

---

## Error Handling Rules (from Cashfree docs)

1. **5XX on `POST /payout/transfers`**: call `GET /payout/transfers/{transfer_id}` first — do not create a new transfer blindly. Re-throw only if confirmed absent.
2. **`transfer_id` is idempotent**: `"PAYOUT_" + payout.id` — safe to retry the same job.
3. **`APPROVAL_PENDING`**: log a warning, do not mark as failed. Requires manual approval on Cashfree dashboard. Alert via email.
4. **`INVALID_BENE_*` on transfer**: mark payout `failed`, notify host to re-verify their account. Do not auto-retry.
5. **`NPCI_UNAVAILABLE` / `DEST_LIMIT_REACHED`**: re-enqueue with a delay (BullMQ exponential backoff covers this).
6. **`beneficiary_id_already_exists` on beneficiary create**: fetch existing and re-link — not a fatal error.

---

## Verification Steps

1. `pnpm run lint && pnpm run build` — zero errors
2. Host `POST /api/v1/payouts/account` → DB row encrypted, Cashfree sandbox returns `VERIFIED`
3. Manually set a booking's `checkOutDate` to yesterday → trigger completion sweep → verify `payouts` row with `status=pending`
4. Trigger dispatch job manually (or wait) → verify Cashfree transfer initiated, `cashfreeTransferId` set, `status=processing`
5. Send mock `TRANSFER_SUCCESS` webhook → verify `status=paid`, `paidAt` set, host email queued
6. Send mock `TRANSFER_FAILED` webhook → verify `status=failed`, `failureReason` populated
7. `pnpm run test -- --testPathPattern=payout`
