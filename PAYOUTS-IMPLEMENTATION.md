# Backend — Payouts & Earnings Ledger: Implementation Procedure

> Actionable build spec for the backend. Source of truth for decisions: [`../PAYOUTS-AND-GAPS-PLAN.md`](../PAYOUTS-AND-GAPS-PLAN.md).
> Lower-level Cashfree payout reference: [`src/payments/payout.md`](src/payments/payout.md) and [`src/payments/cashfree_payout_apis.md`](src/payments/cashfree_payout_apis.md).
> **No code in this doc** — it states *what* to implement, *where*, and *in what order*.

---

## Cross-cutting rules (apply to everything below)

1. **UTC everywhere.** All timestamps stored/compared/computed as UTC instants (`timestamptz`, `NOW()` = UTC). All grace math (`completedAt + 24h`) and all crons are UTC. Timezone is display-only (web layer).
2. **Idempotent consumers.** Every queue worker can run twice safely — guard with conditional updates (`WHERE status = ...`) and unique constraints. At-least-once delivery is assumed.
3. **Atomic money writes.** A state transition and its ledger effect go in ONE DB transaction — never one without the other.
4. **Money schedules live in Postgres, not Redis.** Delays are driven by date columns + periodic sweeps, never by long-lived BullMQ `delay` jobs.
5. **Repository pattern + Symbol DI tokens** (existing convention). Services throw NestJS HTTP exceptions; processors re-throw for BullMQ retry.
6. **Worker placement.** Workers run on our **dedicated VPS** as a long-running process — persistent BullMQ workers, repeatable (cron) jobs, and Redis all work natively. Schedulers are BullMQ repeatable jobs (existing pattern), not external HTTP crons. See plan §6.

---

## What already exists (do not rebuild)

- `PaymentTransactionEntity`, `PaymentService`, `CashfreeGateway` (PG/collection) — guest payments, refunds, webhooks. ✅
- `PayoutEntity` (`id, hostId, amount, status, scheduledDate, paidAt, bookingCount, accountLast4`). ⚠️ needs new columns.
- `PayoutAccountEntity` + `PayoutAccountService` + AES-256-GCM `payout-encryption.helper.ts`. ⚠️ no Cashfree beneficiary yet.
- `PayoutService` (read-only: history, summary, earnings, upcoming) + `payouts.controller.ts` GET endpoints. ✅ keep, extend.
- `BookingCompletionProcessor` (hourly, marks COMPLETED). ⚠️ needs `completedAt` + event emission.
- Booking events `BOOKING_CONFIRMED / CANCELLED / PAYMENT_FAILED`. ⚠️ no `BOOKING_COMPLETED`.

---

## Phase 1 — Revenue / commission model  *(BLOCKING — unblocks all amounts)*

**Decision required first** (product): host-side commission %, guest-side service fee %, or split; GST treatment on the fee. Until set, every `platformFee`/`net` is a placeholder.

Implement once decided:
- `src/bookings/services/booking-price-calculator.service.ts` — compute `platformFee` and `hostNet` (`grandTotal − platformFee`). Replace the hardcoded `totalDiscount = 0` if discounts are in scope.
- `src/bookings/entities/booking.entity.ts` — persist `platformFee` and `hostNet` (or derive `hostNet` at credit time). Add migration.
- Expose the split in booking summary line items (for guest + host transparency).

---

## Phase 2 — Earnings ledger + host balance  *(no money movement)*

### Entities (new)
- `src/payments/entities/wallet.entity.ts` — `{ id, hostId (unique), availableBalance, pendingBalance, reserveBalance, currency, version, updatedAt }`. Cached aggregate; ledger is source of truth. Optimistic `version` for safe concurrent mutation.
- `src/payments/entities/wallet-transaction.entity.ts` (ledger) — `{ id, hostId, walletId, type (CREDIT|DEBIT), category (BOOKING_EARNING | PLATFORM_FEE | PAYOUT | REFUND_CLAWBACK | ADJUSTMENT), amount, balanceAfter, bookingId?, payoutId?, status (ON_HOLD | RELEASED | …), releaseAt? (UTC), description, createdAt }`.
  - **Unique constraint on `bookingId`** for the `BOOKING_EARNING` row → idempotent credit.
  - **Index `(status, releaseAt)`** → release sweep query.

### Service + repositories (new)
- `BalanceService.creditBookingEarning(bookingId)` — idempotent (no-op if earning row for `bookingId` exists). In ONE txn: write `BOOKING_EARNING` credit + `PLATFORM_FEE` debit, add `hostNet` to `pendingBalance`, stamp earning row `status = ON_HOLD`, `releaseAt = completedAt + 24h`.
- `BalanceService.releaseEarning(balanceTxnId)` — idempotent (skip if not `ON_HOLD`). In ONE txn: flip `ON_HOLD → RELEASED`, move `hostNet` `pendingBalance → availableBalance`.
- `BalanceService.getBalance(hostId)` → `{ payableNow, onHold: { upcoming, clearing }, inTransit, lifetimePaidOut, availableBalance, reserveBalance }`.
  - `payableNow = max(0, availableBalance − reserveBalance)` gated by `MIN_PAYOUT_THRESHOLD`.
  - `onHold.clearing` = sum of `ON_HOLD` ledger nets. `onHold.upcoming` = projected `hostNet` of CONFIRMED-but-not-completed bookings (computed from bookings, not ledger).
- Repositories for both entities (Symbol-token injected, per convention).

### DI / module
- Tokens in `src/database/di/symbols.ts`: `WALLET_REPOSITORY`, `WALLET_TRANSACTION_REPOSITORY`, `BALANCE_SERVICE`.
- Register entities/repos/service in `src/payments/payment.module.ts`.

### Endpoint
- `GET /api/v1/payouts/balance` (JWT + HOST) in `payouts.controller.ts` → `BalanceService.getBalance`.

---

## Phase 3 — Completion → credit trigger (event-driven + scalable)

### Events
- `src/common/events/booking.events.ts` — add `BOOKING_COMPLETED` + payload `{ bookingId, hostId, hostNet, currency, completedAt }`.

### Completion processor (fix + scale)
- `src/bookings/booking-jobs/processors/booking-completion.processor.ts`:
  - Set `completedAt = NOW()` (currently never set) when marking COMPLETED.
  - Emit `BOOKING_COMPLETED` **per booking id** (the current single bulk `UPDATE` emits nothing).
  - **Scale to millions:** split into scheduler + workers (plan §6). Scheduler keyset-paginates `WHERE status = CONFIRMED AND checkOutDate <= NOW()` (sargable; add index below), enqueues batches; idempotent worker does conditional `UPDATE … WHERE id=? AND status=CONFIRMED` (skips if cancelled meanwhile), sets `completedAt`, emits event. Single-runner lock on the scheduler.
- Index: add composite `(status, checkOutDate)` on `bookings` (today only `status` is indexed).

### Credit listener
- `src/bookings/listeners/` (or payments) — `@OnEvent(BOOKING_COMPLETED)` → `BalanceService.creditBookingEarning(bookingId)`. Idempotent; decouples bookings from balances (matches existing email-listener pattern).

---

## Phase 4 — Earning release sweep (daily, DB-driven)

- New queue `QUEUE_BALANCE_RELEASE` in `src/queues/queues.module.ts`; job `JOB_RELEASE_EARNING`.
- **Scheduler cron: once daily at 01:00 UTC.** Keyset-paginate `WHERE status = ON_HOLD AND releaseAt <= NOW()` → enqueue due rows.
- Release worker → `BalanceService.releaseEarning(txnId)` (idempotent, transactional).
- Robustness: a failed nightly run loses nothing — next night re-selects all still-`ON_HOLD` rows (durable DB schedule).
- **Do NOT** use a BullMQ `delay: 24h` job (Redis-memory + loss-on-failure).

---

## Phase 5 — Host beneficiary registration (Cashfree)

> Detailed contract in `src/payments/payout.md` §Step 1.

- Extend payout account entity (per payout.md `host-payout-account`): add `cashfreeBeneficiaryId`, `beneficiaryStatus (VERIFIED|INITIATED|INVALID|FAILED)`, `accountType (bank|upi)`, `upiId?`.
- On `POST /api/v1/payouts/accounts`: encrypt (existing helper) → call Cashfree `POST /payout/beneficiary` → store `beneficiary_id` only if `VERIFIED`. Handle `INITIATED` (poll), `INVALID/FAILED` (422), `beneficiary_already_exists` (re-link).
- `CASHFREE_PAYOUT_*` env vars (separate creds; see payout.md §Auth). Add `getCashfreePayoutBaseUrl()` to `cashfree.helper.ts`.

---

## Phase 6 — Payout dispatch (host-initiated, real money movement)

- New gateway `src/payments/gateways/cashfree-payout.gateway.ts` wrapping Payouts v2 (`POST /payout/transfers`, idempotent `transfer_id = "PAYOUT_"+payoutId`; UPI validate-and-pay flow). Token `CASHFREE_PAYOUT_GATEWAY`.
- Extend `PayoutEntity` (per payout.md §Database Changes): `bookingId?`, `platformFee`, `hostPayoutAccountId`, `cashfreeTransferId`, `cashfreeStatus`, `failureReason`, `processedAt`, `transferUtr`; add `'processing'` to `PayoutStatus`.
- **Endpoint** `POST /api/v1/payouts/request` (JWT + HOST): in ONE txn — validate `payableNow ≥ MIN_PAYOUT_THRESHOLD`, require a `VERIFIED` beneficiary, lock `wallets` row (prevent double-request), create `Payout`, write `PAYOUT` debit ledger entry, reduce `availableBalance`, enqueue dispatch.
- New queue `QUEUE_PAYOUT_DISPATCH` + `PayoutDispatchProcessor` → `PayoutService.dispatchPayout(payoutId)` (`pending → processing`). 5XX handling per payout.md §Error Handling.
- Config: `MIN_PAYOUT_THRESHOLD`, `PAYOUT_RESERVE_AMOUNT`.
- *(Optional)* auto-payout cron — same path, triggered when `payableNow` crosses threshold.

---

## Phase 7 — Payout webhook + reconciliation

> Contract in `src/payments/payout.md` §Step 3.

- `POST /api/v1/payments/webhook/cashfree-payout` (public) with **HMAC-SHA256 signature verification** (return 200 fast, then process).
- Map `TRANSFER_SUCCESS → paid` (set `paidAt`, `transferUtr`); `TRANSFER_FAILED|REVERSED|REJECTED → failed` (store `failureReason`, **reverse the `PAYOUT` debit** → restore `availableBalance`).
- Events `PAYOUT_PAID` / `PAYOUT_FAILED` (`src/common/events/payment.events.ts`); host email listeners.

---

## Phase 8 — Chargeback / dispute clawback (consistency)

> **Not** the cancellation path. Guest cancellation is blocked once a booking is `COMPLETED` (`booking.service.ts` rejects cancelling a completed booking), so an earning can never be clawed back via cancellation — by the time an earning exists, the booking is past the cancellable window. This phase covers only **post-completion chargebacks/disputes** arriving through the payment webhook or an admin-initiated refund.

- When a completed booking's payment is charged back / disputed / admin-refunded **after** its earning was credited: write a `REFUND_CLAWBACK` debit equal to the **host's share of the actually-refunded amount** (not necessarily the full earning). **Reserve absorbs it first**; only if reserve + available can't cover does balance go negative and net against future earnings.
- Wire into the chargeback/refund path in `PaymentService` (payment webhook + admin refund), **not** into `cancelBooking`.

---

## Phase 9 — Cancellation policy & refund (guest cancellation → host fee)

> Hosts already pick a policy (`FLEXIBLE | MODERATE | STRICT`, `property-policy.entity.ts`), snapshotted onto the booking (`booking-snapshot.entity.ts`). Today it is **cosmetic** — `cancelBooking` always issues a full refund (`paymentService.terminatePayment`, no amount). This phase makes the policy drive the refund and routes the retained cancellation fee to the host. **Depends on Phase 1 (commission %) + Phase 2 (ledger/balance).**

### Cancellation always occurs pre-completion
A `COMPLETED` booking cannot be cancelled (guarded in `booking.service.ts`). So the earning is **never yet credited** when a cancellation runs — cancellation is therefore the **credit path** for the retained fee, not a clawback (clawback = Phase 8, chargebacks only).

### Policy resolver (new)
- `src/bookings/services/cancellation-policy.service.ts` — pure function `resolve(policy, checkInDate, now) → { refundPercent }`. Windows are fixed per policy (code lookup table; **no new property columns**):

  | Policy | Window before check-in | Refund % (of accommodation) |
  | --- | --- | --- |
  | FLEXIBLE | ≥ 24h | 100% · else 0% |
  | MODERATE | ≥ 5 days | 100% · `< 5d` → 50% · after check-in → 0% |
  | STRICT | ≥ 7 days | 50% · else 0% |

- **Refund base = accommodation** (`hostNet + platformFee`). Guest-side service fee is **non-refundable** unless `refundPercent == 100`.
- Read the **snapshot** policy, never the live property (so a host editing their policy can't change refunds on existing bookings).

### `cancelBooking` changes (`src/bookings/services/booking.service.ts`)
For a `CONFIRMED` + paid booking (the existing `_needsRefund` branch):
1. `refundPercent = CancellationPolicyService.resolve(snapshot.cancellationPolicy, checkInDate, now)`.
2. `guestRefund = round(refundBase * refundPercent)` (+ full service fee only if 100%); `retainedAmount = grandTotal − guestRefund`.
3. Refund the **computed amount**: `paymentService.refundPayment(txnId, guestRefund)` (replace the amount-less `terminatePayment`). Skip the gateway call if `guestRefund == 0`.
4. If `retainedAmount > 0`: in ONE txn, `BalanceService.creditCancellationFee(bookingId, retainedAmount)` — splits commission off `retainedAmount`, writes a `BOOKING_EARNING` credit (host share) + `PLATFORM_FEE` debit, adds host share to `pendingBalance`, `status = ON_HOLD`, `releaseAt = cancelledAt + 24h`. **Idempotent via the existing unique `bookingId` on the earning row** — a booking gets exactly one earning whether through completion (Phase 3) or cancellation.
5. Persist `refundAmount`, `cancellationFee`, `refundPercentage` on the booking (audit).
- `PENDING` / unpaid bookings: unchanged — mark `CANCELLED`, no refund, no ledger.

### Service / gateway
- `BalanceService.creditCancellationFee(bookingId, retainedAmount)` (new) — mirrors `creditBookingEarning` but the gross is `retainedAmount` instead of full `hostNet`.
- Confirm `refundPayment(orderId, amount)` supports partial amounts (`cashfree.gateway.ts`); `terminatePayment` becomes the no-policy full-refund convenience only.

### Migration
- `bookings`: add `refundAmount`, `cancellationFee`, `refundPercentage` (see checklist).

---

## Migrations checklist (`src/database/migrations/`)

- [ ] `bookings`: `platformFee`, `hostNet`, `refundAmount`, `cancellationFee`, `refundPercentage`; ensure `completedAt` used; index `(status, checkOutDate)`.
- [ ] `wallets` (new) + unique `hostId`.
- [ ] `wallet_transactions` (new) + unique `bookingId` (earning) + index `(status, releaseAt)`.
- [ ] `payouts`: 8 new columns + `'processing'` status; `currency` default `INR`.
- [ ] `payout_accounts`: `cashfreeBeneficiaryId`, `beneficiaryStatus`, `accountType`, `upiId`.

---

## Build order & verification

1. Phase 1 (fees) → 2 (ledger + balance endpoint) → 3 (completion event) → 4 (daily release). *Hosts now see earnings flow; zero money-movement risk.*
2. Phase 5 (beneficiary) → 6 (request + dispatch) → 7 (webhook) → 8 (chargeback clawback). *Real transfers.*
3. Phase 9 (cancellation refund + host fee) — independent of the dispatch chain; needs only Phase 1 + 2. Can land alongside Phase 4.
4. After each phase: `pnpm run lint && pnpm run build`; unit tests `--testPathPattern=payout|balance|booking|cancel`.
5. E2E money path: set a booking `checkOutDate` to the past → completion → ledger ON_HOLD with `releaseAt` → daily sweep → AVAILABLE → `POST /payouts/request` → Cashfree sandbox transfer → mock `TRANSFER_SUCCESS` webhook → `paid` + balance reconciled.
6. E2E cancellation path: CONFIRMED+paid booking, vary check-in distance per policy → cancel → assert `guestRefund` % correct, partial `BOOKING_EARNING` ON_HOLD for `retainedAmount − commission`, and one earning row per booking.

---

## Web coordination

Most of the Payout UI already exists. New backend endpoints the web consumes: `GET /payouts/balance`, `POST /payouts/request`, and `beneficiaryStatus` on accounts. See [`../web/PAYOUTS-IMPLEMENTATION.md`](../web/PAYOUTS-IMPLEMENTATION.md).
